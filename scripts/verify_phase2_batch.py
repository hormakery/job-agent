"""
Phase 2 Batch Verification Script (`scripts/verify_phase2_batch.py`)
Runs 20 raw job listings across Software, Mobile, Frontend, and DevOps roles through
Agent 1 and Agent 2 to verify that the >= 50% Local ATS Gatekeeper operates properly.
"""

from pathlib import Path
import tempfile
from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing


BATCH_20_JOBS = [
    ("Stripe", "Senior Mobile Engineer", "React Native, TypeScript, GraphQL, REST, mobile payments, CI/CD."),
    ("Apple", "iOS Kernel C++ & SwiftUI Engineer", "Low-level Swift, SwiftUI, C++, Rust kernel drivers."),
    ("Vercel", "Senior Next.js & Frontend Engineer", "React, Next.js, TypeScript, Tailwind CSS, Node.js, cloud deployment."),
    ("Datadog", "Cloud Deployment & DevOps Engineer", "Python, Docker, Kubernetes, Terraform, AWS, GitHub Actions CI/CD."),
    ("Linear", "Product Full-Stack Engineer", "TypeScript, React, Node.js, GraphQL, PostgreSQL, scalable APIs."),
    ("Anthropic", "Full-Stack AI Systems Engineer", "Python, FastAPI, TypeScript, React, Next.js, LangGraph, Docker."),
    ("Shopify", "React Native Mobile Platform Engineer", "React Native, Expo, TypeScript, Redux, GraphQL, mobile CI/CD."),
    ("Snap Inc.", "Android Camera C++ & Kotlin NDK Engineer", "Requires 6+ years of C++, Kotlin, Vulkan, Android NDK."),
    ("Cloudflare", "Kubernetes Infrastructure & Deployment Engineer", "Python, Go, Docker, Kubernetes, Terraform, Linux, CI/CD."),
    ("Figma", "Frontend Systems Engineer", "TypeScript, React, Next.js, performant web architecture, REST."),
    ("Kraken", "Rust Low-Latency Core Matching Developer", "Requires 7+ years of Rust and C++ kernel bypass networking."),
    ("Airbnb", "Senior Frontend & Design Systems Engineer", "React, TypeScript, Next.js, Tailwind CSS, GraphQL."),
    ("Uber", "Mobile React Native & Cross-Platform Engineer", "React Native, TypeScript, mobile architecture, REST, gRPC."),
    ("Lockheed", "Embedded Ada & C++ Avionics Engineer", "Requires Secret clearance, C++, Ada, FPGA, RTOS."),
    ("Supabase", "Full-Stack PostgreSQL & TypeScript Engineer", "PostgreSQL, SQL, TypeScript, React, Next.js, Docker."),
    ("GitLab", "Senior CI/CD & Cloud Deployment Engineer", "Docker, Kubernetes, Terraform, AWS, GCP, CI/CD pipelines."),
    ("Discord", "React Native Mobile Client Engineer", "React Native, TypeScript, Redux, iOS/Android performance."),
    ("Nvidia", "CUDA C++ GPU Compiler Engineer", "Requires PhD or 8+ years in C++, LLVM, CUDA, Rust."),
    ("Notion", "Product Engineer (React & TypeScript)", "TypeScript, React, Next.js, Node.js, PostgreSQL, Redis."),
    ("HashiCorp", "Cloud Infrastructure & Terraform Engineer", "Go, Python, Terraform, Docker, Kubernetes, AWS, GCP."),
]


def main() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        sheets = GoogleSheetsClient(state_file=Path(tmpdir) / "batch20_state.json")
        agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)

        passed_count = 0
        skipped_count = 0
        print("=" * 80)
        print("PHASE 2 BATCH VERIFICATION: 20 JOB LISTINGS THROUGH LOCAL ATS >=50% GATE")
        print("=" * 80)

        for idx, (company, role, desc) in enumerate(BATCH_20_JOBS, start=1):
            listing = ExtractedJobListing(
                company_name=company,
                role_title=role,
                location="Remote",
                is_remote=True,
                job_url=f"https://example.com/jobs/{idx}",
                raw_description=desc,
            )
            row = agent2.process_job(listing)
            if row.passed_gate:
                passed_count += 1
            else:
                skipped_count += 1
            print(
                f"[{idx:02d}/20] {company:<12} | {role:<45} | Score: {row.initial_match_score:>2d}% | "
                f"Gate: {'PASS' if row.passed_gate else 'SKIP'} | Status: {row.status}"
            )

        print("-" * 80)
        print(f"Batch Complete: {passed_count} Passed (>=50% Tailored & PDF Ready), {skipped_count} Skipped (<50% Gate)")
        assert passed_count > 0 and skipped_count > 0, "Expected both passing and skipped jobs in 20-job batch"


if __name__ == "__main__":
    main()

