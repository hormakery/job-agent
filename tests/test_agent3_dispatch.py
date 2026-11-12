from pathlib import Path
from unittest.mock import MagicMock
from job_agent.agents.agent3_dispatch import Agent3Dispatch
from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import CandidateProfile, JobSheetRow


def _sample_job_row(
    job_id: str = "testjob001",
    submission_method: str = "email_submission",
    application_email: str = "careers@shopify.com",
    passed_gate: bool = True,
    status: str = "Tailored & Ready",
) -> JobSheetRow:
    return JobSheetRow(
        job_id=job_id,
        company_name="Shopify",
        role_title="Senior React Native Engineer",
        source_platform="LinkedIn",
        initial_match_score=85,
        passed_gate=passed_gate,
        gap_analysis="Strong match across React Native and TypeScript.",
        status=status,
        submission_method=submission_method,
        application_email=application_email,
        job_url="https://linkedin.com/jobs/view/12345",
        matched_skills=["React Native", "TypeScript", "Redux"],
        local_pdf_path="/tmp/Shopify_Senior_React_Native_Engineer.pdf",
    )


def test_generate_dispatch_item_email(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent3 = Agent3Dispatch(sheets_client=sheets)

    job = _sample_job_row()
    sheets.upsert_job_row(job)

    custom_profile = CandidateProfile(
        full_name="Alex Mercer",
        email="alex.mercer@gmail.com",
        phone="+1-555-0199",
        linkedin_url="https://linkedin.com/in/alexmercer-dev",
        portfolio_url="https://alexmercer.dev",
        github_url="https://github.com/alexmercer",
    )

    item = agent3.generate_dispatch_item(job, profile=custom_profile)

    assert item.job_id == job.job_id
    assert item.submission_method == "email_submission"
    assert item.recipient_email == "careers@shopify.com"
    assert "https://linkedin.com/in/alexmercer-dev" in item.cover_body
    assert "https://alexmercer.dev" in item.cover_body
    assert "https://github.com/alexmercer" in item.cover_body
    assert item.status == "Draft Prepared"

    # Status of the job should advance from Tailored & Ready -> Application Drafted
    saved_job = sheets.get_job_by_id(job.job_id)
    assert saved_job is not None
    assert saved_job.status == "Application Drafted"


def test_generate_dispatch_item_portal(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent3 = Agent3Dispatch(sheets_client=sheets)

    job = _sample_job_row(
        job_id="ashby002",
        submission_method="portal_submission",
        application_email="",
    )
    job.job_url = "https://jobs.ashbyhq.com/anthropic/eng"
    sheets.upsert_job_row(job)

    item = agent3.generate_dispatch_item(job)

    assert item.submission_method == "portal_submission"
    assert item.portal_url == "https://jobs.ashbyhq.com/anthropic/eng"
    assert item.status == "Portal Ready"
    assert len(item.screening_qa) >= 3
    assert any("interested" in q.lower() for q in item.screening_qa.keys())


def test_create_gmail_draft(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    mock_gmail = MagicMock(spec=GmailClient)
    mock_gmail.is_configured.return_value = False
    mock_gmail.create_draft.return_value = {
        "draft_id": "draft_mock_123",
        "status": "draft_created",
        "mode": "local_simulated_draft",
    }

    agent3 = Agent3Dispatch(sheets_client=sheets, gmail_client=mock_gmail)
    job = _sample_job_row()
    sheets.upsert_job_row(job)

    result = agent3.create_gmail_draft_for_job(job.job_id)
    assert result["draft_id"] == "draft_mock_123"
    mock_gmail.create_draft.assert_called_once()


def test_dispatch_email_application_transitions_to_applied(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    mock_gmail = MagicMock(spec=GmailClient)
    mock_gmail.send_email.return_value = {
        "sent": True,
        "mode": "local_simulated_outbox",
    }

    agent3 = Agent3Dispatch(sheets_client=sheets, gmail_client=mock_gmail)
    job = _sample_job_row()
    sheets.upsert_job_row(job)

    res = agent3.dispatch_email_application(job.job_id)

    assert res["status"] == "Applied"
    assert res["date_applied"] != ""

    updated_job = sheets.get_job_by_id(job.job_id)
    assert updated_job is not None
    assert updated_job.status == "Applied"
    assert updated_job.date_applied != ""

    saved_app = sheets.get_application_by_job_id(job.job_id)
    assert saved_app is not None
    assert saved_app.status == "Dispatched (Sent)"
    assert saved_app.dispatched_at == res["date_applied"]


def test_mark_portal_applied_transitions_to_applied(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent3 = Agent3Dispatch(sheets_client=sheets)

    job = _sample_job_row(job_id="portal003", submission_method="portal_submission")
    sheets.upsert_job_row(job)

    res = agent3.mark_portal_applied(job.job_id)

    assert res["status"] == "Applied"
    assert res["date_applied"] != ""

    updated_job = sheets.get_job_by_id(job.job_id)
    assert updated_job is not None
    assert updated_job.status == "Applied"
    assert updated_job.date_applied != ""
