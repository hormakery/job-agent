import json
import logging
from pathlib import Path
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from job_agent.config import settings

logger = logging.getLogger(__name__)

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def get_client_config(redirect_uri: Optional[str] = None) -> Optional[dict]:
    """
    Returns the Google OAuth client config dict from credentials/client_secret.json
    or falls back to GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment settings.
    """
    client_secret_path = Path(settings.google_oauth_credentials_file)
    if client_secret_path.exists():
        try:
            data = json.loads(client_secret_path.read_text(encoding="utf-8"))
            return data
        except Exception as e:
            logger.warning(f"Failed to read {client_secret_path}: {e}")

    # Fallback to env vars
    if settings.google_client_id and settings.google_client_secret:
        redir = redirect_uri or f"{settings.frontend_url}/settings"
        return {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redir],
            }
        }

    return None


def has_client_credentials() -> bool:
    """Checks whether OAuth client credentials (file or env) are available."""
    return get_client_config() is not None


def generate_authorization_url(redirect_uri: str, state: Optional[str] = None) -> tuple[str, str]:
    """
    Constructs Google OAuth authorization URL requesting full offline access
    and refresh tokens.
    """
    client_config = get_client_config(redirect_uri=redirect_uri)
    if not client_config:
        raise ValueError(
            "Google OAuth client credentials not found. Provide credentials/client_secret.json "
            "or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env."
        )

    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=redirect_uri,
    )
    auth_url, flow_state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return auth_url, flow_state


def exchange_code_for_token(code: str, redirect_uri: str) -> dict:
    """
    Exchanges authorization code from Google OAuth callback for access + refresh tokens,
    persisting them safely to `credentials/token.json`.
    """
    client_config = get_client_config(redirect_uri=redirect_uri)
    if not client_config:
        raise ValueError("Google OAuth client configuration missing during token exchange.")

    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=redirect_uri,
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    token_path = Path(settings.google_oauth_token_file)
    token_path.parent.mkdir(parents=True, exist_ok=True)
    token_path.write_text(creds.to_json(), encoding="utf-8")

    email = _fetch_authenticated_email(creds)
    return {
        "connected": True,
        "email": email,
        "scopes": list(creds.scopes or GOOGLE_SCOPES),
    }


def get_google_credentials() -> Optional[Credentials]:
    """
    Returns valid Google credentials:
    1. First tries OAuth user token (`credentials/token.json`), refreshing if expired.
    2. Falls back to Service Account (`credentials/service_account.json`) if available.
    3. Returns None if unauthenticated.
    """
    token_path = Path(settings.google_oauth_token_file)
    if token_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(token_path), scopes=GOOGLE_SCOPES)
            if creds:
                if creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                        token_path.write_text(creds.to_json(), encoding="utf-8")
                    except Exception as refresh_err:
                        logger.warning(f"Could not refresh token: {refresh_err}")
                return creds
        except Exception as e:
            logger.warning(f"Error loading or refreshing OAuth token from {token_path}: {e}")

    sa_path = Path(settings.google_service_account_file)
    if sa_path.exists():
        try:
            return service_account.Credentials.from_service_account_file(
                str(sa_path), scopes=GOOGLE_SCOPES
            )
        except Exception as e:
            logger.warning(f"Error loading service account credentials: {e}")

    return None


def get_google_auth_status() -> dict:
    """Returns current Google Workspace authentication and integration status."""
    has_client = has_client_credentials()
    token_path = Path(settings.google_oauth_token_file)
    sa_path = Path(settings.google_service_account_file)

    if token_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(token_path), scopes=GOOGLE_SCOPES)
            if creds:
                if creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                        token_path.write_text(creds.to_json(), encoding="utf-8")
                    except Exception:
                        pass
                email = _fetch_authenticated_email(creds)
                return {
                    "connected": creds.valid,
                    "mode": "oauth2",
                    "email": email,
                    "scopes": list(creds.scopes or GOOGLE_SCOPES),
                    "has_client_secret": has_client,
                    "sheet_id": settings.google_sheet_id or None,
                    "drive_folder_id": settings.google_drive_resume_folder_id or None,
                }
        except Exception:
            pass

    if sa_path.exists():
        try:
            creds = service_account.Credentials.from_service_account_file(
                str(sa_path), scopes=GOOGLE_SCOPES
            )
            return {
                "connected": True,
                "mode": "service_account",
                "email": getattr(creds, "service_account_email", "service-account@google"),
                "scopes": list(GOOGLE_SCOPES),
                "has_client_secret": has_client,
                "sheet_id": settings.google_sheet_id or None,
                "drive_folder_id": settings.google_drive_resume_folder_id or None,
            }
        except Exception:
            pass

    return {
        "connected": False,
        "mode": "disconnected",
        "email": None,
        "scopes": [],
        "has_client_secret": has_client,
        "sheet_id": settings.google_sheet_id or None,
        "drive_folder_id": settings.google_drive_resume_folder_id or None,
    }


def disconnect_google_account() -> dict:
    """Removes stored OAuth credentials from disk."""
    token_path = Path(settings.google_oauth_token_file)
    if token_path.exists():
        try:
            token_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete {token_path}: {e}")
    return {"connected": False, "disconnected": True}


def _fetch_authenticated_email(creds: Credentials) -> str:
    """Attempts to discover user's email from ID token or userinfo API."""
    if hasattr(creds, "id_token") and isinstance(creds.id_token, dict):
        email = creds.id_token.get("email")
        if email:
            return email

    try:
        import httpx

        headers = {"Authorization": f"Bearer {creds.token}"}
        resp = httpx.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers, timeout=5.0)
        if resp.status_code == 200:
            return resp.json().get("email", "connected-user@gmail.com")
    except Exception:
        pass

    return "connected-user@gmail.com"
