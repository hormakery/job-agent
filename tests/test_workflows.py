from job_agent.workflows.inbox_graph import run_inbox_and_calendar_workflow
from job_agent.workflows.sourcing_graph import run_sourcing_and_tailoring_workflow


def test_sourcing_langgraph_workflow_end_to_end():
    state = run_sourcing_and_tailoring_workflow(
        roles=["Software Engineer", "Mobile Engineer"],
        location="Remote",
        remote_only=True,
        max_jobs=6,
    )
    assert len(state["raw_listings"]) >= 1
    assert len(state["processed_rows"]) >= 1
    assert any("[Agent 2]" in log for log in state["logs"])

    # Verify both >=50% and <50% gate outcomes are handled properly
    passed = [r for r in state["processed_rows"] if r.passed_gate]
    skipped = [r for r in state["processed_rows"] if not r.passed_gate]
    assert len(passed) >= 1
    assert len(skipped) >= 1


def test_inbox_langgraph_workflow_end_to_end():
    state = run_inbox_and_calendar_workflow()
    assert len(state["classified_emails"]) >= 1
    assert len(state["interview_items"]) >= 1
    assert any("[Agent 3]" in log for log in state["logs"])

