from pathlib import Path
from job_agent.agents.agent3_inbox import Agent3InboxMonitor, Agent4InboxMonitor
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import JobSheetRow, compute_job_id


def test_agent3_classifies_all_email_categories(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent3 = Agent3InboxMonitor(sheets_client=sheets)

    invite = agent3.classify_thread(
        {
            "thread_id": "t1",
            "company_name": "Stripe",
            "role_title": "Senior Mobile Engineer",
            "sender_email": "recruiting@stripe.com",
            "subject": "Invitation to schedule technical interview",
            "body": "We would love to schedule a 45-minute chat with our engineering manager.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert invite.category == "Interview Invite"

    rejection = agent3.classify_thread(
        {
            "thread_id": "t2",
            "company_name": "Stripe",
            "role_title": "Senior Mobile Engineer",
            "sender_email": "no-reply@stripe.com",
            "subject": "Update on your application",
            "body": "Unfortunately, we are not moving forward with your candidacy at this time.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert rejection.category == "Rejection"

    assessment = agent3.classify_thread(
        {
            "thread_id": "t3",
            "company_name": "Datadog",
            "role_title": "DevOps Engineer",
            "sender_email": "talent@datadoghq.com",
            "subject": "Complete your HackerRank Coding Assessment",
            "body": "Please complete this 60-minute HackerRank assessment within 5 days.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert assessment.category == "Assessment Request"

    app_received = agent3.classify_thread(
        {
            "thread_id": "t4",
            "company_name": "Vercel",
            "role_title": "Frontend Engineer",
            "sender_email": "careers@vercel.com",
            "subject": "Application Received",
            "body": "Thank you for applying to Vercel. Our engineering recruitment team has received your application.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert app_received.category == "Application Received"

    neutral = agent3.classify_thread(
        {
            "thread_id": "t5",
            "company_name": "Vercel",
            "role_title": "Frontend Engineer",
            "sender_email": "newsletter@vercel.com",
            "subject": "Next.js Conf 2026 Announcements",
            "body": "Join us next month for developer keynote presentations.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert neutral.category == "Neutral"


def test_inbox_extracts_scheduling_links(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent = Agent4InboxMonitor(sheets_client=sheets)

    thread = {
        "thread_id": "t_calendly_1",
        "company_name": "Shopify",
        "role_title": "Senior React Native Engineer",
        "sender_email": "recruiting@shopify.com",
        "subject": "Next Steps with Shopify",
        "body": "Hi Alex, please pick a slot on our Calendly here: https://calendly.com/shopify-mobile/chat to speak with our lead.",
        "received_at": "2026-11-01T10:00:00Z",
    }
    classification = agent.classify_thread(thread)
    assert classification.category == "Interview Invite"
    assert classification.scheduling_url == "https://calendly.com/shopify-mobile/chat"


def test_inbox_strictly_ignores_unapplied_jobs(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent = Agent4InboxMonitor(sheets_client=sheets)

    shopify_id = compute_job_id("Shopify", "Senior React Native Mobile Engineer")
    # Job has passed gate but has NOT been applied to yet
    sheets.upsert_job_row(
        JobSheetRow(
            job_id=shopify_id,
            company_name="Shopify",
            role_title="Senior React Native Mobile Engineer",
            initial_match_score=85,
            passed_gate=True,
            gap_analysis="Strong match",
            status="Tailored & Ready",
        )
    )

    # Calling sync_inbox must return empty because no jobs are in Applied status
    emails = agent.sync_inbox()
    assert len(emails) == 0

    job_still_ready = sheets.get_job_by_id(shopify_id)
    assert job_still_ready.status == "Tailored & Ready"

    # Now mark job as Applied
    sheets.update_job_status(shopify_id, status="Applied", date_applied="2026-11-12T00:00:00Z")

    # Now sync_inbox will process Shopify thread
    emails_after = agent.sync_inbox()
    assert len(emails_after) >= 1
    assert any(e.company_name == "Shopify" for e in emails_after)

    updated_job = sheets.get_job_by_id(shopify_id)
    assert updated_job.status == "Interview Requested"


