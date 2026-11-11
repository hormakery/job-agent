from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 1. Candidate Profile Settings
    candidate_name: str = "Alex Mercer"
    candidate_email: str = "alex.mercer@example.com"
    candidate_phone: str = "+1 (555) 019-2834"
    candidate_linkedin_url: str = "https://linkedin.com/in/alexmercer"
    candidate_github_url: str = "https://github.com/alexmercer"
    candidate_portfolio_url: str = "https://alexmercer.dev"
    candidate_location: str = "San Francisco, CA (Open to Remote)"

    # 2. Gemini LLM Settings
    gemini_api_key: str = ""
    gemini_flash_model: str = "gemini-2.5-flash"
    gemini_pro_model: str = "gemini-2.5-pro"

    # 3. Job Sourcing (Agent 1 - JSearch on RapidAPI)
    jsearch_rapidapi_key: str = ""
    jsearch_rapidapi_host: str = "jsearch.p.rapidapi.com"

    # 4. Existing Local ATS Checker Integration (Agent 2)
    ats_integration_mode: Literal[
        "http_local", "cli_subprocess", "python_import", "local_heuristic"
    ] = "http_local"
    ats_local_repo_path: str = str(PROJECT_ROOT.parent / "ATS-Checker")
    ats_local_http_url: str = "http://127.0.0.1:5000/api/scans/analyze"
    ats_cli_command: str = ""
    ats_match_threshold: int = 50

    # 5. Google Workspace Settings (OAuth2 + Sheets/Drive)
    google_service_account_file: str = str(PROJECT_ROOT / "credentials" / "service_account.json")
    google_oauth_credentials_file: str = str(PROJECT_ROOT / "credentials" / "client_secret.json")
    google_oauth_token_file: str = str(PROJECT_ROOT / "credentials" / "token.json")
    google_sheet_id: str = ""
    google_sheet_worksheet_name: str = "Applications"
    google_drive_resume_folder_id: str = ""

    # 6. File Paths & Server Settings
    master_resume_path: Path = PROJECT_ROOT / "data" / "master_resume.md"
    candidate_profile_file: Path = PROJECT_ROOT / "data" / "candidate_profile.json"
    output_resumes_dir: Path = PROJECT_ROOT / "output" / "resumes"
    local_state_file: Path = PROJECT_ROOT / "data" / "state_store.json"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8080
    frontend_url: str = "http://localhost:3001"


settings = Settings()
