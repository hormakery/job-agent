from abc import ABC, abstractmethod
import httpx

from job_agent.config import settings
from job_agent.models.schemas import ExtractedJobListing, compute_job_id


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
        "job_url": "https://anthropic.com/careers/fullstack-engineer",
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
        "job_url": "https://shopify.com/careers/react-native-engineer",
        "raw_description": (
            "Shopify is building commerce mobile apps powered by React Native, TypeScript, GraphQL, Redux, and Expo. "
            "You will optimize mobile startup time, build offline-first features, and maintain CI/CD pipelines."
        ),
    },
    {
        "company_name": "Snap Inc.",
        "role_title": "Native Android Camera C++ & Kotlin Engineer",
        "location": "Los Angeles, CA",
        "is_remote": False,
        "sponsorship_explicitly_mentioned": False,
        "job_url": "https://careers.snap.com/android-cpp-engineer",
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
        "job_url": "https://cloudflare.com/careers/deployment-engineer",
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
        "job_url": "https://figma.com/careers/frontend-systems",
        "raw_description": (
            "Build high-performance web applications at Figma using TypeScript, React, Next.js, GraphQL, and REST APIs."
        ),
    },
    {
        "company_name": "Kraken",
        "role_title": "Low-Latency Rust Core Trading Engine Developer",
        "location": "Remote",
        "is_remote": True,
        "sponsorship_explicitly_mentioned": False,
        "job_url": "https://kraken.com/careers/rust-core",
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
                        sponsorship = "sponsor" in desc.lower() or "visa" in desc.lower()
                        results.append(
                            ExtractedJobListing(
                                job_id=compute_job_id(company, title),
                                company_name=company,
                                role_title=title,
                                location=loc_str,
                                is_remote=is_rem,
                                sponsorship_explicitly_mentioned=sponsorship,
                                job_url=url,
                                raw_description=desc,
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
            listings.append(
                ExtractedJobListing(
                    job_id=compute_job_id(item["company_name"], item["role_title"]),
                    **item,
                )
            )
        return listings

