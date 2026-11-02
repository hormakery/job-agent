from pathlib import Path
from unittest.mock import patch
from job_agent.agents.agent1_sourcing import Agent1Sourcing
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing, compute_job_id


def test_agent1_deduplicates_against_sheets(tmp_path: Path):
    sheets = GoogleSheetsClient(state_file=tmp_path / "state.json")
    agent1 = Agent1Sourcing(sheets_client=sheets)

    # First run extracts listings not yet in the sheet
    raw_jobs, new_jobs = agent1.run(roles=["Software Engineer"], limit=4)
    assert len(raw_jobs) >= 1
    assert len(new_jobs) == len(raw_jobs)

    # If one of those jobs is added to sheets, a subsequent run filters it out of new_jobs
    sample = raw_jobs[0]
    from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor

    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)
    agent2.process_job(sample)

    _, new_jobs_after = agent1.run(roles=["Software Engineer"], limit=4)
    new_ids = {j.job_id for j in new_jobs_after}
    assert sample.job_id not in new_ids

