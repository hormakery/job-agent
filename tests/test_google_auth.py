import json
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from job_agent.api.server import app
from job_agent.integrations.drive_client import GoogleDriveClient
from job_agent.integrations.google_auth import (
    GOOGLE_SCOPES,
    disconnect_google_account,
    generate_authorization_url,
    get_google_auth_status,
    get_google_credentials,
)
from job_agent.integrations.sheets_client import GoogleSheetsClient


def test_google_auth_status_initially_disconnected():
    client = TestClient(app)
    res = client.get("/api/auth/google/status")
    assert res.status_code == 200
    data = res.json()
    assert "connected" in data
    assert "mode" in data
    assert "has_client_secret" in data


def test_google_oauth_url_generation(tmp_path: Path):
    client = TestClient(app)

    # Save mock client credentials
    res = client.post(
        "/api/auth/google/client-secret",
        json={
            "client_id": "test-client-123.apps.googleusercontent.com",
            "client_secret": "test-secret-456",
        },
    )
    assert res.status_code == 200

    # Request authorization URL
    url_res = client.get("/api/auth/google/url?redirect_uri=http://localhost:3001/settings")
    assert url_res.status_code == 200
    payload = url_res.json()
    assert "url" in payload
    assert "accounts.google.com" in payload["url"]
    assert "client_id=test-client-123.apps.googleusercontent.com" in payload["url"]
    assert "access_type=offline" in payload["url"]

    # Verify disconnect clears token
    disc = client.post("/api/auth/google/disconnect")
    assert disc.status_code == 200
    assert disc.json()["connected"] is False


def test_google_credentials_mock_token(tmp_path: Path):
    mock_token_path = tmp_path / "mock_token.json"
    dummy_token = {
        "token": "ya29.mock_token",
        "refresh_token": "1//mock_refresh",
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": "mock_id",
        "client_secret": "mock_sec",
        "scopes": GOOGLE_SCOPES,
        "expiry": "2030-01-01T00:00:00Z",
    }
    mock_token_path.write_text(json.dumps(dummy_token), encoding="utf-8")

    with patch("job_agent.integrations.google_auth.settings.google_oauth_token_file", str(mock_token_path)):
        creds = get_google_credentials()
        assert creds is not None
        assert creds.refresh_token == "1//mock_refresh"

        status = get_google_auth_status()
        assert status["mode"] == "oauth2"

        sheets = GoogleSheetsClient()
        drive = GoogleDriveClient()
        assert drive.is_configured() is True
        # Sheets requires sheet_id to be set as well
        assert sheets.is_google_sheets_connected() is False
        with patch("job_agent.integrations.sheets_client.settings.google_sheet_id", "mock_sheet_123"):
            assert sheets.is_google_sheets_connected() is True
