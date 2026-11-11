from fastapi.testclient import TestClient
from job_agent.api.server import app


def test_all_spec_api_routes():
    client = TestClient(app)

    # 1. Health & Dashboard stats
    assert client.get("/api/health").status_code == 200
    stats = client.get("/api/dashboard/stats").json()
    assert "total_jobs_sourced" in stats
    assert "application_drafted_count" in stats

    # 2. Candidate Profile GET and PUT
    prof_res = client.get("/api/candidate-profile")
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert "linkedin_url" in prof
    assert "email" in prof

    # 3. Jobs listing & filtering (empty initial state)
    jobs = client.get("/api/jobs").json()
    assert isinstance(jobs, list)

    # 4. Applications listing
    apps = client.get("/api/applications").json()
    assert isinstance(apps, list)

    # 5. Local ATS Checker sandbox endpoint
    ats_resp = client.post(
        "/api/ats/evaluate",
        json={
            "job_description": "Senior Software Engineer with Python, FastAPI, React, TypeScript, Next.js, Docker, AWS."
        },
    )
    assert ats_resp.status_code == 200
    assert ats_resp.json()["passed_threshold"] is True

    # 6. Master Resume GET
    mr = client.get("/api/master-resume")
    assert mr.status_code == 200
    assert "ALEX MERCER" in mr.json()["content"]

    # 7. Inbox threads
    inbox = client.get("/api/inbox/threads")
    assert inbox.status_code == 200
    assert "emails" in inbox.json()
    assert "interviews" in inbox.json()

