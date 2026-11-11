import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from job_agent.agents.agent2_tailor import Agent2GatekeeperAndTailor
from job_agent.agents.agent4_calendar import Agent4CalendarCoordinator
from job_agent.config import settings
from job_agent.integrations.ats_adapter import ATSCheckerAdapter
from job_agent.integrations.calendar_client import GoogleCalendarClient
from job_agent.integrations.drive_client import GoogleDriveClient
from job_agent.integrations.gmail_client import GmailClient
from job_agent.integrations.google_auth import (
    disconnect_google_account,
    exchange_code_for_token,
    generate_authorization_url,
    get_google_auth_status,
)
from job_agent.integrations.jsearch_client import JSearchProvider
from job_agent.integrations.pdf_renderer import render_markdown_to_pdf
from job_agent.integrations.sheets_client import GoogleSheetsClient
from job_agent.models.schemas import ApplicationStatus, CandidateProfile, ExtractedJobListing
from job_agent.workflows.inbox_graph import run_inbox_and_calendar_workflow
from job_agent.workflows.sourcing_graph import run_sourcing_and_tailoring_workflow

app = FastAPI(
    title="JobAgent OS Backend API",
    version="2.0.0",
    description="FastAPI Backend coordinating Agents 1-4, Local ATS Checker, Google Workspace, and Web HITL.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StatusUpdateRequest(BaseModel):
    status: ApplicationStatus
    interview_date: Optional[str] = None
    date_applied: Optional[str] = None


class SourceWorkflowRequest(BaseModel):
    roles: list[str] = [
        "Software Engineer",
        "Mobile Engineer",
        "Frontend Engineer",
        "DevOps Engineer",
    ]
    location: str = "Remote"
    remote_only: bool = True
    max_jobs: int = 6


class ATSEvaluateRequest(BaseModel):
    job_description: str
    master_resume: Optional[str] = None


class MasterResumeUpdateRequest(BaseModel):
    content: str


class InterviewConfirmRequest(BaseModel):
    slot_id: str
    custom_draft_reply: Optional[str] = None


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class GoogleClientSecretRequest(BaseModel):
    client_id: str
    client_secret: str


@app.get("/api/health")
def get_health() -> dict:
    sheets = GoogleSheetsClient()
    drive = GoogleDriveClient()
    gmail = GmailClient()
    cal = GoogleCalendarClient()
    jsearch = JSearchProvider()
    ats = ATSCheckerAdapter()
    ats_health = ats.check_health()
    has_gemini = bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here")

    return {
        "status": "ok",
        "ats_threshold": settings.ats_match_threshold,
        "integrations": {
            "local_ats_checker": {
                "connected": ats_health["connected"] or Path(settings.ats_local_repo_path).exists(),
                "mode": ats_health["mode"],
                "service": ats_health["service"],
                "endpoint_or_path": ats_health["endpoint"],
                "latency_ms": ats_health["latency_ms"],
            },
            "gemini_llm": {
                "connected": has_gemini,
                "models": [settings.gemini_flash_model, settings.gemini_pro_model],
            },
            "google_sheets": {
                "connected": sheets.is_google_sheets_connected(),
                "mode": "gspread_live" if sheets.is_google_sheets_connected() else "unconnected",
            },
            "google_drive": {
                "connected": drive.is_configured(),
                "mode": "drive_api" if drive.is_configured() else "local_pdf_server",
            },
            "jsearch_api": {
                "connected": jsearch.is_configured(),
                "mode": "rapidapi_live" if jsearch.is_configured() else "curated_feed_active",
            },
            "gmail_api": {"connected": gmail.is_configured()},
            "google_calendar": {"connected": cal.is_configured()},
        },
    }


# Google Workspace OAuth2 Endpoints
@app.get("/api/auth/google/url")
def get_google_auth_url(redirect_uri: Optional[str] = None) -> dict:
    redir = redirect_uri or f"{settings.frontend_url}/settings"
    try:
        url, state = generate_authorization_url(redirect_uri=redir)
        return {"url": url, "state": state, "redirect_uri": redir}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/google/callback")
def handle_google_callback(payload: GoogleCallbackRequest) -> dict:
    redir = payload.redirect_uri or f"{settings.frontend_url}/settings"
    try:
        result = exchange_code_for_token(code=payload.code, redirect_uri=redir)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth exchange failed: {e}")


@app.get("/api/auth/google/status")
def get_google_status() -> dict:
    return get_google_auth_status()


@app.post("/api/auth/google/disconnect")
def handle_google_disconnect() -> dict:
    return disconnect_google_account()


@app.post("/api/auth/google/client-secret")
def update_google_client_secret(payload: GoogleClientSecretRequest) -> dict:
    cs_path = Path(settings.google_oauth_credentials_file)
    cs_path.parent.mkdir(parents=True, exist_ok=True)
    client_data = {
        "web": {
            "client_id": payload.client_id,
            "client_secret": payload.client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [f"{settings.frontend_url}/settings"],
        }
    }
    cs_path.write_text(json.dumps(client_data, indent=2), encoding="utf-8")
    return {"saved": True, "path": str(cs_path)}


@app.post("/api/google/sheets/sync-all")
def trigger_google_sheets_sync_all() -> dict:
    sheets = GoogleSheetsClient()
    if not sheets.is_google_sheets_connected():
        raise HTTPException(status_code=400, detail="Google Sheets not connected or GOOGLE_SHEET_ID not set.")
    count = sheets.sync_all_jobs_to_gspread()
    return {"synced_count": count, "sheet_id": settings.google_sheet_id}


# Candidate Profile Endpoints
@app.get("/api/candidate-profile")
def get_candidate_profile() -> dict:
    if settings.candidate_profile_file.exists():
        try:
            return json.loads(settings.candidate_profile_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    profile = CandidateProfile(
        full_name=settings.candidate_name,
        email=settings.candidate_email,
        phone=settings.candidate_phone,
        linkedin_url=settings.candidate_linkedin_url,
        github_url=settings.candidate_github_url,
        portfolio_url=settings.candidate_portfolio_url,
        location=settings.candidate_location,
    )
    return profile.model_dump()


@app.put("/api/candidate-profile")
def update_candidate_profile(profile: CandidateProfile) -> dict:
    settings.candidate_profile_file.parent.mkdir(parents=True, exist_ok=True)
    settings.candidate_profile_file.write_text(json.dumps(profile.model_dump(), indent=2), encoding="utf-8")
    return profile.model_dump()


@app.get("/api/dashboard/stats")
def get_dashboard_stats() -> dict:
    sheets = GoogleSheetsClient()
    return sheets.get_dashboard_stats().model_dump()


@app.get("/api/jobs")
def list_jobs(
    status: Optional[str] = None,
    passed_gate: Optional[bool] = None,
    search: Optional[str] = None,
) -> list[dict]:
    sheets = GoogleSheetsClient()
    return [r.model_dump() for r in sheets.get_all_jobs(status=status, passed_gate=passed_gate, search=search)]


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    sheets = GoogleSheetsClient()
    job = sheets.get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.model_dump()


@app.patch("/api/jobs/{job_id}/status")
def update_job_status(job_id: str, payload: StatusUpdateRequest) -> dict:
    sheets = GoogleSheetsClient()
    updated = sheets.update_job_status(
        job_id=job_id,
        status=payload.status,
        interview_date=payload.interview_date,
        date_applied=payload.date_applied,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Job not found")
    return updated.model_dump()


@app.get("/api/applications")
def list_applications() -> list[dict]:
    sheets = GoogleSheetsClient()
    return [a.model_dump() for a in sheets.get_applications()]


@app.post("/api/workflows/source")
def trigger_sourcing_workflow(payload: SourceWorkflowRequest) -> dict:
    result = run_sourcing_and_tailoring_workflow(
        roles=payload.roles,
        location=payload.location,
        remote_only=payload.remote_only,
        max_jobs=payload.max_jobs,
    )
    return {
        "logs": result.get("logs", []),
        "processed_count": len(result.get("processed_rows", [])),
        "processed_rows": [r.model_dump() for r in result.get("processed_rows", [])],
    }


@app.get("/api/workflows/stream")
async def stream_workflow_events() -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        state = run_sourcing_and_tailoring_workflow(max_jobs=6)
        for line in state.get("logs", []):
            payload = json.dumps({"event": "agent_log", "message": line})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.05)
        yield f"data: {json.dumps({'event': 'completed', 'count': len(state.get('processed_rows', []))})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/ats/health")
def get_ats_health() -> dict:
    ats = ATSCheckerAdapter()
    return ats.check_health()


@app.post("/api/ats/evaluate")
def evaluate_with_local_ats(payload: ATSEvaluateRequest) -> dict:
    agent2 = Agent2GatekeeperAndTailor()
    resume_text = payload.master_resume or agent2.load_master_resume()
    ats = ATSCheckerAdapter()
    evaluation = ats.evaluate(master_resume=resume_text, job_description=payload.job_description)
    return evaluation.model_dump()


@app.post("/api/resumes/{job_id}/tailor")
def tailor_specific_job(job_id: str) -> dict:
    sheets = GoogleSheetsClient()
    job_row = sheets.get_job_by_id(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")

    listing = ExtractedJobListing(
        job_id=job_row.job_id,
        company_name=job_row.company_name,
        role_title=job_row.role_title,
        source_platform=job_row.source_platform,
        location=job_row.location,
        is_remote=job_row.is_remote,
        sponsorship_explicitly_mentioned=job_row.sponsorship_explicitly_mentioned,
        job_url=job_row.job_url,
        raw_description=job_row.raw_description,
        application_method=job_row.submission_method,
        application_email=job_row.application_email,
    )
    agent2 = Agent2GatekeeperAndTailor(sheets_client=sheets)
    updated_row = agent2.process_job(listing, force_tailor=True)
    return updated_row.model_dump()


@app.get("/api/resumes/{job_id}/preview")
def get_tailored_resume_preview(job_id: str) -> dict:
    sheets = GoogleSheetsClient()
    job_row = sheets.get_job_by_id(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_row.job_id,
        "company_name": job_row.company_name,
        "role_title": job_row.role_title,
        "passed_gate": job_row.passed_gate,
        "initial_match_score": job_row.initial_match_score,
        "tailored_markdown": job_row.tailored_markdown,
        "pdf_url": f"http://localhost:{settings.backend_port}/api/resumes/{job_row.job_id}/pdf",
        "drive_link": job_row.tailored_resume_link,
    }


@app.get("/api/resumes/{job_id}/pdf")
def serve_tailored_pdf(job_id: str):
    sheets = GoogleSheetsClient()
    job_row = sheets.get_job_by_id(job_id)
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")

    if job_row.local_pdf_path and Path(job_row.local_pdf_path).exists():
        pdf_path = Path(job_row.local_pdf_path)
    else:
        md_content = job_row.tailored_markdown or Agent2GatekeeperAndTailor().load_master_resume()
        pdf_path = render_markdown_to_pdf(
            md_content, f"{job_row.company_name}_{job_row.role_title}_{job_row.job_id}.pdf"
        )
        job_row.local_pdf_path = str(pdf_path)
        sheets.upsert_job_row(job_row)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@app.get("/api/master-resume")
def get_master_resume() -> dict:
    agent2 = Agent2GatekeeperAndTailor()
    return {
        "path": str(settings.master_resume_path),
        "content": agent2.load_master_resume(),
    }


@app.put("/api/master-resume")
def update_master_resume(payload: MasterResumeUpdateRequest) -> dict:
    settings.master_resume_path.parent.mkdir(parents=True, exist_ok=True)
    settings.master_resume_path.write_text(payload.content, encoding="utf-8")
    return {"saved": True, "path": str(settings.master_resume_path)}


@app.post("/api/workflows/inbox-sync")
def trigger_inbox_sync() -> dict:
    state = run_inbox_and_calendar_workflow()
    return {
        "logs": state.get("logs", []),
        "emails": [e.model_dump() for e in state.get("classified_emails", [])],
        "interviews": [i.model_dump() for i in state.get("interview_items", [])],
    }


@app.get("/api/inbox/threads")
def get_inbox_threads() -> dict:
    sheets = GoogleSheetsClient()
    return {
        "emails": [e.model_dump() for e in sheets.get_emails()],
        "interviews": [i.model_dump() for i in sheets.get_interviews()],
    }


@app.get("/api/interviews/{job_id}/slots")
def get_interview_slots(job_id: str) -> dict:
    sheets = GoogleSheetsClient()
    item = sheets.get_interview_by_job_id(job_id)
    if not item:
        raise HTTPException(status_code=404, detail="Interview coordination item not found")
    return item.model_dump()


@app.post("/api/interviews/{job_id}/confirm")
def confirm_interview_slot(job_id: str, payload: InterviewConfirmRequest) -> dict:
    agent4 = Agent4CalendarCoordinator()
    try:
        return agent4.confirm_slot_and_send_reply(
            job_id=job_id,
            slot_id=payload.slot_id,
            custom_draft_reply=payload.custom_draft_reply,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
