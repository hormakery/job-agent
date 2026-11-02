# Phase Quality Gate & Verification Checklist (`checklist.md`)

> **Purpose:** Before transitioning from one implementation phase to the next, every item in that phase's checklist must pass.

---

## Gate 0: Pre-Implementation & Local ATS Bridge Checklist
- [x] **C0.1:** Local ATS Checker location/endpoint is configured in `config.py` / `.env.example` (`ATS_INTEGRATION_MODE`, `ATS_LOCAL_REPO_PATH` or `ATS_LOCAL_HTTP_URL`).
- [x] **C0.2:** `ATSCheckerAdapter.evaluate()` successfully invokes the local ATS checker with a sample resume + job description and returns a valid `MatchEvaluation` Pydantic object (`0 <= match_score <= 100`).
- [x] **C0.3:** Boundary test passes: `match_score = 49` sets `passed_threshold = False`; `match_score = 50` sets `passed_threshold = True`.
- [x] **C0.4:** `pytest tests/test_ats_adapter.py` passes with 100% green status.

---

## Gate 1: Data & Storage Layer Checklist (Phase 1)
- [x] **C1.1:** `data/master_resume.md` contains the canonical Master Resume in clean Markdown format.
- [x] **C1.2:** `GoogleSheetsClient` manages the canonical 11-column schema (`Job ID`, `Company Name`, `Role Title`, `Initial Match Score`, `Passed Gate (>=50%)`, `Gap Analysis`, `Status`, `Tailored Resume Link`, `Interview Date`, `Job URL`, `Location / Remote`).
- [x] **C1.3:** Re-inserting the same `(Company Name, Role Title)` updates the existing row by `Job ID` rather than creating a duplicate row.
- [x] **C1.4:** `pdf_renderer.py` generates a clean, text-selectable PDF from `data/master_resume.md`.
- [x] **C1.5:** `drive_client.py` uploads a PDF to Google Drive (when configured) or serves the local PDF preview link.

---

## Gate 2: Sourcing, ATS Gate & Resume Tailoring Checklist (Phase 2)
- [x] **C2.1:** Agent 1 (`agent1_sourcing.py`) fetches raw listings from JSearchProvider and extracts structured `ExtractedJobListing` objects.
- [x] **C2.2:** Agent 2 (`agent2_tailor.py`) skips calling `gemini-2.5-pro` when the local ATS checker returns `< 50%` and logs `Status = "Skipped (<50% Match)"` with a populated `Gap Analysis`.
- [x] **C2.3:** Agent 2 tailors the resume when the local ATS checker returns `>= 50%`, rewrites bullet points using impact metrics without fabricating experience, renders the PDF, and sets `Status = "Tailored & Ready"`.
- [x] **C2.4:** Batch test on 20 job listings (`scripts/verify_phase2_batch.py`) completes without unhandled exceptions or duplicate rows.

---

## Gate 3: Inbox Monitor & Calendar/Telegram HITL Checklist (Phase 3)
- [x] **C3.1:** Agent 3 (`agent3_inbox.py`) queries threads matching active companies in Google Sheets.
- [x] **C3.2:** Accurately classifies emails into `Interview Invite`, `Rejection`, `Assessment Request`, and `Neutral`.
- [x] **C3.3:** `Rejection` and `Assessment Request` emails automatically update the corresponding row's `Status`.
- [x] **C3.4:** `Interview Invite` updates `Status = "Interview Requested"`, queries Google Calendar for free slots, and publishes the proposed options (`Option A`, `Option B`, `Option C`) to both the Web UI state and Telegram Bot.
- [x] **C3.5:** Selecting a slot and approving the reply books the Google Calendar event, updates `Interview Date` and `Status = "Scheduled"`, and triggers Agent 3 to send the email reply.

---

## Gate 4: LangGraph Orchestration & FastAPI Server Checklist (Phase 4)
- [x] **C4.1:** LangGraph `sourcing_graph` executes Agent 1 $\rightarrow$ Agent 2 end-to-end and emits real-time events to `/api/workflows/stream` (SSE).
- [x] **C4.2:** LangGraph `inbox_graph` executes Agent 3 $\leftrightarrow$ Agent 4 end-to-end.
- [x] **C4.3:** All FastAPI routes (`/api/dashboard/stats`, `/api/jobs`, `/api/ats/evaluate`, `/api/resumes/{job_id}/preview`, `/api/inbox/threads`, `/api/interviews/{job_id}/confirm`) respond with valid JSON and pass `pytest tests/test_api.py`.

---

## Gate 5: Next.js Frontend Dashboard & Full-Stack E2E Checklist (Phase 5)
- [x] **C5.1:** Next.js Frontend (`frontend/`) installs via `pnpm` and builds cleanly (`pnpm --dir frontend run build`) with zero TypeScript or ESLint errors.
- [x] **C5.2:** **Command Center (`/`)** renders live KPI cards and Agent execution logs when triggering a sourcing batch.
- [x] **C5.3:** **Job Tracker (`/jobs`)** displays all rows in both **Table** and **Kanban** views with `<50%` vs. `>=50%` ATS badges, Gap Analysis inspector, and status updates.
- [x] **C5.4:** **Resume Tailor Studio (`/studio`)** allows testing any JD against the **Existing Local ATS Checker** and previews Master vs. Tailored Resume (Markdown + PDF) side-by-side.
- [x] **C5.5:** **Inbox & Interview Coordinator (`/interviews`)** displays classified recruiter emails, shows Google Calendar free slots (`Option A/B/C`), and allows one-click slot booking & email reply approval.
- [x] **C5.6:** No API keys, OAuth tokens, or personal credentials are exposed to client-side bundles or committed to Git.
