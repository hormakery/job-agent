from pathlib import Path
from unittest.mock import patch
from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing, MatchEvaluation


def test_agent2_skips_tailoring_when_below_50_percent(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)

    weak_job = ExtractedJobListing(
        company_name="KernelCorp",
        role_title="Embedded Rust & C++ Firmware Engineer",
        location="On-site",
        is_remote=False,
        job_url="https://example.com/kernel",
        raw_description="Requires 8+ years of bare-metal C++, Rust, and SwiftUI kernel drivers.",
    )

    low_eval = MatchEvaluation(
        match_score=32,
        missing_critical_skills=["Rust", "C++", "SwiftUI"],
        matched_skills=[],
        passed_threshold=False,
        reasoning="Missing required systems languages: Rust, C++, SwiftUI.",
    )

    with (
        patch.object(agent2.ats, "evaluate", return_value=low_eval),
        patch.object(agent2, "tailor_resume_markdown") as mock_tailor,
    ):
        row = agent2.process_job(weak_job)
        # Gemini 2.5 Pro tailor function MUST NOT be called when score < 50%
        mock_tailor.assert_not_called()
        assert row.passed_gate is False
        assert row.status == "Skipped (<50% Match)"
        assert row.tailored_resume_link == ""


def test_agent2_tailors_and_renders_pdf_when_at_or_above_50_percent(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)

    strong_job = ExtractedJobListing(
        company_name="CloudScale",
        role_title="Senior Full-Stack Python & Next.js Engineer",
        location="Remote",
        is_remote=True,
        job_url="https://example.com/cloudscale",
        raw_description="Requires Python, FastAPI, TypeScript, React, Next.js, Docker, and AWS.",
    )

    high_eval = MatchEvaluation(
        match_score=84,
        missing_critical_skills=[],
        matched_skills=["Python", "FastAPI", "TypeScript", "React", "Next.js"],
        passed_threshold=True,
        reasoning="Strong alignment across Python, FastAPI, and Next.js.",
    )

    with patch.object(agent2.ats, "evaluate", return_value=high_eval):
        row = agent2.process_job(strong_job)
        assert row.passed_gate is True
        assert row.status == "Tailored & Ready"
        assert row.tailored_resume_link != ""
        assert row.tailored_markdown != ""
        assert Path(row.local_pdf_path).exists()

