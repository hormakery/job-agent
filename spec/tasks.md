# Phased Implementation Tasks (`tasks.md`)

> **Execution Guide:** Work through phases sequentially (Phase 0 $\rightarrow$ Phase 5). Mark tasks `[x]` as they are completed and verified against [`checklist.md`](./checklist.md).

---

## Phase 0: Project Bootstrap & Local ATS Checker Integration
**Goal:** Set up the Python package, configuration management, canonical Pydantic schemas, and bridge your existing local ATS checker.

- [x] **T0.1 — Initialize Python Project & Dependencies (`pyproject.toml`)**
  - Configure `pyproject.toml` with Python $\ge 3.11$ and core dependencies:
    - `google-genai`, `langgraph`, `fastapi`, `uvicorn[standard]`, `pydantic>=2.0`, `pydantic-settings`, `gspread`, `google-api-python-client`, `google-auth-httplib2`, `google-auth-oauthlib`, `python-telegram-bot`, `httpx`, `tenacity`, `markdown`, `fpdf2`.
  - Dev dependencies: `pytest`, `pytest-asyncio`, `ruff`.
- [x] **T0.2 — Environment Configuration (`src/job_agent/config.py` & `.env.example`)**
  - Create `Settings(BaseSettings)` managing Gemini, JSearch, Google Workspace, Local ATS Checker (`ATS_INTEGRATION_MODE`, `ATS_LOCAL_REPO_PATH`, `ATS_LOCAL_HTTP_URL`), and Telegram Bot settings.
- [x] **T0.3 — Core Pydantic Data Schemas (`src/job_agent/models/schemas.py`)**
  - Implement `ExtractedJobListing`, `MatchEvaluation`, `EmailClassification`, `CalendarSlot`, `DashboardStats`, and `JobSheetRow`.
  - Add deterministic `compute_job_id(company_name: str, role_title: str) -> str` helper.
- [x] **T0.4 — Local ATS Checker Bridge (`src/job_agent/integrations/ats_adapter.py`)**
  - Implement `ATSCheckerAdapter` supporting `python_import`, `http_local`, `cli_subprocess`, and built-in `local_heuristic` PRD scorer fallback.
- [x] **T0.5 — Phase 0 Unit Tests (`tests/test_ats_adapter.py`)**
  - Test `compute_job_id` determinism and boundary scores (`49%` $\rightarrow$ `False`, `50%` $\rightarrow$ `True`, `75%` $\rightarrow$ `True`).

---

## Phase 1: Data & Storage Setup (Google Sheets, Master Resume, PDF & Drive)
**Goal:** Build the centralized Google Sheets relational state store, Master Resume loader, Markdown-to-PDF renderer, and Google Drive uploader.

- [x] **T1.1 — Master Resume Setup (`data/master_resume.md`)**
  - Create structured Markdown template for the Master Resume (`data/master_resume.md`) and read/write helper utilities.
- [x] **T1.2 — Google Sheets State Client (`src/job_agent/integrations/sheets_client.py`)**
  - Implement `GoogleSheetsClient` using `gspread` + local JSON state mirror for instant UI responsiveness and idempotent `Job ID` upserts.
- [x] **T1.3 — Markdown-to-PDF Resume Renderer (`src/job_agent/integrations/pdf_renderer.py`)**
  - Implement `render_markdown_to_pdf(markdown_text: str, output_filename: str) -> Path` with clean, ATS-friendly typography.
- [x] **T1.4 — Google Drive Uploader (`src/job_agent/integrations/drive_client.py`)**
  - Implement `GoogleDriveClient.upload_resume_pdf(local_pdf_path: Path, job_id: str) -> str`.
- [x] **T1.5 — Phase 1 Unit & Integration Tests (`tests/test_sheets_client.py`)**
  - Test idempotent upserts, deduplication set lookup, and PDF generation from sample Markdown.

---

## Phase 2: Scraper & Evaluator/Tailor Agents (Agent 1 & Agent 2)
**Goal:** Implement Agent 1 (JSearch + `gemini-2.5-flash` extraction) and Agent 2 (Local ATS Checker Gatekeeper + `gemini-2.5-pro` Resume Tailor).

- [x] **T2.1 — Pluggable Job Source & JSearch Client (`src/job_agent/integrations/jsearch_client.py`)**
  - Define abstract `JobSourceProvider` and concrete `JSearchProvider` querying RapidAPI JSearch across target roles (`Software Engineer`, `Mobile Engineer`, `Frontend Engineer`, `DevOps / Deployment Engineer`).
- [x] **T2.2 — Agent 1: Sourcing & Pre-Filtering (`src/job_agent/agents/agent1_sourcing.py`)**
  - Pass raw job descriptions to `gemini-2.5-flash` with `response_schema=ExtractedJobListing` (`temperature=0.1`) and deduplicate against `GoogleSheetsClient.get_existing_job_ids()`.
- [x] **T2.3 — Agent 2: Local ATS Gatekeeper & Resume Tailor (`src/job_agent/agents/agent2_tailor.py`)**
  - Enforce $\ge 50\%$ Gate Check: skip `<50%` jobs (`Skipped (<50% Match)`); tailor `>=50%` jobs via `gemini-2.5-pro` (STAR method, zero fabrication), render PDF, upload to Drive, and log `Tailored & Ready`.
- [x] **T2.4 — Phase 2 Verification & Batch Test (`tests/test_agent1_sourcing.py`, `tests/test_agent2_tailor.py`, `scripts/verify_phase2_batch.py`)**
  - Unit tests verifying `gemini-2.5-pro` is never called when `match_score < 50`, plus 20-job batch verification script.

---

## Phase 3: Inbox Monitor & Calendar/Telegram HITL Agents (Agent 3 & Agent 4)
**Goal:** Implement Gmail thread monitoring & classification (Agent 3) and Google Calendar slot discovery + Web/Telegram approval workflow (Agent 4).

- [x] **T3.1 — Gmail API Client (`src/job_agent/integrations/gmail_client.py`)**
  - Fetch unread threads matching tracked company names from Google Sheets and send approved replies.
- [x] **T3.2 — Agent 3: Inbox Monitor & Classifier (`src/job_agent/agents/agent3_inbox.py`)**
  - Classify threads into `["Interview Invite", "Rejection", "Assessment Request", "Neutral"]` and update Google Sheets status automatically.
- [x] **T3.3 — Google Calendar Client (`src/job_agent/integrations/calendar_client.py`)**
  - Compute top 3 open interview slots (`Option A`, `Option B`, `Option C`) and book confirmed events.
- [x] **T3.4 — Dual HITL Coordinator: Web UI State + Telegram Bot (`src/job_agent/integrations/telegram_bot.py` & `src/job_agent/agents/agent4_calendar.py`)**
  - Publish open calendar slots and drafted reply to both the Next.js Web UI (`/interviews`) and Telegram Bot; book calendar & send email only upon explicit approval.
- [x] **T3.5 — Phase 3 Unit Tests (`tests/test_agent3_inbox.py`, `tests/test_agent4_calendar.py`)**
  - Test classification routing for all 4 email types and verify the HITL gate blocks unapproved emails/calendar bookings.

---

## Phase 4: LangGraph Orchestration & FastAPI Backend API
**Goal:** Unify all 4 agents under LangGraph state machines and expose the FastAPI REST + SSE backend for the Frontend Web UI.

- [x] **T4.1 — LangGraph State Definitions & Workflows (`sourcing_graph.py` & `inbox_graph.py`)**
  - Compiled `StateGraph` instances for `sourcing_graph` (Agent 1 $\rightarrow$ Agent 2) and `inbox_graph` (Agent 3 $\leftrightarrow$ Agent 4).
- [x] **T4.2 — FastAPI Application & SSE Event Bus (`src/job_agent/api/server.py`)**
  - Configure FastAPI with CORS and `/api/workflows/stream` SSE endpoint for live UI telemetry.
- [x] **T4.3 — FastAPI Endpoints (`src/job_agent/api/server.py`)**
  - Implemented `/api/health`, `/api/dashboard/stats`, `/api/jobs`, `/api/workflows/source`, `/api/ats/evaluate`, `/api/resumes/{job_id}/tailor`, `/api/resumes/{job_id}/preview`, `/api/resumes/{job_id}/pdf`, `/api/master-resume`, `/api/workflows/inbox-sync`, `/api/inbox/threads`, `/api/interviews/{job_id}/slots`, and `/api/interviews/{job_id}/confirm`.
- [x] **T4.4 — Phase 4 API & Workflow Tests (`tests/test_workflows.py`, `tests/test_api.py`)**
  - Verified all FastAPI endpoints and LangGraph state transitions.

---

## Phase 5: Next.js Frontend Web Application & End-to-End Integration
**Goal:** Build the interactive Next.js 15 + TypeScript + Tailwind CSS Frontend Dashboard managed with `pnpm` and connected to the FastAPI backend.

- [x] **T5.1 — Initialize Next.js Frontend (`frontend/`) with `pnpm`**
  - Next.js 15 App Router with TypeScript, Tailwind CSS, `lucide-react` icons, and typed API client (`frontend/src/lib/api.ts` & `types.ts`).
- [x] **T5.2 — View 1: Command Center & Pipeline Dashboard (`frontend/src/app/page.tsx`)**
  - KPI metric cards, **"Run Sourcing & ATS Gate Batch"** button, **"Sync Inbox"** button, and **LangGraph Agent Execution Console**.
- [x] **T5.3 — View 2: Job Tracker & ATS Gate Explorer (`frontend/src/app/jobs/page.tsx`)**
  - Interactive filterable Table & **Kanban Board** view backed by `/api/jobs`, `<50%` vs. `>=50%` score badges, Status dropdown updater, PDF viewer, and **Job & Gap Analysis Inspector**.
- [x] **T5.4 — View 3: Resume Tailor Studio & Local ATS Sandbox (`frontend/src/app/studio/page.tsx`)**
  - Interactive **Local ATS Checker Sandbox** (`/api/ats/evaluate`) + **Side-by-Side Resume Studio** (Master Resume vs. Tailored Resume + PDF preview).
- [x] **T5.5 — View 4: Inbox & Interview Coordinator Hub (`frontend/src/app/interviews/page.tsx`)**
  - Classified Gmail threads list + **Human-in-the-Loop Interview Scheduler Card** (`Option A`, `Option B`, `Option C`, editable reply draft, and **"Approve Slot, Book Google Calendar & Send Reply"**).
- [x] **T5.6 — View 5: Settings & Integration Health (`frontend/src/app/settings/page.tsx`)**
  - Live connectivity status cards and in-browser **Master Resume Markdown Editor**.
- [x] **T5.7 — Full-Stack End-to-End Verification**
  - Both Backend (`http://127.0.0.1:8080`) and Frontend (`http://localhost:3001`) built and verified.
