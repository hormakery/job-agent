from pathlib import Path
from unittest.mock import patch
from job_agent.agents.agent1_sourcing import Agent1Sourcing
from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.integrations.jsearch_client import (
    detect_application_method,
    infer_source_platform,
)
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing, compute_job_id


def test_infer_source_platform():
    assert infer_source_platform(url="https://www.linkedin.com/jobs/view/123") == "LinkedIn"
    assert infer_source_platform(publisher="LinkedIn Jobs") == "LinkedIn"
    assert infer_source_platform(url="https://www.indeed.com/viewjob?jk=abc") == "Indeed"
    assert infer_source_platform(publisher="Indeed") == "Indeed"
    assert infer_source_platform(url="https://www.glassdoor.com/job-listing/xyz") == "Glassdoor"
    assert infer_source_platform(publisher="Glassdoor") == "Glassdoor"
    assert infer_source_platform(url="https://www.ziprecruiter.com/jobs/123") == "ZipRecruiter"
    assert infer_source_platform(url="https://jobs.ashbyhq.com/anthropic/eng") == "Direct Career Site"
    assert infer_source_platform(url="https://boards.greenhouse.io/figma/jobs/456") == "Direct Career Site"


def test_detect_application_method():
    # 1. Mailto URL
    method, email = detect_application_method(url="mailto:hiring@techcorp.io?subject=Apply")
    assert method == "email_submission"
    assert email == "hiring@techcorp.io"

    # 2. Directed email phrasing in description
    method, email = detect_application_method(
        url="https://example.com/job",
        description="We are hiring! Please send your resume to careers@shopify.com for consideration.",
    )
    assert method == "email_submission"
    assert email == "careers@shopify.com"

    # 3. Known hiring mailbox pattern
    method, email = detect_application_method(
        url="https://example.com/job",
        description="Reach out to jobs@startup.ai with your GitHub and background.",
    )
    assert method == "email_submission"
    assert email == "jobs@startup.ai"

    # 4. Standard portal application
    method, email = detect_application_method(
        url="https://jobs.ashbyhq.com/acme/apply",
        description="Apply through our portal by uploading your PDF resume and completing the questionnaire.",
    )
    assert method == "portal_submission"
    assert email is None


def test_agent1_sourcing_enrichment(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent1 = Agent1Sourcing(sheets_client=sheets)

    raw_jobs, new_jobs = agent1.run(limit=6)
    assert len(raw_jobs) >= 4
    assert len(new_jobs) == len(raw_jobs)

    valid_platforms = {"LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter", "Direct Career Site"}
    for job in raw_jobs:
        assert job.source_platform in valid_platforms
        assert job.application_method in {"email_submission", "portal_submission"}
        if job.application_method == "email_submission":
            assert job.application_email is not None
            assert "@" in job.application_email


def test_agent1_deduplicates_against_sheets(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent1 = Agent1Sourcing(sheets_client=sheets)

    # First run extracts listings not yet in the sheet
    raw_jobs, new_jobs = agent1.run(roles=["Software Engineer"], limit=4)
    assert len(raw_jobs) >= 1
    assert len(new_jobs) == len(raw_jobs)

    # If one of those jobs is added to sheets, a subsequent run filters it out of new_jobs
    sample = raw_jobs[0]
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)
    saved_row = agent2.process_job(sample)

    assert saved_row.source_platform == sample.source_platform
    assert saved_row.submission_method == sample.application_method
    assert saved_row.application_email == sample.application_email

    _, new_jobs_after = agent1.run(roles=["Software Engineer"], limit=4)
    new_ids = {j.job_id for j in new_jobs_after}
    assert sample.job_id not in new_ids


