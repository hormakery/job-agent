import logging
from pathlib import Path
from typing import Optional

from job_agent.config import settings
from job_agent.integrations.google_auth import get_google_credentials

logger = logging.getLogger(__name__)


class GoogleDriveClient:
    """
    Uploads rendered tailored resume PDFs to Google Drive and returns the webViewLink.
    When Drive credentials are not yet configured, returns the local FastAPI PDF preview URL.
    """

    def is_configured(self) -> bool:
        creds = get_google_credentials()
        return creds is not None

    def upload_resume_pdf(self, local_pdf_path: Path, job_id: str) -> str:
        fallback_url = f"http://localhost:{settings.backend_port}/api/resumes/{job_id}/pdf"
        if not self.is_configured():
            return fallback_url

        try:
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload

            creds = get_google_credentials()
            if not creds:
                return fallback_url

            service = build("drive", "v3", credentials=creds)
            file_metadata = {
                "name": local_pdf_path.name,
            }
            if settings.google_drive_resume_folder_id:
                file_metadata["parents"] = [settings.google_drive_resume_folder_id]

            media = MediaFileUpload(str(local_pdf_path), mimetype="application/pdf", resumable=True)
            uploaded = (
                service.files()
                .create(body=file_metadata, media_body=media, fields="id, webViewLink, webContentLink")
                .execute()
            )
            return uploaded.get("webViewLink", fallback_url)
        except Exception as e:
            logger.warning(f"Google Drive upload failed for {local_pdf_path.name}: {e}")
            return fallback_url
