#!/usr/bin/env python3
"""
Re-evaluates and re-tailors all existing jobs in data/state_store.json
against Blessing Ukwu's real Master Resume and Candidate Profile.
"""
from pathlib import Path
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.agents.agent3_dispatch import Agent3Dispatch
from job_agent.models.schemas import ExtractedJobListing

def main():
    sheets = GoogleSheetsClient()
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)
    agent3 = Agent3Dispatch(sheets_client=sheets)

    jobs = sheets.get_all_jobs()
    print(f"Loaded {len(jobs)} jobs from state store.")

    for job in jobs:
        listing = ExtractedJobListing(
            job_id=job.job_id,
            company_name=job.company_name,
            role_title=job.role_title,
            location=job.location,
            is_remote=job.is_remote,
            job_url=job.job_url,
            raw_description=job.raw_description,
            source_platform=job.source_platform,
            application_method=job.submission_method,
            application_email=job.application_email,
            sponsorship_explicitly_mentioned=job.sponsorship_explicitly_mentioned,
        )
        print(f"Re-processing {job.company_name} — {job.role_title}...")
        updated_row = agent2.process_job(listing)
        print(f"  -> Score: {updated_row.initial_match_score}% | Passed: {updated_row.passed_gate}")

    print("Regenerating all application dispatch packages...")
    agent3.prepare_all_pending_dispatches()
    print("All dispatch packages successfully refreshed with Blessing Ukwu profile!")

if __name__ == "__main__":
    main()
