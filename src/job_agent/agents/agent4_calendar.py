from job_agent.integrations.calendar_client import GoogleCalendarClient
from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import EmailClassification, InterviewCoordinationItem


class Agent4CalendarCoordinator:
    """
    Agent 4: Interview & Calendar Coordinator (Human-in-the-Loop).
    1. Queries Google Calendar API for open slots.
    2. Dispatches slot options and recruiter booking links to the Next.js Web UI (`/interviews`).
    3. When the user approves a slot & reply draft, books the Google Calendar event,
       updates Google Sheets (`Scheduled` + `Interview Date`), and sends the email via Agent 3.
    """

    def __init__(self, sheets_client: GoogleSheetsClient | None = None) -> None:
        self.calendar = GoogleCalendarClient()
        self.gmail = GmailClient()
        self.sheets = sheets_client or GoogleSheetsClient()

    def prepare_interview_options(self, email_item: EmailClassification) -> InterviewCoordinationItem:
        job_id = email_item.job_id or "unknown"
        existing = self.sheets.get_interview_by_job_id(job_id)
        if existing:
            return existing

        slots = self.calendar.find_open_slots()
        default_slot = slots[0]
        draft = (
            f"Hi {email_item.company_name} Recruiting Team,\n\n"
            f"Thank you for the invitation to interview for the {email_item.role_title or 'Software Engineer'} role!\n"
            f"I would be happy to meet at {default_slot.label}. Please let me know if that works on your end.\n\n"
            "Best regards,\nAlex Mercer"
        )
        coordination = InterviewCoordinationItem(
            job_id=job_id,
            thread_id=email_item.thread_id,
            company_name=email_item.company_name,
            role_title=email_item.role_title or "Software Engineer",
            recruiter_email=email_item.sender_email,
            subject=f"Re: {email_item.subject}",
            email_summary=email_item.summary,
            scheduling_url=email_item.scheduling_url,
            available_slots=slots,
            selected_slot_id=default_slot.slot_id,
            draft_reply=draft,
            status="pending_selection",
        )
        self.sheets.upsert_interview(coordination)
        return coordination

    def confirm_slot_and_send_reply(
        self, job_id: str, slot_id: str, custom_draft_reply: str | None = None
    ) -> dict:
        coordination = self.sheets.get_interview_by_job_id(job_id)
        if not coordination:
            raise ValueError(f"No pending interview coordination found for job_id={job_id}")

        chosen_slot = next(
            (s for s in coordination.available_slots if s.slot_id == slot_id),
            coordination.available_slots[0],
        )
        coordination.selected_slot_id = chosen_slot.slot_id
        if custom_draft_reply:
            coordination.draft_reply = custom_draft_reply
        coordination.status = "scheduled_and_sent"
        self.sheets.upsert_interview(coordination)

        calendar_event = self.calendar.book_interview_event(
            company_name=coordination.company_name,
            role_title=coordination.role_title,
            slot=chosen_slot,
            recruiter_email=coordination.recruiter_email,
        )
        email_receipt = self.gmail.send_approved_reply(
            thread_id=coordination.thread_id,
            to_email=coordination.recruiter_email,
            subject=coordination.subject,
            body=coordination.draft_reply,
        )
        formatted_date = chosen_slot.start_iso.replace("T", " ")
        updated_job = self.sheets.update_job_status(
            job_id=job_id, status="Scheduled", interview_date=formatted_date
        )

        return {
            "coordination": coordination.model_dump(),
            "calendar_event": calendar_event,
            "email_receipt": email_receipt,
            "updated_job": updated_job.model_dump() if updated_job else None,
        }
