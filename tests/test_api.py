from fastapi.testclient import TestClient
from job_agent.api.server import app


def test_all_spec_api_routes():
    client = TestClient(app)

    # 1. Health & Dashboard stats
    assert client.get("/api/health").status_code == 200
    stats = client.get("/api/dashboard/stats").json()
    assert "total_jobs_sourced" in stats

    # 2. Jobs listing & filtering
    jobs = client.get("/api/jobs").json()
    assert len(jobs) >= 1
    first_job_id = jobs[0]["job_id"]

    # 3. Single job & resume preview
    preview = client.get(f"/api/resumes/{first_job_id}/preview")
    assert preview.status_code == 200
    assert preview.json()["job_id"] == first_job_id

    # 4. Local ATS Checker sandbox endpoint
    ats_resp = client.post(
        "/api/ats/evaluate",
        json={
            "job_description": "Senior Software Engineer with Python, FastAPI, React, TypeScript, Next.js, Docker, AWS."
        },
    )
    assert ats_resp.status_code == 200
    assert ats_resp.json()["passed_threshold"] is True

    # 5. Master Resume GET
    mr = client.get("/api/master-resume")
    assert mr.status_code == 200
    assert "ALEX MERCER" in mr.json()["content"]

    # 6. Inbox threads & interview slots
    inbox = client.get("/api/inbox/threads")
    assert inbox.status_code == 200
    interviews = inbox.json()["interviews"]
    assert len(interviews) >= 1
    interview_job_id = interviews[0]["job_id"]

    slots = client.get(f"/api/interviews/{interview_job_id}/slots")
    assert slots.status_code == 200
    assert len(slots.json()["available_slots"]) >= 1

