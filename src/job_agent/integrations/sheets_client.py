import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from job_agent.config import settings
from job_agent.integrations.google_auth import get_google_credentials
from job_agent.models.schemas import (
    ApplicationDispatchItem,
    ApplicationStatus,
    DashboardStats,
    EmailClassification,
    InterviewCoordinationItem,
    JobSheetRow,
)

CANONICAL_HEADERS = [
    "Job ID",
    "Company Name",
    "Role Title",
    "Source Platform",
    "Initial Match Score",
    "Passed Gate (>=50%)",
    "Gap Analysis",
    "Status",
    "Submission Method",
    "Date Applied",
    "Tailored Resume Link",
    "Interview Date",
    "Job URL",
]


def _clean_zero_state() -> dict:
    """Truthful clean zero state — zero fake jobs or synthetic interview invites."""
    return {
        "jobs": [],
        "emails": [],
        "interviews": [],
        "applications": [],
    }


class GoogleSheetsClient:
    """
    Manages the canonical 13-column Google Sheet state store (via `gspread`)
    paired with a local JSON state mirror (`data/state_store.json`) for instant UI responsiveness.
    Never seeds fake application records.
    """

    def __init__(self, state_file: Optional[Path] = None) -> None:
        self.state_file = state_file or settings.local_state_file
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_local_store()

    def _ensure_local_store(self) -> None:
        if not self.state_file.exists():
            self.state_file.write_text(json.dumps(_clean_zero_state(), indent=2), encoding="utf-8")

    def _read_store(self) -> dict:
        self._ensure_local_store()
        try:
            return json.loads(self.state_file.read_text(encoding="utf-8"))
        except Exception:
            return _clean_zero_state()

    def _write_store(self, data: dict) -> None:
        self.state_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def is_google_sheets_connected(self) -> bool:
        creds = get_google_credentials()
        return bool(settings.google_sheet_id and creds is not None)

    def _sync_row_to_gspread(self, row: JobSheetRow) -> None:
        """If Google Sheets credentials + Sheet ID are configured, sync row to live Google Sheet."""
        if not self.is_google_sheets_connected():
            return
        try:
            import gspread

            creds = get_google_credentials()
            if not creds:
                return

            gc = gspread.authorize(creds)
            sh = gc.open_by_key(settings.google_sheet_id)
            try:
                ws = sh.worksheet(settings.google_sheet_worksheet_name)
            except gspread.WorksheetNotFound:
                ws = sh.add_worksheet(title=settings.google_sheet_worksheet_name, rows=500, cols=14)
                ws.append_row(CANONICAL_HEADERS)

            existing_ids = ws.col_values(1)
            sheet_values = [
                row.job_id,
                row.company_name,
                row.role_title,
                row.source_platform,
                f"{row.initial_match_score}%",
                "TRUE" if row.passed_gate else "FALSE",
                row.gap_analysis,
                row.status,
                row.submission_method.replace("_", " ").title(),
                row.date_applied or "",
                row.tailored_resume_link,
                row.interview_date or "",
                row.job_url,
            ]
            if row.job_id in existing_ids:
                row_idx = existing_ids.index(row.job_id) + 1
                ws.update(f"A{row_idx}:M{row_idx}", [sheet_values])
            else:
                if not existing_ids:
                    ws.append_row(CANONICAL_HEADERS)
                ws.append_row(sheet_values)
        except Exception:
            # Local store remains safe and authoritative
            pass

    def sync_all_jobs_to_gspread(self) -> int:
        """Syncs all jobs from local state store to the live Google Sheet."""
        if not self.is_google_sheets_connected():
            return 0
        jobs = self.get_all_jobs()
        for j in jobs:
            self._sync_row_to_gspread(j)
        return len(jobs)

    def get_existing_job_ids(self) -> set[str]:
        store = self._read_store()
        return {j["job_id"] for j in store.get("jobs", [])}

    def get_all_jobs(
        self,
        status: Optional[str] = None,
        passed_gate: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> list[JobSheetRow]:
        store = self._read_store()
        rows = [JobSheetRow(**j) for j in store.get("jobs", [])]
        if status and status != "ALL":
            rows = [r for r in rows if r.status == status]
        if passed_gate is not None:
            rows = [r for r in rows if r.passed_gate == passed_gate]
        if search:
            q = search.strip().lower()
            rows = [
                r
                for r in rows
                if q in r.company_name.lower()
                or q in r.role_title.lower()
                or q in r.gap_analysis.lower()
                or q in r.source_platform.lower()
            ]
        return rows

    def get_job_by_id(self, job_id: str) -> Optional[JobSheetRow]:
        for r in self.get_all_jobs():
            if r.job_id == job_id:
                return r
        return None

    def upsert_job_row(self, row: JobSheetRow) -> JobSheetRow:
        store = self._read_store()
        row.updated_at = datetime.now(timezone.utc).isoformat()
        jobs = store.get("jobs", [])
        updated = False
        for idx, existing in enumerate(jobs):
            if existing["job_id"] == row.job_id:
                jobs[idx] = row.model_dump()
                updated = True
                break
        if not updated:
            jobs.insert(0, row.model_dump())
        store["jobs"] = jobs
        self._write_store(store)
        self._sync_row_to_gspread(row)
        return row

    def update_job_status(
        self,
        job_id: str,
        status: ApplicationStatus,
        interview_date: Optional[str] = None,
        date_applied: Optional[str] = None,
    ) -> Optional[JobSheetRow]:
        row = self.get_job_by_id(job_id)
        if not row:
            return None
        row.status = status
        if interview_date is not None:
            row.interview_date = interview_date
        if date_applied is not None:
            row.date_applied = date_applied
        return self.upsert_job_row(row)

    def get_dashboard_stats(self) -> DashboardStats:
        rows = self.get_all_jobs()
        total = len(rows)
        if total == 0:
            return DashboardStats()

        passed = sum(1 for r in rows if r.passed_gate)
        skipped = sum(1 for r in rows if not r.passed_gate or r.status == "Skipped (<50% Match)")
        tailored = sum(1 for r in rows if r.status == "Tailored & Ready")
        drafted = sum(1 for r in rows if r.status == "Application Drafted")
        applied = sum(1 for r in rows if r.status in ("Applied", "Under Review", "Assessment Requested"))
        interview_req = sum(1 for r in rows if r.status == "Interview Requested")
        scheduled = sum(1 for r in rows if r.status == "Scheduled")
        rejected = sum(1 for r in rows if r.status == "Rejected")
        avg_score = round(sum(r.initial_match_score for r in rows) / total, 1) if total else 0.0

        return DashboardStats(
            total_jobs_sourced=total,
            passed_gate_count=passed,
            skipped_below_threshold_count=skipped,
            tailored_ready_count=tailored,
            application_drafted_count=drafted,
            applied_count=applied,
            interview_requested_count=interview_req,
            scheduled_count=scheduled,
            rejected_count=rejected,
            average_match_score=avg_score,
        )

    # Applications Dispatch Storage
    def get_applications(self) -> list[ApplicationDispatchItem]:
        store = self._read_store()
        return [ApplicationDispatchItem(**a) for a in store.get("applications", [])]

    def get_application_by_job_id(self, job_id: str) -> Optional[ApplicationDispatchItem]:
        for app_item in self.get_applications():
            if app_item.job_id == job_id:
                return app_item
        return None

    def upsert_application(self, item: ApplicationDispatchItem) -> ApplicationDispatchItem:
        store = self._read_store()
        apps = store.get("applications", [])
        for idx, existing in enumerate(apps):
            if existing["job_id"] == item.job_id:
                apps[idx] = item.model_dump()
                store["applications"] = apps
                self._write_store(store)
                return item
        apps.insert(0, item.model_dump())
        store["applications"] = apps
        self._write_store(store)
        return item

    # Emails & Interviews Storage
    def get_emails(self) -> list[EmailClassification]:
        store = self._read_store()
        return [EmailClassification(**e) for e in store.get("emails", [])]

    def upsert_email(self, email_item: EmailClassification) -> EmailClassification:
        store = self._read_store()
        emails = store.get("emails", [])
        for idx, existing in enumerate(emails):
            if existing["thread_id"] == email_item.thread_id:
                emails[idx] = email_item.model_dump()
                store["emails"] = emails
                self._write_store(store)
                return email_item
        emails.insert(0, email_item.model_dump())
        store["emails"] = emails
        self._write_store(store)
        return email_item

    def get_interviews(self) -> list[InterviewCoordinationItem]:
        store = self._read_store()
        return [InterviewCoordinationItem(**i) for i in store.get("interviews", [])]

    def get_interview_by_job_id(self, job_id: str) -> Optional[InterviewCoordinationItem]:
        for item in self.get_interviews():
            if item.job_id == job_id:
                return item
        return None

    def upsert_interview(self, item: InterviewCoordinationItem) -> InterviewCoordinationItem:
        store = self._read_store()
        interviews = store.get("interviews", [])
        for idx, existing in enumerate(interviews):
            if existing["job_id"] == item.job_id:
                interviews[idx] = item.model_dump()
                store["interviews"] = interviews
                self._write_store(store)
                return item
        interviews.insert(0, item.model_dump())
        store["interviews"] = interviews
        self._write_store(store)
        return item
