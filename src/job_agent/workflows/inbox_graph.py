from langgraph.graph import END, START, StateGraph

from job_agent.agents.agent3_inbox import Agent3InboxMonitor
from job_agent.agents.agent4_calendar import Agent4CalendarCoordinator
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.state import InboxPipelineState


def node_poll_and_classify_gmail(state: InboxPipelineState) -> InboxPipelineState:
    sheets = GoogleSheetsClient()
    agent3 = Agent3InboxMonitor(sheets_client=sheets)
    logs = list(state.get("logs", []))
    logs.append("[Agent 3] Scanning Gmail inbox for active companies in Google Sheets...")
    emails = agent3.sync_inbox()
    logs.append(f"[Agent 3] Classified {len(emails)} recruiter threads.")
    return {
        **state,
        "active_companies": [j.company_name for j in sheets.get_all_jobs() if j.passed_gate],
        "classified_emails": emails,
        "logs": logs,
    }


def route_after_inbox(state: InboxPipelineState) -> str:
    emails = state.get("classified_emails", [])
    has_invite = any(e.category == "Interview Invite" for e in emails)
    return "propose_calendar_slots" if has_invite else END


def node_propose_calendar_slots(state: InboxPipelineState) -> InboxPipelineState:
    sheets = GoogleSheetsClient()
    agent4 = Agent4CalendarCoordinator(sheets_client=sheets)
    logs = list(state.get("logs", []))
    for em in state.get("classified_emails", []):
        if em.category == "Interview Invite":
            coord = agent4.prepare_interview_options(em)
            logs.append(
                f"[Agent 4] Prepared {len(coord.available_slots)} Google Calendar slots "
                f"for {em.company_name} ({em.role_title})."
            )
    return {
        **state,
        "interview_items": sheets.get_interviews(),
        "logs": logs,
    }


def build_inbox_graph():
    builder = StateGraph(InboxPipelineState)
    builder.add_node("poll_and_classify_gmail", node_poll_and_classify_gmail)
    builder.add_node("propose_calendar_slots", node_propose_calendar_slots)
    builder.add_edge(START, "poll_and_classify_gmail")
    builder.add_conditional_edges("poll_and_classify_gmail", route_after_inbox)
    builder.add_edge("propose_calendar_slots", END)
    return builder.compile()


inbox_graph = build_inbox_graph()


def run_inbox_and_calendar_workflow() -> InboxPipelineState:
    initial_state: InboxPipelineState = {"logs": []}
    return inbox_graph.invoke(initial_state)
