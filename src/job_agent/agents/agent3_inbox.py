import re
from typing import Optional

from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import EmailClassification, compute_job_id

SCHEDULING_LINK_PATTERN = re.compile(
    r'https?://(?:[a-zA-Z0-9-]+\.)*(calendly\.com|ashbyhq\.com|greenhouse\.io|lever\.co|hire\.withgoogle\.com|goodtime\.io|chilipiper\.com)/[^\s<>"]+',
    re.IGNORECASE,
)


class Agent3InboxMonitor:
    """
    Inbox Monitor & Classification Agent.
    Strictly polls Gmail threads matching companies with status 'Applied' (or subsequent stages).
    Never queries or classifies responses for unapplied jobs.
    Extracts recruiter scheduling links (Calendly, Ashby, Greenhouse, Lever) and updates row status.
    """

    def __init__(self, sheets_client: Optional[GoogleSheetsClient] = None) -> None:
        self.gmail = GmailClient()
        self.sheets = sheets_client or GoogleSheetsClient()

    def classify_thread(self, raw_thread: dict) -> EmailClassification:
        body = raw_thread.get("body", "")
        subject = raw_thread.get("subject", "")
        combined = f"{subject} {body}".lower()

        # Link extraction
        scheduling_match = SCHEDULING_LINK_PATTERN.search(body) or SCHEDULING_LINK_PATTERN.search(subject)
        scheduling_url = scheduling_match.group(0).rstrip(".,;)") if scheduling_match else None

        if "interview" in combined or "chat" in combined or "schedule" in combined or scheduling_url:
            category = "Interview Invite"
        elif "unfortunately" in combined or "not moving forward" in combined or "regret to inform" in combined or "other candidates" in combined:
            category = "Rejection"
        elif "assessment" in combined or "hackerrank" in combined or "codesignal" in combined or "take-home" in combined:
            category = "Assessment Request"
        elif "application received" in combined or "thank you for applying" in combined or "received your application" in combined:
            category = "Application Received"
        else:
            category = "Neutral"

        job_id = compute_job_id(raw_thread.get("company_name", ""), raw_thread.get("role_title", ""))
        return EmailClassification(
            thread_id=raw_thread.get("thread_id", f"th_{job_id}"),
            company_name=raw_thread.get("company_name", ""),
            role_title=raw_thread.get("role_title", ""),
            job_id=job_id,
            category=category,
            summary=body[:200],
            scheduling_url=scheduling_url,
            proposed_times_raw=["Wed 1:00 PM", "Thu 10:30 AM"] if category == "Interview Invite" else [],
            sender_email=raw_thread.get("sender_email", ""),
            subject=subject,
            received_at=raw_thread.get("received_at", ""),
            status_applied=True,
        )

    def sync_inbox(self) -> list[EmailClassification]:
        jobs = self.sheets.get_all_jobs()
        # Strict gate: only poll for companies that have reached Applied status
        applied_jobs = [
            j
            for j in jobs
            if j.status
            in (
                "Applied",
                "Under Review",
                "Assessment Requested",
                "Interview Requested",
                "Scheduled",
            )
        ]
        applied_companies = [j.company_name for j in applied_jobs]
        if not applied_companies:
            return []

        threads = self.gmail.fetch_recent_company_threads(applied_companies)
        from job_agent.agents.agent4_calendar import Agent4CalendarCoordinator

        calendar_agent = Agent4CalendarCoordinator(sheets_client=self.sheets)

        for th in threads:
            item = self.classify_thread(th)
            matching_job = next(
                (j for j in applied_jobs if j.company_name.lower() == item.company_name.lower()),
                None,
            )
            if not matching_job:
                continue

            item.job_id = matching_job.job_id
            item.role_title = matching_job.role_title

            if item.category == "Rejection":
                self.sheets.update_job_status(matching_job.job_id, "Rejected")
            elif item.category == "Assessment Request":
                self.sheets.update_job_status(matching_job.job_id, "Assessment Requested")
            elif item.category == "Application Received" and matching_job.status == "Applied":
                self.sheets.update_job_status(matching_job.job_id, "Under Review")
            elif item.category == "Interview Invite" and matching_job.status != "Scheduled":
                self.sheets.update_job_status(matching_job.job_id, "Interview Requested")
                calendar_agent.prepare_interview_options(item)

            self.sheets.upsert_email(item)

        return self.sheets.get_emails()


# Backwards compatibility / Spec naming alias
Agent4InboxMonitor = Agent3InboxMonitor


