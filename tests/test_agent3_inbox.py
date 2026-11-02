from pathlib import Path
from job_agent.agents.agent3_inbox import Agent3InboxMonitor
from job_agent.integrations.sheets_client import GoogleSheetsClient


def test_agent3_classifies_all_four_email_categories(tmp_path: Path):
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

    neutral = agent3.classify_thread(
        {
            "thread_id": "t4",
            "company_name": "Vercel",
            "role_title": "Frontend Engineer",
            "sender_email": "careers@vercel.com",
            "subject": "Application Received",
            "body": "Thank you for applying to Vercel. Our team is reviewing your profile.",
            "received_at": "2026-11-01T10:00:00Z",
        }
    )
    assert neutral.category == "Neutral"

