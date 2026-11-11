import json
from job_agent.config import settings
from job_agent.integrations.jsearch_client import (
    JSearchProvider,
    detect_application_method,
    infer_source_platform,
)
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ExtractedJobListing, compute_job_id


class Agent1Sourcing:
    """
    Agent 1: Sourcing & Pre-Filtering Agent.
    Fetches raw job postings via JSearchProvider, normalizes via `gemini-2.5-flash` when API key is configured,
    and deduplicates against existing `Job ID` values in Google Sheets.
    """

    def __init__(self, sheets_client: GoogleSheetsClient | None = None) -> None:
        self.provider = JSearchProvider()
        self.sheets = sheets_client or GoogleSheetsClient()

    def _has_gemini_key(self) -> bool:
        return bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here")

    def extract_with_gemini_flash(self, listing: ExtractedJobListing) -> ExtractedJobListing:
        # Fallback heuristic normalization
        detected_method, detected_email = detect_application_method(
            url=listing.job_url, description=listing.raw_description
        )
        inferred_platform = listing.source_platform or infer_source_platform(
            url=listing.job_url
        )

        if not self._has_gemini_key():
            return listing.model_copy(
                update={
                    "source_platform": inferred_platform,
                    "application_method": detected_method,
                    "application_email": detected_email or listing.application_email,
                }
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.gemini_api_key)
            prompt = f"""
            Extract and refine structured metadata from this job listing.
            Pay special attention to:
            1. source_platform: One of "LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter", "Direct Career Site".
            2. application_method: Either "email_submission" (if the job asks applicants to email their resume/application to a specific email address) or "portal_submission" (if applying via a web portal, form, or ATS link).
            3. application_email: The exact recipient email address to send applications to, if application_method is "email_submission". If not an email application, set to null.
            4. sponsorship_explicitly_mentioned: Boolean whether visa/work sponsorship is explicitly mentioned.

            Company: {listing.company_name}
            Role: {listing.role_title}
            Location: {listing.location}
            URL: {listing.job_url}
            Platform Hint: {listing.source_platform}
            Current Method Hint: {listing.application_method}
            Description:
            {listing.raw_description}
            """
            resp = client.models.generate_content(
                model=settings.gemini_flash_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractedJobListing,
                    temperature=0.1,
                ),
            )
            parsed = json.loads(resp.text)
            parsed["job_id"] = compute_job_id(parsed.get("company_name", listing.company_name), parsed.get("role_title", listing.role_title))
            parsed["raw_description"] = listing.raw_description

            # Ensure valid platform and application method fallback
            if not parsed.get("source_platform"):
                parsed["source_platform"] = inferred_platform
            if not parsed.get("application_email") and detected_email:
                parsed["application_method"] = detected_method
                parsed["application_email"] = detected_email

            return ExtractedJobListing(**parsed)
        except Exception:
            return listing.model_copy(
                update={
                    "source_platform": inferred_platform,
                    "application_method": detected_method,
                    "application_email": detected_email or listing.application_email,
                }
            )

    def run(
        self,
        roles: list[str] | None = None,
        location: str = "Remote",
        remote_only: bool = True,
        limit: int = 10,
    ) -> tuple[list[ExtractedJobListing], list[ExtractedJobListing]]:
        target_roles = roles or [
            "Software Engineer",
            "Mobile Engineer",
            "Frontend Engineer",
            "DevOps Engineer",
        ]
        raw_jobs = self.provider.fetch_jobs(
            roles=target_roles, location=location, remote_only=remote_only, limit=limit
        )
        existing_ids = self.sheets.get_existing_job_ids()
        normalized: list[ExtractedJobListing] = []
        new_jobs: list[ExtractedJobListing] = []

        for job in raw_jobs:
            extracted = self.extract_with_gemini_flash(job)
            normalized.append(extracted)
            if extracted.job_id not in existing_ids:
                new_jobs.append(extracted)

        return normalized, new_jobs

