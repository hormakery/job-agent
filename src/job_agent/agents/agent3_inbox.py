from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import EmailClassification, compute_job_id


class Agent3InboxMonitor:
    """
    Agent 3: Inbox Monitor & Response Agent.
    Checks unread Gmail threads matching companies in Google Sheets,
    classifies them into [Interview Invite, Rejection, Assessment Request, Neutral],
    updates Google Sheets row status automatically, and triggers Agent 4 on Interview Invite.
    """

    def __init__(self, sheets_client: GoogleSheetsClient | None = None) -> None:
        self.gmail = GmailClient()
        self.sheets = sheets_client or GoogleSheetsClient()

    def classify_thread(self, raw_thread: dict) -> EmailClassification:
        body_lower = raw_thread["body"].lower()
        subj_lower = raw_thread["subject"].lower()
        combined = f"{subj_lower} {body_lower}"

        if "interview" in combined or "chat" in combined or "schedule" in combined:
            category = "Interview Invite"
        elif "unfortunately" in combined or "not moving forward" in combined or "regret" in combined:
            category = "Rejection"
        elif "assessment" in combined or "hackerrank" in combined or "codesignal" in combined:
            category = "Assessment Request"
        else:
            category = "Neutral"

        job_id = compute_job_id(raw_thread["company_name"], raw_thread.get("role_title", ""))
        return EmailClassification(
            thread_id=raw_thread["thread_id"],
            company_name=raw_thread["company_name"],
            role_title=raw_thread.get("role_title", ""),
            job_id=job_id,
            category=category,
            summary=raw_thread["body"][:200],
            proposed_times_raw=["Wed 1:00 PM", "Thu 10:30 AM"] if category == "Interview Invite" else [],
            sender_email=raw_thread["sender_email"],
            subject=raw_thread["subject"],
            received_at=raw_thread["received_at"],
            status_applied=True,
        )

    def sync_inbox(self) -> list[EmailClassification]:
        jobs = self.sheets.get_all_jobs()
        active_companies = [j.company_name for j in jobs if j.passed_gate]
        threads = self.gmail.fetch_recent_company_threads(active_companies)

        classified_list: list[EmailClassification] = []
        for th in threads:
            item = self.classify_thread(th)
            # Match job in sheet by job_id or company_name
            matching_job = next(
                (j for j in jobs if j.company_name.lower() == item.company_name.lower()), None
            )
            if matching_job:
                item.job_id = matching_job.job_id
                item.role_title = matching_job.role_title
                if item.category == "Rejection":
                    self.sheets.update_job_status(matching_job.job_id, "Rejected")
                elif item.category == "Assessment Request":
                    self.sheets.update_job_status(matching_job.job_id, "Assessment Requested")
                elif item.category == "Interview Invite" and matching_job.status != "Scheduled":
                    self.sheets.update_job_status(matching_job.job_id, "Interview Requested")

            self.sheets.upsert_email(item)
            classified_list.append(item)

        return self.sheets.get_emails()

