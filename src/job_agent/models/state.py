from typing import TypedDict
from job_agent.models.schemas import (
    EmailClassification,
    ExtractedJobListing,
    InterviewCoordinationItem,
    JobSheetRow,
)


class SourcingPipelineState(TypedDict, total=False):
    target_roles: list[str]
    location: str
    remote_only: bool
    max_jobs: int
    raw_listings: list[ExtractedJobListing]
    new_listings: list[ExtractedJobListing]
    processed_rows: list[JobSheetRow]
    logs: list[str]


class InboxPipelineState(TypedDict, total=False):
    active_companies: list[str]
    classified_emails: list[EmailClassification]
    interview_items: list[InterviewCoordinationItem]
    logs: list[str]

