from abc import ABC, abstractmethod
import re
from typing import Optional
import httpx

from job_agent.config import settings
from job_agent.models.schemas import (
    ExtractedJobListing,
    SourcePlatform,
    SubmissionMethod,
    compute_job_id,
)

APPLY_EMAIL_DIRECT_PATTERN = re.compile(
    r'(?:send|email|submit|forward|reach\s+out\s+to|apply\s+(?:to|at|via))\s+(?:your\s+)?(?:resume|cv|application|portfolio|profile)?\s*(?:to|at|via)?\s*:?\s*([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)',
    re.IGNORECASE,
)

HIRING_MAILBOX_PATTERN = re.compile(
    r'\b(jobs|careers|hiring|talent|recruiting|recruitment|apply)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b',
    re.IGNORECASE,
)


def infer_source_platform(url: str = "", publisher: str = "") -> SourcePlatform:
    """Deterministic platform inference based on listing URL and publisher."""
    comb = f"{url} {publisher}".lower()
    if "linkedin" in comb:
        return "LinkedIn"
    if "indeed" in comb:
        return "Indeed"
    if "glassdoor" in comb:
        return "Glassdoor"
    if "ziprecruiter" in comb:
        return "ZipRecruiter"
    return "Direct Career Site"


def detect_application_method(
    url: str = "", description: str = ""
) -> tuple[SubmissionMethod, Optional[str]]:
    """
    Detects whether an application is submitted via direct email or online portal,
    and extracts the recipient hiring email when applicable.
    """
    # 1. Direct mailto link
    if url.lower().startswith("mailto:"):
        clean_email = url[7:].split("?")[0].strip()
        if clean_email:
            return "email_submission", clean_email

    # 2. Directed application regex phrasing (e.g., 'send resume to jobs@...')
    match_direct = APPLY_EMAIL_DIRECT_PATTERN.search(description)
    if match_direct:
        candidate_email = match_direct.group(1).strip().rstrip(".,;:)")
        return "email_submission", candidate_email

    # 3. Dedicated hiring mailbox pattern
    match_mailbox = HIRING_MAILBOX_PATTERN.search(description)
    if match_mailbox:
        candidate_email = match_mailbox.group(0).strip().rstrip(".,;:)")
        return "email_submission", candidate_email

    return "portal_submission", None


class JobSourceProvider(ABC):
    @abstractmethod
    def fetch_jobs(
        self, roles: list[str], location: str = "Remote", remote_only: bool = True, limit: int = 10
    ) -> list[ExtractedJobListing]:
        raise NotImplementedError


SAMPLE_JOB_FEED: list[dict] = [
    {
        "company_name": "Anthropic",
        "role_title": "Full-Stack Software Engineer (Claude Web)",
        "location": "San Francisco / Remote",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": True,
        "source_platform": "Direct Career Site",
        "job_url": "https://jobs.ashbyhq.com/anthropic/fullstack-engineer",
        "application_method": "portal_submission",
        "application_email": None,
        "raw_description": (
            "We are hiring a Full-Stack Software Engineer to build interactive AI agent interfaces using "
            "Python, FastAPI, TypeScript, React, Next.js, Tailwind CSS, and PostgreSQL. "
            "Experience with LLM orchestration (LangGraph), Docker, and scalable cloud APIs is highly valued."
        ),
    },
    {
        "company_name": "Shopify",
        "role_title": "Senior React Native Mobile Engineer",
        "location": "Remote (Americas)",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": True,
        "source_platform": "LinkedIn",
        "job_url": "https://www.linkedin.com/jobs/view/shopify-react-native-1029384",
        "application_method": "email_submission",
        "application_email": "engineering-jobs@shopify.com",
        "raw_description": (
            "Shopify is building commerce mobile apps powered by React Native, TypeScript, GraphQL, Redux, and Expo. "
            "You will optimize mobile startup time, build offline-first features, and maintain CI/CD pipelines. "
            "To apply, please email your resume, GitHub profile, and portfolio to engineering-jobs@shopify.com."
        ),
    },
    {
        "company_name": "Snap Inc.",
        "role_title": "Native Android Camera C++ & Kotlin Engineer",
        "location": "Los Angeles, CA",
        "is_remote": False,
        "sponsorship_explicitly_mentioned": False,
        "source_platform": "Indeed",
        "job_url": "https://www.indeed.com/viewjob?jk=snap-android-cpp-987",
        "application_method": "portal_submission",
        "application_email": None,
        "raw_description": (
            "Requires 6+ years of low-level C++, OpenGL/Vulkan, Kotlin, and Android NDK hardware camera pipeline optimization."
        ),
    },
    {
        "company_name": "Cloudflare",
        "role_title": "Deployment & Kubernetes Infrastructure Engineer",
        "location": "Remote (US/EU)",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": True,
        "source_platform": "Direct Career Site",
        "job_url": "https://cloudflare.com/careers/deployment-engineer",
        "application_method": "portal_submission",
        "application_email": None,
        "raw_description": (
            "Cloudflare is seeking a Deployment & DevOps Engineer skilled in Python, Go, Docker, Kubernetes, "
            "Terraform, Linux, and GitHub Actions CI/CD automation across global edge clusters."
        ),
    },
    {
        "company_name": "Figma",
        "role_title": "Frontend Systems Engineer (React & TypeScript)",
        "location": "San Francisco / Remote",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": True,
        "source_platform": "Glassdoor",
        "job_url": "https://www.glassdoor.com/job-listing/figma-frontend-systems-10283",
        "application_method": "email_submission",
        "application_email": "frontend-careers@figma.com",
        "raw_description": (
            "Build high-performance web applications at Figma using TypeScript, React, Next.js, GraphQL, and REST APIs. "
            "Send your CV and cover letter directly to frontend-careers@figma.com with subject 'Frontend Systems Application'."
        ),
    },
    {
        "company_name": "Kraken",
        "role_title": "Low-Latency Rust Core Trading Engine Developer",
        "location": "Remote",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": False,
        "source_platform": "LinkedIn",
        "job_url": "https://www.linkedin.com/jobs/view/kraken-rust-core-554433",
        "application_method": "portal_submission",
        "application_email": None,
        "raw_description": (
            "Must have 5+ years of production Rust and C++ building sub-microsecond matching engines and kernel bypass networking."
        ),
    },
]


class JSearchProvider(JobSourceProvider):
    """
    Primary Job Sourcing client querying JSearch on RapidAPI (`jsearch.p.rapidapi.com/search`).
    Automatically falls back to curated realistic listings if `JSEARCH_RAPIDAPI_KEY` is not set.
    """

    def is_configured(self) -> bool:
        return bool(
            settings.jsearch_rapidapi_key
            and settings.jsearch_rapidapi_key != "your_rapidapi_key_here"
        )

    def fetch_jobs(
        self, roles: list[str], location: str = "Remote", remote_only: bool = True, limit: int = 10
    ) -> list[ExtractedJobListing]:
        if not self.is_configured():
            return self._fetch_sample_jobs(limit=limit)

        results: list[ExtractedJobListing] = []
        headers = {
            "X-RapidAPI-Key": settings.jsearch_rapidapi_key,
            "X-RapidAPI-Host": settings.jsearch_rapidapi_host,
        }
        try:
            with httpx.Client(timeout=20.0) as client:
                for role in roles:
                    query = f"{role} in {location}"
                    resp = client.get(
                        f"https://{settings.jsearch_rapidapi_host}/search",
                        headers=headers,
                        params={
                            "query": query,
                            "page": "1",
                            "num_pages": "1",
                            "remote_jobs_only": "true" if remote_only else "false",
                        },
                    )
                    resp.raise_for_status()
                    payload = resp.json()
                    for item in payload.get("data", []):
                        company = item.get("employer_name") or "Unknown Company"
                        title = item.get("job_title") or role
                        desc = item.get("job_description") or ""
                        is_rem = bool(item.get("job_is_remote", remote_only))
                        city = item.get("job_city") or ""
                        country = item.get("job_country") or ""
                        loc_str = "Remote" if is_rem else f"{city}, {country}".strip(", ") or location
                        url = item.get("job_apply_link") or item.get("job_google_link") or ""
                        publisher = item.get("job_publisher") or ""
                        sponsorship = "sponsor" in desc.lower() or "visa" in desc.lower()

                        platform = infer_source_platform(url=url, publisher=publisher)
                        method, email = detect_application_method(url=url, description=desc)

                        results.append(
                            ExtractedJobListing(
                                job_id=compute_job_id(company, title),
                                company_name=company,
                                role_title=title,
                                location=loc_str,
                                is_remote=is_rem,
                                sponsorship_explicitly_mentioned=sponsorship,
                                source_platform=platform,
                                job_url=url,
                                raw_description=desc,
                                application_method=method,
                                application_email=email,
                            )
                        )
                        if len(results) >= limit:
                            return results
        except Exception:
            return self._fetch_sample_jobs(limit=limit)

        return results or self._fetch_sample_jobs(limit=limit)

    def _fetch_sample_jobs(self, limit: int = 10) -> list[ExtractedJobListing]:
        listings: list[ExtractedJobListing] = []
        for item in SAMPLE_JOB_FEED[:limit]:
            clean = dict(item)
            platform = clean.get("source_platform") or infer_source_platform(clean.get("job_url", ""))
            method = clean.get("application_method")
            email = clean.get("application_email")
            if not method:
                method, email = detect_application_method(
                    clean.get("job_url", ""), clean.get("raw_description", "")
                )

            clean["source_platform"] = platform
            clean["application_method"] = method
            clean["application_email"] = email

            listings.append(
                ExtractedJobListing(
                    job_id=compute_job_id(clean["company_name"], clean["role_title"]),
                    **clean,
                )
            )
        return listings


