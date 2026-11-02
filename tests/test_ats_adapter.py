from job_agent.integrations.ats_adapter import ATSCheckerAdapter
from job_agent.models.schemas import compute_job_id


def test_compute_job_id_is_deterministic():
    id_a = compute_job_id("Stripe", "Senior Mobile Engineer")
    id_b = compute_job_id("  STRIPE ", "senior mobile engineer")
    assert id_a == id_b
    assert len(id_a) == 12


def test_normalize_payload_boundary_scores():
    adapter = ATSCheckerAdapter(threshold=50)

    eval_49 = adapter._normalize_payload(
        {"match_score": 49, "missing_critical_skills": ["Swift"], "matched_skills": ["React Native"]},
        source="unit_test",
    )
    assert eval_49.match_score == 49
    assert eval_49.passed_threshold is False
    assert "Swift" in eval_49.missing_critical_skills

    eval_50 = adapter._normalize_payload(
        {"match_score": 50, "missing_critical_skills": [], "matched_skills": ["Python", "FastAPI"]},
        source="unit_test",
    )
    assert eval_50.match_score == 50
    assert eval_50.passed_threshold is True

    eval_75 = adapter._normalize_payload(
        {"match_score": 75, "missing_critical_skills": [], "matched_skills": ["TypeScript", "Next.js"]},
        source="unit_test",
    )
    assert eval_75.match_score == 75
    assert eval_75.passed_threshold is True


def test_local_ats_evaluate_pass_and_fail():
    adapter = ATSCheckerAdapter(threshold=50)
    master = (
        "Senior Software Engineer experienced in Python, FastAPI, TypeScript, React, Next.js, "
        "Docker, Kubernetes, AWS, CI/CD, PostgreSQL, and microservices architecture."
    )
    passing_jd = (
        "Hiring a Senior Software Engineer to build cloud APIs and web interfaces using "
        "Python, FastAPI, TypeScript, React, Next.js, PostgreSQL, Docker, and AWS."
    )
    failing_jd = (
        "Hiring an Embedded Kernel Developer with 8+ years of C++, Rust, Swift, and SwiftUI."
    )

    pass_res = adapter.evaluate(master, passing_jd)
    assert pass_res.match_score >= 50
    assert pass_res.passed_threshold is True

    fail_res = adapter.evaluate("Entry level graphic designer", failing_jd)
    assert fail_res.match_score < 50
    assert fail_res.passed_threshold is False

