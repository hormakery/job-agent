from pathlib import Path
from job_agent.agents.agent4_calendar import Agent4CalendarCoordinator
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import EmailClassification, compute_job_id


def test_agent4_prepares_slots_and_confirms_only_on_approval(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent4 = Agent4CalendarCoordinator(sheets_client=sheets)

    vercel_id = compute_job_id("Vercel", "Senior Frontend & Next.js Engineer")
    invite_email = EmailClassification(
        thread_id="th_vercel_99",
        company_name="Vercel",
        role_title="Senior Frontend & Next.js Engineer",
        job_id=vercel_id,
        category="Interview Invite",
        summary="Vercel invited you to a 45-minute technical interview.",
        proposed_times_raw=["Tue 10am"],
        sender_email="careers@vercel.com",
        subject="Interview Invite at Vercel",
    )

    coord = agent4.prepare_interview_options(invite_email)
    assert coord.status == "pending_selection"
    assert len(coord.available_slots) == 3

    # Before user confirmation, job status in sheet is NOT Scheduled
    job_before = sheets.get_job_by_id(vercel_id)
    assert job_before is not None
    assert job_before.status != "Scheduled"

    # User approves Option B in Web UI / Telegram
    chosen_slot_id = coord.available_slots[1].slot_id
    confirmation = agent4.confirm_slot_and_send_reply(
        job_id=vercel_id,
        slot_id=chosen_slot_id,
        custom_draft_reply="Confirmed Option B! Looking forward to speaking.",
    )
    assert confirmation["calendar_event"]["booked"] is True
    assert confirmation["email_receipt"]["sent"] is True

    job_after = sheets.get_job_by_id(vercel_id)
    assert job_after is not None
    assert job_after.status == "Scheduled"
    assert job_after.interview_date != ""

