from langgraph.graph import END, START, StateGraph

from job_agent.agents.agent1_sourcing import Agent1Sourcing
from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.state import SourcingPipelineState


def node_fetch_and_extract_jobs(state: SourcingPipelineState) -> SourcingPipelineState:
    sheets = GoogleSheetsClient()
    agent1 = Agent1Sourcing(sheets_client=sheets)
    roles = state.get("target_roles") or [
        "Software Engineer",
        "Mobile Engineer",
        "Frontend Engineer",
        "DevOps Engineer",
    ]
    location = state.get("location", "Remote")
    remote_only = state.get("remote_only", True)
    max_jobs = state.get("max_jobs", 10)

    logs = list(state.get("logs", []))
    logs.append(f"[Agent 1] Fetching job listings for roles={roles} (limit={max_jobs})...")
    raw_listings, new_listings = agent1.run(
        roles=roles, location=location, remote_only=remote_only, limit=max_jobs
    )
    logs.append(
        f"[Agent 1] Extracted {len(raw_listings)} listings ({len(new_listings)} new, "
        f"{len(raw_listings) - len(new_listings)} already in Google Sheets)."
    )
    return {
        **state,
        "raw_listings": raw_listings,
        "new_listings": new_listings,
        "logs": logs,
    }


def node_evaluate_ats_and_tailor(state: SourcingPipelineState) -> SourcingPipelineState:
    sheets = GoogleSheetsClient()
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)
    logs = list(state.get("logs", []))
    raw_listings = state.get("raw_listings", [])
    new_listings = state.get("new_listings", [])

    target_batch = new_listings if new_listings else raw_listings
    processed_rows = []
    for job in target_batch:
        row = agent2.process_job(job)
        processed_rows.append(row)
        if row.passed_gate:
            logs.append(
                f"[Agent 2] PASSED GATE ({row.initial_match_score}% >= 50%): "
                f"{row.company_name} — {row.role_title} -> Tailored & PDF Ready"
            )
        else:
            logs.append(
                f"[Agent 2] SKIPPED ({row.initial_match_score}% < 50%): "
                f"{row.company_name} — {row.role_title} ({row.gap_analysis})"
            )

    return {
        **state,
        "processed_rows": processed_rows,
        "logs": logs,
    }


def build_sourcing_graph():
    builder = StateGraph(SourcingPipelineState)
    builder.add_node("fetch_and_extract_jobs", node_fetch_and_extract_jobs)
    builder.add_node("evaluate_ats_and_tailor", node_evaluate_ats_and_tailor)
    builder.add_edge(START, "fetch_and_extract_jobs")
    builder.add_edge("fetch_and_extract_jobs", "evaluate_ats_and_tailor")
    builder.add_edge("evaluate_ats_and_tailor", END)
    return builder.compile()


sourcing_graph = build_sourcing_graph()


def run_sourcing_and_tailoring_workflow(
    roles: list[str] | None = None,
    location: str = "Remote",
    remote_only: bool = True,
    max_jobs: int = 10,
) -> SourcingPipelineState:
    initial_state: SourcingPipelineState = {
        "target_roles": roles or [
            "Software Engineer",
            "Mobile Engineer",
            "Frontend Engineer",
            "DevOps Engineer",
        ],
        "location": location,
        "remote_only": remote_only,
        "max_jobs": max_jobs,
        "logs": [],
    }
    return sourcing_graph.invoke(initial_state)
