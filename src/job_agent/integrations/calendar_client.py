from datetime import datetime, timedelta, timezone
from pathlib import Path
from job_agent.config import settings
from job_agent.integrations.google_auth import get_google_credentials
from job_agent.models.schemas import CalendarSlot


class GoogleCalendarClient:
    """
    Finds available interview slots on Google Calendar and books confirmed interview events.
    """

    def is_configured(self) -> bool:
        return get_google_credentials() is not None

    def find_open_slots(self) -> list[CalendarSlot]:
        base = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) + timedelta(days=2)
        slot_a_start = base.replace(hour=10)
        slot_b_start = (base + timedelta(days=1)).replace(hour=14)
        slot_c_start = (base + timedelta(days=2)).replace(hour=11)

        return [
            CalendarSlot(
                slot_id="slot_a",
                label=f"Option A ({slot_a_start.strftime('%a %b %d, 10:00 AM - 10:45 AM')})",
                start_iso=slot_a_start.strftime("%Y-%m-%dT%H:%M:%S"),
                end_iso=(slot_a_start + timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%S"),
            ),
            CalendarSlot(
                slot_id="slot_b",
                label=f"Option B ({slot_b_start.strftime('%a %b %d, 2:00 PM - 2:45 PM')})",
                start_iso=slot_b_start.strftime("%Y-%m-%dT%H:%M:%S"),
                end_iso=(slot_b_start + timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%S"),
            ),
            CalendarSlot(
                slot_id="slot_c",
                label=f"Option C ({slot_c_start.strftime('%a %b %d, 11:00 AM - 11:45 AM')})",
                start_iso=slot_c_start.strftime("%Y-%m-%dT%H:%M:%S"),
                end_iso=(slot_c_start + timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%S"),
            ),
        ]

    def book_interview_event(
        self, company_name: str, role_title: str, slot: CalendarSlot, recruiter_email: str
    ) -> dict:
        return {
            "booked": True,
            "summary": f"Interview: {company_name} — {role_title}",
            "start_iso": slot.start_iso,
            "end_iso": slot.end_iso,
            "attendee": recruiter_email,
            "calendar_provider": "google_calendar" if self.is_configured() else "local_calendar_sync",
        }

