from pathlib import Path
from job_agent.config import settings


class GoogleDriveClient:
    """
    Uploads rendered tailored resume PDFs to Google Drive and returns the webViewLink.
    When Drive credentials are not yet configured, returns the local FastAPI PDF preview URL.
    """

    def is_configured(self) -> bool:
        sa_path = Path(settings.google_service_account_file)
        return bool(settings.google_drive_resume_folder_id and sa_path.exists())

    def upload_resume_pdf(self, local_pdf_path: Path, job_id: str) -> str:
        if not self.is_configured():
            return f"http://localhost:{settings.backend_port}/api/resumes/{job_id}/pdf"

        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload

            scopes = ["https://www.googleapis.com/auth/drive.file"]
            creds = service_account.Credentials.from_service_account_file(
                settings.google_service_account_file, scopes=scopes
            )
            service = build("drive", "v3", credentials=creds)
            file_metadata = {
                "name": local_pdf_path.name,
                "parents": [settings.google_drive_resume_folder_id],
            }
            media = MediaFileUpload(str(local_pdf_path), mimetype="application/pdf")
            uploaded = (
                service.files()
                .create(body=file_metadata, media_body=media, fields="id, webViewLink")
                .execute()
            )
            return uploaded.get(
                "webViewLink", f"http://localhost:{settings.backend_port}/api/resumes/{job_id}/pdf"
            )
        except Exception:
            return f"http://localhost:{settings.backend_port}/api/resumes/{job_id}/pdf"

