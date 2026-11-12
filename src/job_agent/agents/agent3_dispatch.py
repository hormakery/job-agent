import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from job_agent.config import settings
from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import (
    ApplicationDispatchItem,
    CandidateProfile,
    JobSheetRow,
)


def load_candidate_profile() -> CandidateProfile:
    """Loads active candidate profile from local JSON state or environment defaults."""
    if settings.candidate_profile_file.exists():
        try:
            data = json.loads(settings.candidate_profile_file.read_text(encoding="utf-8"))
            return CandidateProfile(**data)
        except Exception:
            pass

    return CandidateProfile(
        full_name=settings.candidate_name,
        email=settings.candidate_email,
        phone=settings.candidate_phone,
        linkedin_url=settings.candidate_linkedin_url,
        github_url=settings.candidate_github_url,
        portfolio_url=settings.candidate_portfolio_url,
        location=settings.candidate_location,
    )


class Agent3Dispatch:
    """
    Agent 3: Application Dispatcher & Submission Engine.
    Prepares complete application packages for both Direct Email and Portal/Form submissions:
    - Direct Email: Generates tailored cover email, attaches tailored resume PDF, creates Gmail draft, or sends directly.
    - Portal / Form: Packages application URL, 1-click tailored resume PDF, and STAR screening answers.
    - Status Transition: Transitions jobs to 'Applied' only upon verified human dispatch.
    """

    def __init__(
        self,
        sheets_client: Optional[GoogleSheetsClient] = None,
        gmail_client: Optional[GmailClient] = None,
    ) -> None:
        self.sheets = sheets_client or GoogleSheetsClient()
        self.gmail = gmail_client or GmailClient()

    def generate_dispatch_item(
        self,
        job: JobSheetRow,
        profile: Optional[CandidateProfile] = None,
    ) -> ApplicationDispatchItem:
        candidate = profile or load_candidate_profile()
        matched_str = ", ".join(job.matched_skills) if job.matched_skills else "Full-Stack Development, Cloud APIs, Performance Optimization"

        # Email Submission Package
        if job.submission_method == "email_submission":
            subject = f"Application: {job.role_title} - {candidate.full_name}"
            body = (
                f"Hi {job.company_name} team,\n\n"
                f"I'm applying for the {job.role_title} role, and I'd love to connect.\n\n"
                f"Over the past five years, I've been building and maintaining production web and mobile applications "
                f"with React, React Native, TypeScript, and Node.js. In previous roles, I've led frontend and mobile architectures "
                f"end-to-end, integrated real-time systems (such as live chat driving a 23% increase in user engagement), "
                f"and delivered secure, scalable user flows across distributed agile teams.\n\n"
                f"Key Highlights for {job.company_name}:\n"
                f"- Matched Core Competencies: {matched_str}\n"
                f"- 5+ years shipping maintainable architectures, clean component design, and robust API integrations.\n"
                f"- Deep focus on performance optimization, test coverage, and reliable release cycles.\n\n"
                f"My tailored resume is attached for your review. You can also explore my live work and background via:\n"
                f"- Portfolio: {candidate.portfolio_url or 'https://blessing-ukwu.netlify.app/'}\n"
                f"- LinkedIn: {candidate.linkedin_url or 'https://www.linkedin.com/in/ukwu-blessing/'}\n"
                f"- GitHub: {candidate.github_url or 'https://github.com/hormakery'}\n\n"
                f"I'm based in Nigeria and work seamlessly across global remote time zones. "
                f"If the fit looks right, I'd be happy to discuss how my background aligns with your team's goals.\n\n"
                f"Best regards,\n"
                f"{candidate.full_name}\n"
                f"{candidate.email} | {candidate.phone} | {candidate.location}"
            )
            item = ApplicationDispatchItem(
                job_id=job.job_id,
                company_name=job.company_name,
                role_title=job.role_title,
                source_platform=job.source_platform,
                submission_method="email_submission",
                recipient_email=job.application_email or f"careers@{job.company_name.lower().replace(' ', '')}.com",
                portal_url=job.job_url or None,
                cover_subject=subject,
                cover_body=body,
                tailored_pdf_path=job.local_pdf_path,
                tailored_drive_link=job.tailored_resume_link,
                screening_qa={},
                status="Draft Prepared",
            )
        else:
            # Portal / Form Submission Package
            screening_answers = {
                "Why are you interested in this role?": (
                    f"I am inspired by {job.company_name}'s engineering standards. With extensive experience in "
                    f"{matched_str}, I look forward to designing resilient architectures and driving business impact on your team."
                ),
                "Describe a major technical challenge you overcame": (
                    "In a recent production system, I diagnosed critical latency bottlenecks and refactored the caching and data ingestion pipelines, "
                    "achieving a 40% reduction in response latency and improving system uptime under peak loads."
                ),
                "Do you require visa sponsorship?": (
                    "No sponsorship required; authorized to work without restriction."
                    if not job.sponsorship_explicitly_mentioned
                    else "Open to roles supporting visa sponsorship or direct remote engagement."
                ),
                "What is your notice period / availability?": "Available immediately or within standard 2-week notice period.",
            }
            item = ApplicationDispatchItem(
                job_id=job.job_id,
                company_name=job.company_name,
                role_title=job.role_title,
                source_platform=job.source_platform,
                submission_method="portal_submission",
                recipient_email=None,
                portal_url=job.job_url or f"https://careers.{job.company_name.lower().replace(' ', '')}.com",
                cover_subject="",
                cover_body="",
                tailored_pdf_path=job.local_pdf_path,
                tailored_drive_link=job.tailored_resume_link,
                screening_qa=screening_answers,
                status="Portal Ready",
            )

        saved = self.sheets.upsert_application(item)
        if job.status == "Tailored & Ready":
            self.sheets.update_job_status(job.job_id, status="Application Drafted")

        return saved

    def prepare_all_pending_dispatches(self) -> list[ApplicationDispatchItem]:
        """Prepares dispatch items for all tailored jobs that have passed the gate."""
        jobs = self.sheets.get_all_jobs()
        results: list[ApplicationDispatchItem] = []
        for j in jobs:
            if j.passed_gate and j.status in ("Tailored & Ready", "Application Drafted"):
                item = self.generate_dispatch_item(j)
                results.append(item)
        return results

    def create_gmail_draft_for_job(
        self,
        job_id: str,
        custom_subject: Optional[str] = None,
        custom_body: Optional[str] = None,
    ) -> dict:
        job = self.sheets.get_job_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        item = self.sheets.get_application_by_job_id(job_id)
        if not item:
            item = self.generate_dispatch_item(job)

        subject = custom_subject or item.cover_subject
        body = custom_body or item.cover_body
        recipient = item.recipient_email or job.application_email or "careers@company.com"

        draft_result = self.gmail.create_draft(
            to_email=recipient,
            subject=subject,
            body_text=body,
            pdf_attachment_path=item.tailored_pdf_path or job.local_pdf_path,
        )

        item.cover_subject = subject
        item.cover_body = body
        item.status = "Draft Prepared"
        self.sheets.upsert_application(item)
        return draft_result

    def dispatch_email_application(
        self,
        job_id: str,
        custom_subject: Optional[str] = None,
        custom_body: Optional[str] = None,
        draft_id: Optional[str] = None,
    ) -> dict:
        job = self.sheets.get_job_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        item = self.sheets.get_application_by_job_id(job_id)
        if not item:
            item = self.generate_dispatch_item(job)

        subject = custom_subject or item.cover_subject
        body = custom_body or item.cover_body
        recipient = item.recipient_email or job.application_email or "careers@company.com"

        send_result = self.gmail.send_email(
            to_email=recipient,
            subject=subject,
            body_text=body,
            pdf_attachment_path=item.tailored_pdf_path or job.local_pdf_path,
            draft_id=draft_id,
        )

        now = datetime.now(timezone.utc).isoformat()
        item.cover_subject = subject
        item.cover_body = body
        item.status = "Dispatched (Sent)"
        item.dispatched_at = now
        self.sheets.upsert_application(item)

        # Transition job to Applied with verified date
        self.sheets.update_job_status(job_id=job_id, status="Applied", date_applied=now)

        return {
            "dispatch_item": item.model_dump(),
            "send_result": send_result,
            "status": "Applied",
            "date_applied": now,
        }

    def mark_portal_applied(self, job_id: str) -> dict:
        job = self.sheets.get_job_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        item = self.sheets.get_application_by_job_id(job_id)
        if not item:
            item = self.generate_dispatch_item(job)

        now = datetime.now(timezone.utc).isoformat()
        item.status = "Dispatched (Sent)"
        item.dispatched_at = now
        self.sheets.upsert_application(item)

        updated_job = self.sheets.update_job_status(job_id=job_id, status="Applied", date_applied=now)

        return {
            "dispatch_item": item.model_dump(),
            "status": "Applied",
            "date_applied": now,
            "job": updated_job.model_dump() if updated_job else None,
        }
