import hashlib
from typing import Literal, Optional
from pydantic import BaseModel, Field


def compute_job_id(company_name: str, role_title: str) -> str:
    """Deterministic 12-char MD5 hash of normalized company_name + role_title."""
    norm_company = company_name.strip().lower()
    norm_role = role_title.strip().lower()
    raw = f"{norm_company}_{norm_role}".encode("utf-8")
    return hashlib.md5(raw).hexdigest()[:12]


class ExtractedJobListing(BaseModel):
    job_id: str = Field(default="", description="Deterministic MD5 hash of company_name + role_title")
    company_name: str = Field(description="Hiring company name")
    role_title: str = Field(description="Normalized role title")
    location: str = Field(default="Remote", description="Job location")
    is_remote: bool = Field(default=True, description="True if role is remote or hybrid-remote")
    sponsorship_explicitly_mentioned: bool = Field(
        default=False, description="True if visa sponsorship is explicitly mentioned"
    )
    job_url: str = Field(default="", description="Direct application URL")
    raw_description: str = Field(default="", description="Cleaned full text of the job description")

    def model_post_init(self, __context) -> None:
        if not self.job_id and self.company_name and self.role_title:
            self.job_id = compute_job_id(self.company_name, self.role_title)


class MatchEvaluation(BaseModel):
    match_score: int = Field(ge=0, le=100, description="Percentage match from 0 to 100")
    missing_critical_skills: list[str] = Field(
        default_factory=list,
        description="Key skills required in JD but missing in master resume",
    )
    matched_skills: list[str] = Field(
        default_factory=list,
        description="Skills present in both the JD and master resume",
    )
    passed_threshold: bool = Field(description="True ONLY if match_score >= 50, otherwise False")
    reasoning: str = Field(description="Concise gap analysis and explanation of the score")
    ats_source: str = Field(default="local_ats_checker", description="Source engine that produced the score")


ApplicationStatus = Literal[
    "Skipped (<50% Match)",
    "Tailored & Ready",
    "Applied",
    "Assessment Requested",
    "Rejected",
    "Interview Requested",
    "Scheduled",
]


class JobSheetRow(BaseModel):
    job_id: str
    company_name: str
    role_title: str
    initial_match_score: int
    passed_gate: bool
    gap_analysis: str
    status: ApplicationStatus
    tailored_resume_link: str = ""
    interview_date: str = ""
    job_url: str = ""
    location: str = "Remote"
    is_remote: bool = True
    sponsorship_explicitly_mentioned: bool = False
    missing_critical_skills: list[str] = Field(default_factory=list)
    matched_skills: list[str] = Field(default_factory=list)
    raw_description: str = ""
    tailored_markdown: str = ""
    local_pdf_path: str = ""
    updated_at: str = ""


class EmailClassification(BaseModel):
    thread_id: str
    company_name: str
    role_title: str = ""
    job_id: Optional[str] = None
    category: Literal["Interview Invite", "Rejection", "Assessment Request", "Neutral"]
    summary: str = Field(description="1-2 sentence summary of the email content")
    proposed_times_raw: list[str] = Field(
        default_factory=list,
        description="Any specific dates/times proposed by the recruiter in the email",
    )
    sender_email: str
    subject: str
    received_at: str = ""
    status_applied: bool = False


class CalendarSlot(BaseModel):
    slot_id: str
    label: str
    start_iso: str
    end_iso: str


class InterviewCoordinationItem(BaseModel):
    job_id: str
    thread_id: str
    company_name: str
    role_title: str
    recruiter_email: str
    subject: str
    email_summary: str
    available_slots: list[CalendarSlot]
    selected_slot_id: Optional[str] = None
    draft_reply: str
    status: Literal["pending_selection", "scheduled_and_sent"] = "pending_selection"


class DashboardStats(BaseModel):
    total_jobs_sourced: int
    passed_gate_count: int
    skipped_below_threshold_count: int
    tailored_ready_count: int
    applied_count: int
    interview_requested_count: int
    scheduled_count: int
    rejected_count: int
    average_match_score: float

