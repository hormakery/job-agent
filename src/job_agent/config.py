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

    # 1. Gemini LLM Settings
    gemini_api_key: str = ""
    gemini_flash_model: str = "gemini-2.5-flash"
    gemini_pro_model: str = "gemini-2.5-pro"

    # 2. Job Sourcing (Agent 1 - JSearch)
    jsearch_rapidapi_key: str = ""
    jsearch_rapidapi_host: str = "jsearch.p.rapidapi.com"

    # 3. Existing Local ATS Checker Integration (Agent 2)
    ats_integration_mode: Literal[
        "python_import", "http_local", "cli_subprocess", "local_heuristic"
    ] = "local_heuristic"
    ats_local_repo_path: str = str(PROJECT_ROOT.parent / "ats-checker")
    ats_local_http_url: str = "http://127.0.0.1:8001/evaluate"
    ats_cli_command: str = ""
    ats_match_threshold: int = 50

    # 4. Google Workspace Settings
    google_service_account_file: str = str(PROJECT_ROOT / "credentials" / "service_account.json")
    google_oauth_credentials_file: str = str(PROJECT_ROOT / "credentials" / "client_secret.json")
    google_oauth_token_file: str = str(PROJECT_ROOT / "credentials" / "token.json")
    google_sheet_id: str = ""
    google_sheet_worksheet_name: str = "Applications"
    google_drive_resume_folder_id: str = ""

    # 5. Telegram HITL Settings (Agent 4)
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    # 6. Paths & Server Settings
    master_resume_path: Path = PROJECT_ROOT / "data" / "master_resume.md"
    output_resumes_dir: Path = PROJECT_ROOT / "output" / "resumes"
    local_state_file: Path = PROJECT_ROOT / "data" / "state_store.json"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8080
    frontend_url: str = "http://localhost:3000"


settings = Settings()

