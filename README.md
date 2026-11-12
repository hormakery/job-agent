# JobAgent OS

> Autonomous 4-Agent Full-Stack Job Application & Interview Coordinator powered by **Google Gemini (`google-genai`)**, **LangGraph**, **FastAPI**, **Next.js 15 (pnpm)**, **Google Workspace** (Sheets, Drive, Gmail, Calendar), and your **Local ATS-Checker Express Backend**.

---

## 1. Project Overview

JobAgent OS automates high-volume job search, ATS fit evaluation, resume tailoring, application dispatch, and interview coordination without human burnout, synthetic placeholder data, or false tailoring:

1. **Agent 1 (Sourcing & Platform Transparency):** Sources listings via JSearch (RapidAPI) across target roles (*Software, Mobile, Frontend, DevOps*), tags source platforms (*LinkedIn, Indeed, Glassdoor, ZipRecruiter, Direct Career Site*), detects submission method (*direct email* vs *portal link*), normalizes metadata with `gemini-2.5-flash`, and deduplicates against Google Sheets.
2. **Agent 2 (ATS Gatekeeper & Resume Tailor):** Evaluates the Master Resume against the Job Description using your real local **ATS-Checker** (`http://127.0.0.1:4000/api/v1/scans/analyze`). Enforces the strict **$\ge 50\%$ match score cutoff**:
   - Score $< 50\%$: Skips tailoring to conserve tokens and prevent false tailoring; logs gap analysis.
   - Score $\ge 50\%$: Tailors the resume using `gemini-2.5-pro` (STAR method, strict anti-fabrication grounded in Master Resume), renders a clean PDF, and uploads to Google Drive.
3. **Agent 3 (Application Dispatcher & Submission Engine):** Bridges the gap between tailored resumes and submitted applications:
   - *Direct Email*: Generates professional cover emails referencing candidate's real profile (LinkedIn, GitHub, portfolio), attaches tailored PDF resume, creates Gmail drafts, and enables 1-click dispatch via Gmail API.
   - *Portal Submissions*: Packages direct application links, 1-click tailored PDF download, and pre-generated STAR answers to common screening questions.
   - Transitions state to **`Applied`** with ISO timestamp recorded in Google Sheets only upon verified dispatch.
4. **Agent 4 (Post-Application Inbox Monitor & Calendar HITL):**
   - Polls Gmail **strictly for companies in `Applied` status** (never invents recruiter responses for unapplied jobs).
   - Classifies responses (*Application Received, Under Review, Assessment Request, Rejection, Interview Invite*).
   - Extracts recruiter scheduling links (Calendly, Ashby, Greenhouse, Lever) or queries Google Calendar API `freebusy` for conflict-free slots.
   - Coordinates 1-click human approval via the Web Dashboard (`/interviews`), automatically booking Google Calendar events and updating Google Sheets to `Scheduled`.

---

## 2. Repository Structure

```text
job-agent/
├── prd.md                     # Product Requirements Document
├── spec/                      # Spec-Driven Development (SDD) Suite
│   ├── README.md              # SDD Index & Workflow Guide
│   ├── constitution.md        # Architectural Invariants & Anti-Hallucination Guardrails
│   ├── spec.md                # Full-Stack Technical Specification
│   ├── plan.md                # Phased Implementation Plan & ATS Adapter Architecture
│   ├── tasks.md               # Phased Implementation Task Checklist (All 6 Phases Completed)
│   └── checklist.md           # Quality Gate Verification Criteria (Gates 1-6 Passed)
├── .env.example               # Environment variables template
├── pyproject.toml             # Python backend dependencies (managed via uv/pip)
├── uv.lock                    # Locked Python dependency tree
│
├── src/job_agent/             # Python Backend
│   ├── config.py              # Pydantic Settings (.env loader)
│   ├── models/                # Pydantic data schemas (CandidateProfile, JobSheetRow, etc.)
│   ├── integrations/          # External integrations (ATS-Checker, Google OAuth, Sheets, Drive, Gmail, Calendar)
│   ├── agents/                # Agents 1-4 implementations (Sourcing, Tailoring, Dispatch, Inbox/Calendar)
│   ├── workflows/             # LangGraph state graphs (Sourcing & Inbox pipelines)
│   ├── api/                   # FastAPI server & REST endpoints
│   └── main.py                # CLI & backend server runner
│
├── frontend/                  # Next.js 15 Web Application (managed via pnpm)
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── src/
│       ├── app/               # App Router pages (/, /jobs, /studio, /dispatch, /interviews, /settings)
│       ├── components/        # UI components (SidebarNav, tables, status badges)
│       └── lib/               # Typed API client & data interfaces
│
├── data/
│   ├── master_resume.md       # Canonical Master Resume Markdown template
│   └── state_store.json       # Truthful local JSON state mirror
└── tests/                     # 31 Pytest unit tests for all agents, ATS adapter, and Google OAuth
```

---

## 3. Quick Start Guide

### Prerequisites
- Python $\ge 3.11$ (`uv` recommended)
- Node.js $\ge 18$ & `pnpm`

### Backend Setup
```bash
# 1. Install Python dependencies
uv sync --all-extras

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys (GEMINI_API_KEY, ATS adapter path, etc.)

# 3. Run backend tests
.venv/bin/pytest -v

# 4. Start FastAPI server (runs on port 8080)
.venv/bin/uvicorn job_agent.api.server:app --host 127.0.0.1 --port 8080
```
API Documentation is available at: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

### Frontend Setup
```bash
# 1. Install frontend dependencies with pnpm
pnpm --dir frontend install

# 2. Run Next.js in development mode (runs on port 3001)
pnpm --dir frontend run dev

# 3. Or build for production
pnpm --dir frontend run build
```
Web Dashboard is available at: [http://localhost:3001](http://localhost:3001)
