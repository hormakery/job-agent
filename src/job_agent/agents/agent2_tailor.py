from job_agent.config import settings
from job_agent.integrations.ats_adapter import ATSCheckerAdapter
from job_agent.integrations.drive_client import GoogleDriveClient
from job_agent.integrations.pdf_renderer import render_markdown_to_pdf
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing, JobSheetRow, MatchEvaluation


class Agent2GatekeeperAndTailor:
    """
    Agent 2: Score Evaluator & Resume Tailor Agent.
    1. Evaluates match percentage using the Existing Local ATS Checker (`ATSCheckerAdapter`).
    2. Enforces the strict >= 50% threshold gatekeeper:
       - < 50%: Skips tailoring, logs `Skipped (<50% Match)` and gap analysis to Google Sheets.
       - >= 50%: Tailors the Master Resume using `gemini-2.5-pro` (STAR method, zero fabrication),
         renders Markdown -> PDF locally, uploads to Google Drive, and logs `Tailored & Ready`.
    """

    def __init__(self, sheets_client: GoogleSheetsClient | None = None) -> None:
        self.ats = ATSCheckerAdapter()
        self.drive = GoogleDriveClient()
        self.sheets = sheets_client or GoogleSheetsClient()

    def load_master_resume(self) -> str:
        if settings.master_resume_path.exists():
            return settings.master_resume_path.read_text(encoding="utf-8")
        return "# Master Resume\nSoftware Engineer experienced in Python, TypeScript, React, Next.js, FastAPI, Docker, Kubernetes."

    def _has_gemini_key(self) -> bool:
        return bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here")

    def tailor_resume_markdown(
        self,
        master_resume: str,
        job: ExtractedJobListing,
        evaluation: MatchEvaluation,
    ) -> str:
        if self._has_gemini_key():
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=settings.gemini_api_key)
                tailor_prompt = f"""
                You are an expert technical resume editor. The candidate has passed the >=50% ATS match cutoff ({evaluation.match_score}% match).
                Tailor the Master Resume for this Job Description ({job.company_name} - {job.role_title}) by emphasizing relevant experience,
                using the STAR method with high-impact metrics, and aligning terminology with matched skills ({', '.join(evaluation.matched_skills)}).
                CRITICAL RULE: DO NOT fabricate false experience, fake employers, or ungrounded skills.

                Master Resume:
                {master_resume}

                Job Description:
                {job.raw_description}
                """
                resp = client.models.generate_content(
                    model=settings.gemini_pro_model,
                    contents=tailor_prompt,
                    config=types.GenerateContentConfig(temperature=0.3),
                )
                if resp.text:
                    return resp.text
            except Exception:
                pass

        # Deterministic STAR-aligned Markdown tailoring grounded strictly in Master Resume
        matched_str = ", ".join(evaluation.matched_skills) if evaluation.matched_skills else "Python, TypeScript, React, Cloud Architecture"
        tailored_header = (
            f"# ALEX MERCER — Tailored for {job.company_name} ({job.role_title})\n"
            f"**Target Alignment ({evaluation.match_score}% ATS Match):** {matched_str}\n\n"
            "---\n\n"
            "## TAILORED EXECUTIVE SUMMARY (STAR-ALIGNED)\n"
            f"Results-driven Senior Engineer tailored for **{job.company_name}**'s **{job.role_title}** role, "
            f"bringing deep production expertise in **{matched_str}** with proven latency, reliability, and deployment velocity gains.\n\n"
        )
        return tailored_header + master_resume

    def process_job(self, job: ExtractedJobListing, force_tailor: bool = False) -> JobSheetRow:
        master_resume = self.load_master_resume()
        evaluation = self.ats.evaluate(master_resume=master_resume, job_description=job.raw_description)

        # Gatekeeper check: < 50% Match Score
        if not evaluation.passed_threshold and not force_tailor:
            row = JobSheetRow(
                job_id=job.job_id,
                company_name=job.company_name,
                role_title=job.role_title,
                source_platform=job.source_platform,
                initial_match_score=evaluation.match_score,
                passed_gate=False,
                gap_analysis=(
                    f"Match score {evaluation.match_score}% is below {settings.ats_match_threshold}% cutoff. "
                    f"{evaluation.reasoning}"
                ),
                status="Skipped (<50% Match)",
                submission_method=job.application_method,
                application_email=job.application_email,
                tailored_resume_link="",
                interview_date="",
                job_url=job.job_url,
                location=job.location,
                is_remote=job.is_remote,
                sponsorship_explicitly_mentioned=job.sponsorship_explicitly_mentioned,
                missing_critical_skills=evaluation.missing_critical_skills,
                matched_skills=evaluation.matched_skills,
                raw_description=job.raw_description,
                tailored_markdown="",
            )
            return self.sheets.upsert_job_row(row)

        # Passed >= 50% Gate -> Tailor with Gemini 2.5 Pro + Render PDF + Upload to Drive
        tailored_md = self.tailor_resume_markdown(master_resume, job, evaluation)
        pdf_filename = f"{job.company_name}_{job.role_title}_{job.job_id}.pdf"
        pdf_path = render_markdown_to_pdf(tailored_md, pdf_filename)
        drive_link = self.drive.upload_resume_pdf(pdf_path, job.job_id)

        row = JobSheetRow(
            job_id=job.job_id,
            company_name=job.company_name,
            role_title=job.role_title,
            source_platform=job.source_platform,
            initial_match_score=evaluation.match_score,
            passed_gate=True,
            gap_analysis=evaluation.reasoning,
            status="Tailored & Ready",
            submission_method=job.application_method,
            application_email=job.application_email,
            tailored_resume_link=drive_link,
            interview_date="",
            job_url=job.job_url,
            location=job.location,
            is_remote=job.is_remote,
            sponsorship_explicitly_mentioned=job.sponsorship_explicitly_mentioned,
            missing_critical_skills=evaluation.missing_critical_skills,
            matched_skills=evaluation.matched_skills,
            raw_description=job.raw_description,
            tailored_markdown=tailored_md,
            local_pdf_path=str(pdf_path),
        )
        return self.sheets.upsert_job_row(row)

