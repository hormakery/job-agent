from pathlib import Path
from job_agent.integrations.pdf_renderer import render_markdown_to_pdf
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import JobSheetRow, compute_job_id


def test_idempotent_upsert_and_deduplication(tmp_path: Path):
    state_file = tmp_path / "test_state.json"
    client = GoogleSheetsClient(state_file=state_file)

    initial_ids = client.get_existing_job_ids()
    assert len(initial_ids) == 0

    job_id = compute_job_id("Acme Corp", "Platform Engineer")
    row_v1 = JobSheetRow(
        job_id=job_id,
        company_name="Acme Corp",
        role_title="Platform Engineer",
        initial_match_score=64,
        passed_gate=True,
        gap_analysis="Strong in Python and Docker",
        status="Tailored & Ready",
    )
    client.upsert_job_row(row_v1)
    count_after_insert = len(client.get_all_jobs())

    # Re-upserting the same job_id must update in-place without duplicating
    row_v2 = row_v1.model_copy(update={"status": "Applied"})
    client.upsert_job_row(row_v2)
    count_after_second_upsert = len(client.get_all_jobs())

    assert count_after_insert == count_after_second_upsert
    fetched = client.get_job_by_id(job_id)
    assert fetched is not None
    assert fetched.status == "Applied"


def test_render_markdown_to_pdf():
    sample_md = "# Test Candidate\n## Experience\n* Built scalable Python APIs reducing latency by 40%."
    pdf_path = render_markdown_to_pdf(sample_md, "unit_test_resume.pdf")
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 200

