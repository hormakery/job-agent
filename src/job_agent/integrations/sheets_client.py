import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from job_agent.config import settings
from job_agent.models.schemas import (
    ApplicationStatus,
    CalendarSlot,
    DashboardStats,
    EmailClassification,
    InterviewCoordinationItem,
    JobSheetRow,
    compute_job_id,
)

CANONICAL_HEADERS = [
    "Job ID",
    "Company Name",
    "Role Title",
    "Initial Match Score",
    "Passed Gate (>=50%)",
    "Gap Analysis",
    "Status",
    "Tailored Resume Link",
    "Interview Date",
    "Job URL",
    "Location / Remote",
]


def _default_seed_data() -> dict:
    """Initial realistic state matching prd.md so the dashboard works out-of-the-box."""
    now = datetime.now(timezone.utc).isoformat()
    stripe_id = compute_job_id("Stripe", "Senior Mobile Engineer")
    apple_id = compute_job_id("Apple", "iOS SwiftUI Kernel Engineer")
    vercel_id = compute_job_id("Vercel", "Senior Frontend & Next.js Engineer")
    datadog_id = compute_job_id("Datadog", "Cloud Deployment & DevOps Engineer")
    linear_id = compute_job_id("Linear", "Product Full-Stack Engineer")

    jobs = [
        JobSheetRow(
            job_id=stripe_id,
            company_name="Stripe",
            role_title="Senior Mobile Engineer",
            initial_match_score=58,
            passed_gate=True,
            gap_analysis="Missing Swift UI experience; strong in React Native, TypeScript, and mobile performance.",
            status="Interview Requested",
            tailored_resume_link=f"http://localhost:8080/api/resumes/{stripe_id}/pdf",
            interview_date="",
            job_url="https://stripe.com/jobs/listing/senior-mobile-engineer",
            location="Remote (US/CA)",
            is_remote=True,
            sponsorship_explicitly_mentioned=True,
            missing_critical_skills=["SwiftUI"],
            matched_skills=["React Native", "TypeScript", "JavaScript", "REST", "GraphQL"],
            raw_description=(
                "Stripe is seeking a Senior Mobile Engineer to build mobile payment experiences using React Native, "
                "TypeScript, and native iOS modules (SwiftUI). Experience with REST, GraphQL, and high-reliability mobile releases required."
            ),
            tailored_markdown=(
                "# ALEX MERCER — Tailored for Stripe (Senior Mobile Engineer)\n\n"
                "## IMPACT HIGHLIGHTS\n"
                "* **Mobile Reliability (STAR):** Led mobile engineering using **React Native** and **TypeScript**, "
                "increasing crash-free sessions from **96.4% to 99.8%** across 85K+ active users.\n"
                "* **API & Payment Resiliency:** Built resilient webhook and **REST/GraphQL** integrations processing 500K+ daily financial events.\n"
            ),
            updated_at=now,
        ).model_dump(),
        JobSheetRow(
            job_id=apple_id,
            company_name="Apple",
            role_title="iOS SwiftUI Kernel Engineer",
            initial_match_score=28,
            passed_gate=False,
            gap_analysis="Match score 28% is below 50% cutoff. Missing required native languages: Swift, SwiftUI, C++.",
            status="Skipped (<50% Match)",
            tailored_resume_link="",
            interview_date="",
            job_url="https://jobs.apple.com/en-us/details/ios-swiftui",
            location="Cupertino, CA (On-site)",
            is_remote=False,
            sponsorship_explicitly_mentioned=False,
            missing_critical_skills=["Swift", "SwiftUI", "C++"],
            matched_skills=["Git"],
            raw_description=(
                "Looking for a low-level iOS Engineer with 5+ years of pure Swift, SwiftUI, Objective-C, and C++ kernel optimization."
            ),
            tailored_markdown="",
            updated_at=now,
        ).model_dump(),
        JobSheetRow(
            job_id=vercel_id,
            company_name="Vercel",
            role_title="Senior Frontend & Next.js Engineer",
            initial_match_score=88,
            passed_gate=True,
            gap_analysis="Strong match across Next.js, React, TypeScript, Tailwind CSS, and cloud deployment.",
            status="Tailored & Ready",
            tailored_resume_link=f"http://localhost:8080/api/resumes/{vercel_id}/pdf",
            interview_date="",
            job_url="https://vercel.com/careers/senior-frontend-engineer",
            location="Remote (Global)",
            is_remote=True,
            sponsorship_explicitly_mentioned=True,
            missing_critical_skills=[],
            matched_skills=["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js", "Docker"],
            raw_description=(
                "Join Vercel to build the future of the web. Requires deep expertise in React, Next.js, TypeScript, "
                "Tailwind CSS, Node.js, and modern CI/CD cloud deployment workflows."
            ),
            tailored_markdown=(
                "# ALEX MERCER — Tailored for Vercel (Senior Frontend & Next.js Engineer)\n\n"
                "## IMPACT HIGHLIGHTS\n"
                "* **Next.js Architecture (STAR):** Architected multi-tenant web platform in **TypeScript**, **React**, and **Next.js**, "
                "cutting P95 latency by **42%**.\n"
                "* **High-Scale UI:** Built real-time dashboards with **Next.js** and **Tailwind CSS** serving **85,000+ monthly active users**.\n"
            ),
            updated_at=now,
        ).model_dump(),
        JobSheetRow(
            job_id=datadog_id,
            company_name="Datadog",
            role_title="Cloud Deployment & DevOps Engineer",
            initial_match_score=74,
            passed_gate=True,
            gap_analysis="Strong in Docker, Kubernetes, Terraform, Python, AWS, and GitHub Actions CI/CD.",
            status="Applied",
            tailored_resume_link=f"http://localhost:8080/api/resumes/{datadog_id}/pdf",
            interview_date="",
            job_url="https://careers.datadoghq.com/detail/devops-engineer",
            location="New York / Remote",
            is_remote=True,
            sponsorship_explicitly_mentioned=True,
            missing_critical_skills=["Kafka"],
            matched_skills=["Python", "Docker", "Kubernetes", "Terraform", "AWS", "CI/CD", "GitHub Actions"],
            raw_description=(
                "Datadog is hiring a Cloud Deployment & DevOps Engineer experienced in Python, Docker, Kubernetes, "
                "Terraform, AWS, GitHub Actions CI/CD, and Kafka."
            ),
            tailored_markdown=(
                "# ALEX MERCER — Tailored for Datadog (Cloud Deployment & DevOps Engineer)\n\n"
                "## IMPACT HIGHLIGHTS\n"
                "* **Kubernetes & CI/CD Automation (STAR):** Automated zero-downtime deployment pipelines using **Docker**, "
                "**GitHub Actions**, **Terraform**, and **Kubernetes (EKS)**, reducing release times from 45m to **6m**.\n"
            ),
            updated_at=now,
        ).model_dump(),
        JobSheetRow(
            job_id=linear_id,
            company_name="Linear",
            role_title="Product Full-Stack Engineer",
            initial_match_score=82,
            passed_gate=True,
            gap_analysis="Strong alignment in TypeScript, React, Node.js, GraphQL, and PostgreSQL.",
            status="Scheduled",
            tailored_resume_link=f"http://localhost:8080/api/resumes/{linear_id}/pdf",
            interview_date="2026-11-04 10:00:00",
            job_url="https://linear.app/careers/product-engineer",
            location="Remote",
            is_remote=True,
            sponsorship_explicitly_mentioned=False,
            missing_critical_skills=[],
            matched_skills=["TypeScript", "React", "Node.js", "GraphQL", "PostgreSQL"],
            raw_description=(
                "Linear is looking for a Product Full-Stack Engineer fluent in TypeScript, React, Node.js, GraphQL, and PostgreSQL."
            ),
            tailored_markdown=(
                "# ALEX MERCER — Tailored for Linear (Product Full-Stack Engineer)\n\n"
                "## IMPACT HIGHLIGHTS\n"
                "* **Full-Stack Performance (STAR):** Engineered high-speed web applications with **TypeScript**, **React**, "
                "**GraphQL**, and **PostgreSQL**.\n"
            ),
            updated_at=now,
        ).model_dump(),
    ]

    emails = [
        EmailClassification(
            thread_id="th_stripe_001",
            company_name="Stripe",
            role_title="Senior Mobile Engineer",
            job_id=stripe_id,
            category="Interview Invite",
            summary="Stripe Recruiting invited you to schedule a 45-minute technical interview for the Senior Mobile Engineer role next week.",
            proposed_times_raw=["Tue Nov 3 at 10:00 AM", "Wed Nov 4 at 2:00 PM", "Thu Nov 5 at 11:00 AM"],
            sender_email="recruiting@stripe.com",
            subject="Invitation to Interview at Stripe - Senior Mobile Engineer",
            received_at=now,
            status_applied=True,
        ).model_dump(),
        EmailClassification(
            thread_id="th_datadog_002",
            company_name="Datadog",
            role_title="Cloud Deployment & DevOps Engineer",
            job_id=datadog_id,
            category="Assessment Request",
            summary="Datadog sent a link to complete a 60-minute infrastructure & Kubernetes coding assessment.",
            proposed_times_raw=[],
            sender_email="talent@datadoghq.com",
            subject="Next Steps: Datadog Technical Assessment",
            received_at=now,
            status_applied=True,
        ).model_dump(),
    ]

    interviews = [
        InterviewCoordinationItem(
            job_id=stripe_id,
            thread_id="th_stripe_001",
            company_name="Stripe",
            role_title="Senior Mobile Engineer",
            recruiter_email="recruiting@stripe.com",
            subject="Re: Invitation to Interview at Stripe - Senior Mobile Engineer",
            email_summary="Stripe wants to schedule a 45-minute technical screen. Google Calendar found 3 open slots matching your working hours.",
            available_slots=[
                CalendarSlot(
                    slot_id="slot_a",
                    label="Option A (Tue Nov 3, 10:00 AM - 10:45 AM)",
                    start_iso="2026-11-03T10:00:00",
                    end_iso="2026-11-03T10:45:00",
                ),
                CalendarSlot(
                    slot_id="slot_b",
                    label="Option B (Wed Nov 4, 2:00 PM - 2:45 PM)",
                    start_iso="2026-11-04T14:00:00",
                    end_iso="2026-11-04T14:45:00",
                ),
                CalendarSlot(
                    slot_id="slot_c",
                    label="Option C (Thu Nov 5, 11:00 AM - 11:45 AM)",
                    start_iso="2026-11-05T11:00:00",
                    end_iso="2026-11-05T11:45:00",
                ),
            ],
            selected_slot_id="slot_a",
            draft_reply=(
                "Hi Stripe Recruiting Team,\n\n"
                "Thank you for reaching out! I would love to chat about the Senior Mobile Engineer role.\n"
                "I am available on Tuesday, Nov 3 at 10:00 AM PST (Option A). Looking forward to speaking with the team!\n\n"
                "Best regards,\nAlex Mercer"
            ),
            status="pending_selection",
        ).model_dump()
    ]

    return {"jobs": jobs, "emails": emails, "interviews": interviews}


class GoogleSheetsClient:
    """
    Manages the canonical 11-column Google Sheet state store (via `gspread`)
    paired with a local JSON state mirror (`data/state_store.json`) for instant UI responsiveness
    and offline resilience before Google Service Account credentials are added.
    """

    def __init__(self, state_file: Optional[Path] = None) -> None:
        self.state_file = state_file or settings.local_state_file
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_local_store()

    def _ensure_local_store(self) -> None:
        if not self.state_file.exists():
            self.state_file.write_text(json.dumps(_default_seed_data(), indent=2), encoding="utf-8")

    def _read_store(self) -> dict:
        self._ensure_local_store()
        return json.loads(self.state_file.read_text(encoding="utf-8"))

    def _write_store(self, data: dict) -> None:
        self.state_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def is_google_sheets_connected(self) -> bool:
        sa_path = Path(settings.google_service_account_file)
        return bool(settings.google_sheet_id and sa_path.exists())

    def _sync_row_to_gspread(self, row: JobSheetRow) -> None:
        """If Google Sheets credentials + Sheet ID are configured, sync row to live Google Sheet."""
        if not self.is_google_sheets_connected():
            return
        try:
            import gspread

            gc = gspread.service_account(filename=settings.google_service_account_file)
            sh = gc.open_by_key(settings.google_sheet_id)
            try:
                ws = sh.worksheet(settings.google_sheet_worksheet_name)
            except gspread.WorksheetNotFound:
                ws = sh.add_worksheet(title=settings.google_sheet_worksheet_name, rows=500, cols=12)
                ws.append_row(CANONICAL_HEADERS)

            existing_ids = ws.col_values(1)
            sheet_values = [
                row.job_id,
                row.company_name,
                row.role_title,
                f"{row.initial_match_score}%",
                "TRUE" if row.passed_gate else "FALSE",
                row.gap_analysis,
                row.status,
                row.tailored_resume_link,
                row.interview_date,
                row.job_url,
                f"{row.location} ({'Remote' if row.is_remote else 'On-site'})",
            ]
            if row.job_id in existing_ids:
                row_idx = existing_ids.index(row.job_id) + 1
                ws.update(f"A{row_idx}:K{row_idx}", [sheet_values])
            else:
                if not existing_ids:
                    ws.append_row(CANONICAL_HEADERS)
                ws.append_row(sheet_values)
        except Exception:
            # Keep local store authoritative if network/quota fails
            pass

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
    ) -> Optional[JobSheetRow]:
        row = self.get_job_by_id(job_id)
        if not row:
            return None
        row.status = status
        if interview_date is not None:
            row.interview_date = interview_date
        return self.upsert_job_row(row)

    def get_dashboard_stats(self) -> DashboardStats:
        rows = self.get_all_jobs()
        total = len(rows)
        passed = sum(1 for r in rows if r.passed_gate)
        skipped = sum(1 for r in rows if not r.passed_gate or r.status == "Skipped (<50% Match)")
        tailored = sum(1 for r in rows if r.status == "Tailored & Ready")
        applied = sum(1 for r in rows if r.status in ("Applied", "Assessment Requested"))
        interview_req = sum(1 for r in rows if r.status == "Interview Requested")
        scheduled = sum(1 for r in rows if r.status == "Scheduled")
        rejected = sum(1 for r in rows if r.status == "Rejected")
        avg_score = round(sum(r.initial_match_score for r in rows) / total, 1) if total else 0.0
        return DashboardStats(
            total_jobs_sourced=total,
            passed_gate_count=passed,
            skipped_below_threshold_count=skipped,
            tailored_ready_count=tailored,
            applied_count=applied,
            interview_requested_count=interview_req,
            scheduled_count=scheduled,
            rejected_count=rejected,
            average_match_score=avg_score,
        )

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

