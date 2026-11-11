from fastapi.testclient import TestClient
from job_agent.api.server import app
from job_agent.integrations.ats_adapter import ATSCheckerAdapter
from job_agent.models.schemas import compute_job_id


def test_deterministic_job_id():
    id1 = compute_job_id("Stripe", "Senior Mobile Engineer")
    id2 = compute_job_id(" stripe ", "senior mobile engineer ")
    assert id1 == id2
    assert len(id1) == 12


def test_local_ats_adapter_gate_threshold():
    adapter = ATSCheckerAdapter(threshold=50)
    master = "Senior Engineer skilled in Python, FastAPI, TypeScript, React, Next.js, Docker, Kubernetes, AWS."

    strong_jd = "Looking for a Full-Stack Software Engineer with Python, FastAPI, React, TypeScript, Next.js, Docker, and AWS."
    high_eval = adapter.evaluate(master, strong_jd)
    assert high_eval.match_score >= 50
    assert high_eval.passed_threshold is True

    weak_jd = "Requires 6+ years of native iOS kernel development in Swift, SwiftUI, C++, and Rust."
    low_eval = adapter.evaluate("Junior HTML blogger", weak_jd)
    assert low_eval.match_score < 50
    assert low_eval.passed_threshold is False


def test_fastapi_endpoints():
    client = TestClient(app)

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    stats = client.get("/api/dashboard/stats")
    assert stats.status_code == 200
    assert "total_jobs_sourced" in stats.json()
    assert "application_drafted_count" in stats.json()

    jobs = client.get("/api/jobs")
    assert jobs.status_code == 200
    assert isinstance(jobs.json(), list)

