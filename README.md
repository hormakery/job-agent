# JobAgent OS

> Autonomous 4-Agent Full-Stack Job Application & Interview Coordinator powered by **Google Gemini (`google-genai`)**, **LangGraph**, **FastAPI**, **Next.js 15 (pnpm)**, **Google Workspace** (Sheets, Drive, Gmail, Calendar), and your **Existing Local ATS Checker**.

---

## 1. Project Overview

JobAgent OS automates high-volume job search, ATS fit evaluation, resume tailoring, and interview coordination without human burnout or false tailoring:

1. **Agent 1 (Sourcing & Pre-Filtering):** Scrapes listings via JSearch (RapidAPI) across target roles (*Software, Mobile, Frontend, DevOps*), normalizes metadata with `gemini-2.5-flash`, and deduplicates against Google Sheets.
2. **Agent 2 (Score Evaluator & Resume Tailor):** Scores the Master Resume against the Job Description using the **Existing Local ATS Checker**. Enforces the **$\ge 50\%$ match score cutoff**:
   - Score $< 50\%$: Skips tailoring to save tokens and avoid false tailoring; logs gap analysis to Google Sheets.
   - Score $\ge 50\%$: Tailors the resume using `gemini-2.5-pro` (STAR method, strict anti-fabrication), renders a clean PDF, and uploads to Google Drive.
3. **Agent 3 (Inbox Monitor & Classifier):** Monitors Gmail for replies from tracked companies, classifying messages into *Interview Invite*, *Assessment Request*, *Rejection*, or *Neutral*.
4. **Agent 4 (Interview Coordinator & HITL):** Detects recruiter scheduling links or finds open slots via Google Calendar, preparing draft replies and coordinating human approval via the Web Dashboard and Telegram.

---

## 2. Repository Structure

```text
job-agent/
├── prd.md                     # Product Requirements Document
├── spec/                      # Spec-Driven Development (SDD) Suite
│   ├── README.md              # SDD Index & Workflow Guide
│   ├── constitution.md        # Project Guardrails & Architectural Invariants
│   ├── spec.md                # Full-Stack Technical & Behavioral Specification
│   ├── plan.md                # Phased Implementation Plan & ATS Adapter Design
│   ├── tasks.md               # Phased Implementation Task Checklist
│   └── checklist.md           # Quality Gate Verification Criteria
├── .env.example               # Environment variables template
├── pyproject.toml             # Python backend dependencies (managed via uv/pip)
├── uv.lock                    # Locked Python dependency tree
│
├── src/job_agent/             # Python Backend
│   ├── config.py              # Pydantic Settings (.env loader)
│   ├── models/                # Pydantic data schemas & LangGraph state definitions
│   ├── integrations/          # External integrations (Local ATS, Sheets, Drive, Gmail, Calendar, Telegram)
│   ├── agents/                # Agents 1-4 implementations
│   ├── workflows/             # LangGraph state graphs (Sourcing & Inbox pipelines)
│   ├── api/                   # FastAPI server & REST/SSE endpoints
│   └── main.py                # CLI & backend server runner
│
├── frontend/                  # Next.js 15 Web Application (managed via pnpm)
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── src/
│       ├── app/               # App Router pages (Dashboard, Jobs, Studio, Interviews, Settings)
│       ├── components/        # UI components (SidebarNav, tables, drawers)
│       └── lib/               # Typed API client & data interfaces
│
├── data/
│   └── master_resume.md       # Canonical Master Resume Markdown template
├── scripts/
│   └── verify_phase2_batch.py # 20-job batch gatekeeper verification script
└── tests/                     # Pytest suite for backend agents, adapter, and API
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
