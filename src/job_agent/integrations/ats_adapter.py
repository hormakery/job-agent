import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional
import httpx

from job_agent.config import settings
from job_agent.models.schemas import MatchEvaluation

# Canonical tech & domain skill vocabulary for local deterministic ATS evaluation
SKILL_TAXONOMY = [
    "Python", "TypeScript", "JavaScript", "React", "React Native", "Next.js",
    "FastAPI", "Node.js", "Go", "Golang", "Rust", "Swift", "SwiftUI", "Kotlin",
    "Java", "C#", "C++", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
    "GraphQL", "REST", "gRPC", "Docker", "Kubernetes", "Terraform", "AWS",
    "GCP", "Azure", "CI/CD", "GitHub Actions", "Jenkins", "Linux", "Tailwind CSS",
    "Redux", "Vue", "Angular", "Expo", "Flutter", "PyTorch", "TensorFlow",
    "LangChain", "LangGraph", "Gemini", "OpenAI", "Microservices", "Kafka",
]


class ATSCheckerAdapter:
    """
    Adapter bridging Agent 2 and the Frontend Studio to the user's existing local ATS checker.
    Supports:
      1. `http_local`: Calls the user's local ATS HTTP endpoint (e.g., http://127.0.0.1:8001/evaluate)
      2. `python_import`: Imports a function directly from `ATS_LOCAL_REPO_PATH`
      3. `cli_subprocess`: Invokes the local ATS CLI command and parses JSON stdout
      4. `local_heuristic`: Built-in local ATS keyword/role/domain scorer matching PRD weights
         (50% hard skills, 30% role alignment, 20% domain knowledge) when external local service is offline.
    """

    def __init__(self, threshold: Optional[int] = None) -> None:
        self.threshold = threshold if threshold is not None else settings.ats_match_threshold

    def evaluate(self, master_resume: str, job_description: str) -> MatchEvaluation:
        mode = settings.ats_integration_mode

        if mode == "http_local":
            try:
                return self._evaluate_via_http(master_resume, job_description)
            except Exception:
                # Fallback to local ATS scorer so pipeline doesn't crash if server isn't started yet
                return self._evaluate_local_ats(
                    master_resume, job_description, source_note="local_ats_engine (http_local fallback)"
                )

        if mode == "python_import":
            try:
                return self._evaluate_via_python_import(master_resume, job_description)
            except Exception:
                return self._evaluate_local_ats(
                    master_resume, job_description, source_note="local_ats_engine (python_import fallback)"
                )

        if mode == "cli_subprocess" and settings.ats_cli_command:
            try:
                return self._evaluate_via_cli(master_resume, job_description)
            except Exception:
                return self._evaluate_local_ats(
                    master_resume, job_description, source_note="local_ats_engine (cli fallback)"
                )

        return self._evaluate_local_ats(master_resume, job_description, source_note="local_ats_checker")

    def _evaluate_via_http(self, master_resume: str, job_description: str) -> MatchEvaluation:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                settings.ats_local_http_url,
                json={"resume": master_resume, "job_description": job_description},
            )
            resp.raise_for_status()
            data = resp.json()
        return self._normalize_payload(data, source="local_ats_http")

    def _evaluate_via_python_import(self, master_resume: str, job_description: str) -> MatchEvaluation:
        repo_path = Path(settings.ats_local_repo_path).expanduser().resolve()
        if not repo_path.exists():
            raise FileNotFoundError(f"ATS_LOCAL_REPO_PATH not found: {repo_path}")

        if str(repo_path) not in sys.path:
            sys.path.insert(0, str(repo_path))

        # Look for common entrypoints in the user's local ATS checker repo
        for candidate_file in ["checker.py", "ats_checker.py", "scorer.py", "main.py", "app.py"]:
            mod_file = repo_path / candidate_file
            if mod_file.exists():
                spec = importlib.util.spec_from_file_location("external_ats_checker", mod_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    for fn_name in ["evaluate_resume", "check_ats", "score_resume", "evaluate", "calculate_score"]:
                        if hasattr(module, fn_name):
                            result = getattr(module, fn_name)(master_resume, job_description)
                            if isinstance(result, dict):
                                return self._normalize_payload(result, source=f"python_import:{candidate_file}")

        raise RuntimeError(f"No standard ATS entrypoint found in {repo_path}")

    def _evaluate_via_cli(self, master_resume: str, job_description: str) -> MatchEvaluation:
        proc = subprocess.run(
            settings.ats_cli_command.split(),
            input=json.dumps({"resume": master_resume, "job_description": job_description}),
            text=True,
            capture_output=True,
            timeout=20,
            check=True,
        )
        data = json.loads(proc.stdout.strip())
        return self._normalize_payload(data, source="local_ats_cli")

    def _normalize_payload(self, data: dict, source: str) -> MatchEvaluation:
        score = int(round(float(data.get("match_score", data.get("score", 0)))))
        score = max(0, min(100, score))
        missing = data.get("missing_critical_skills", data.get("missing_skills", data.get("missing_keywords", [])))
        matched = data.get("matched_skills", data.get("matched_keywords", []))
        passed = score >= self.threshold
        reasoning = data.get("reasoning") or (
            f"ATS Score {score}% ({'Passed' if passed else 'Below'} {self.threshold}% gate). "
            + (f"Missing skills: {', '.join(missing[:5])}." if missing else "Strong alignment across core requirements.")
        )
        return MatchEvaluation(
            match_score=score,
            missing_critical_skills=list(missing),
            matched_skills=list(matched),
            passed_threshold=passed,
            reasoning=reasoning,
            ats_source=source,
        )

    def _evaluate_local_ats(
        self, master_resume: str, job_description: str, source_note: str = "local_ats_checker"
    ) -> MatchEvaluation:
        """
        Built-in local ATS scoring engine implementing the PRD formula:
        - Hard skills alignment (50% weight)
        - Role title & seniority alignment (30% weight)
        - Domain & impact keyword alignment (20% weight)
        """
        resume_lower = master_resume.lower()
        jd_lower = job_description.lower()

        required_skills: list[str] = []
        matched_skills: list[str] = []
        missing_skills: list[str] = []

        for skill in SKILL_TAXONOMY:
            pattern = r"\b" + re.escape(skill.lower()) + r"\b"
            if re.search(pattern, jd_lower):
                required_skills.append(skill)
                if re.search(pattern, resume_lower):
                    matched_skills.append(skill)
                else:
                    missing_skills.append(skill)

        # 1. Hard skills component (0 - 50 pts)
        if required_skills:
            hard_skill_ratio = len(matched_skills) / len(required_skills)
        else:
            hard_skill_ratio = 0.65
        hard_skill_points = hard_skill_ratio * 50.0

        # 2. Role alignment component (0 - 30 pts)
        role_keywords = ["software", "frontend", "mobile", "full-stack", "fullstack", "backend", "devops", "deployment", "engineer"]
        jd_roles = [rk for rk in role_keywords if rk in jd_lower]
        matched_roles = [rk for rk in jd_roles if rk in resume_lower]
        role_ratio = (len(matched_roles) / len(jd_roles)) if jd_roles else 0.7
        role_points = role_ratio * 30.0

        # 3. Domain & engineering practices component (0 - 20 pts)
        domain_terms = ["api", "cloud", "scalable", "ci/cd", "microservices", "testing", "production", "agile", "architecture", "performance"]
        jd_domain = [dt for dt in domain_terms if dt in jd_lower]
        matched_domain = [dt for dt in jd_domain if dt in resume_lower]
        domain_ratio = (len(matched_domain) / len(jd_domain)) if jd_domain else 0.7
        domain_points = domain_ratio * 20.0

        # Penalty if JD exclusively demands native iOS/Swift or Android/Kotlin or Systems C++/Rust not in resume
        strict_missing_penalties = {"Swift", "SwiftUI", "Kotlin", "Rust", "C++"} & set(missing_skills)
        penalty = len(strict_missing_penalties) * 12.0 if len(matched_skills) <= 2 else len(strict_missing_penalties) * 5.0

        total_score = int(round(max(8.0, min(98.0, hard_skill_points + role_points + domain_points - penalty))))
        passed = total_score >= self.threshold

        if missing_skills and matched_skills:
            reasoning = (
                f"Missing {', '.join(missing_skills[:4])} experience; "
                f"strong in {', '.join(matched_skills[:4])} ({total_score}% ATS match)."
            )
        elif missing_skills:
            reasoning = f"Missing required skills: {', '.join(missing_skills[:5])} ({total_score}% ATS match)."
        else:
            reasoning = f"Strong match across {', '.join(matched_skills[:5]) or 'core engineering requirements'} ({total_score}% ATS match)."

        return MatchEvaluation(
            match_score=total_score,
            missing_critical_skills=missing_skills,
            matched_skills=matched_skills,
            passed_threshold=passed,
            reasoning=reasoning,
            ats_source=source_note,
        )

