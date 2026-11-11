# Project Constitution: Autonomous Job Application & Interview Coordinator (`job-agent`)

> **Spec-Driven Development (SDD) Ground Rules & Architectural Guardrails**
> Version: 2.0.0 (Full-Stack Real-World Architecture: Zero Seed Data, Real Google Auth & Application Dispatch) | Status: Active

---

## 1. Core Mission
Build a reliable, token-efficient, **full-stack** 4-agent autonomous job application, dispatch, and interview coordination platform powered by **Google Gemini (`google-genai`)**, **LangGraph**, **FastAPI**, a **Next.js 15 (React 19 + TypeScript + Tailwind CSS, `pnpm`) Web Dashboard**, **Google Workspace APIs** (Gmail, Google Sheets, Google Drive, Google Calendar), and the user's **existing local ATS Checker (`ATS-Checker`)**.

---

## 2. Non-Negotiable Architectural Guardrails

### Rule 1: Zero Fake / Seed Data (Truthful State Guarantee)
* The system MUST NEVER populate fake, dummy, or hardcoded application records (such as sample "Stripe" or "Apple" rows with synthetic "Interview Requested" statuses).
* If no applications have been submitted, the dashboard must truthfully display `0 Jobs Applied`.
* If Google credentials or local services are disconnected, the dashboard must explicitly display a disconnected warning with connection actions—not simulate false progress.

### Rule 2: Explicit Application Dispatch Before Interview Tracking
* An application record CANNOT transition from `Tailored & Ready` to `Interview Requested` without passing through the **Application Dispatch** stage (`Applied`).
* Every application must track its explicit submission method:
  1. **Direct Email Application (`email_submission`)**: Agent prepares a tailored cover email + attaches the tailored resume PDF, candidate's LinkedIn URL, portfolio, and phone number, and dispatches via Gmail API (or saves as Gmail Draft for user review).
  2. **Portal / Form Application (`portal_submission`)**: For LinkedIn Easy Apply, Greenhouse, Lever, Ashby, Workday, or Google Forms, the system tracks the application portal URL, pre-generates tailored responses for screening questions, and records the submission timestamp.
* Agent 3 (Inbox Monitor) only monitors for confirmation, assessment, rejection, or interview requests for jobs that have actually reached `Applied` status.

### Rule 3: Single Web Command Center (No External Telegram Friction)
* All job assessments, ATS gate scores, resume edits, application email approvals, and interview scheduling take place directly in the **Next.js Web Dashboard** (`http://localhost:3001`).
* **Telegram is removed.** No bot tokens, chat IDs, or localhost webhooks are required.

### Rule 4: Reuse the Existing Local ATS Checker (`ATS-Checker`)
* The user's existing ATS checker is located at `/Users/beebee/Desktop/personal project/ATS-Checker`.
* Agent 2 MUST interface with this existing ATS checker via the configurable `ATSCheckerAdapter` (HTTP endpoint or subprocess), evaluating candidate fit against the Job Description.
* `gemini-2.5-flash` is used as a fallback/normalizer only if the local ATS checker is unreachable.

### Rule 5: Strict $\ge 50\%$ Match Score Gatekeeper
* Every scraped job MUST pass through the pre-assessment gate before any resume tailoring occurs.
* **If `match_score < 50`:**
  * Immediately halt tailoring for that job (`gemini-2.5-pro` MUST NOT be called).
  * Record the row with `Passed Gate (>=50%) = FALSE`, `Status = Skipped (<50% Match)`, and populate `Gap Analysis` with missing critical skills.
* **If `match_score >= 50`:**
  * Proceed to `gemini-2.5-pro` tailoring, Markdown-to-PDF rendering, and application packaging.

### Rule 6: Zero Hallucination / Zero Fabrication in Resume Tailoring
* When `gemini-2.5-pro` rewrites resume bullet points using the STAR method and impact metrics, it MUST strictly rephrase and emphasize **real accomplishments, skills, and projects** present in the Master Resume (`data/master_resume.md`).
* It MUST NEVER invent employers, degrees, certifications, metrics, or technologies not grounded in the Master Resume.

### Rule 7: Sourcing Platform Transparency & Candidate Profile Injection
* Every scraped job listing must explicitly preserve its origin platform tag: `LinkedIn`, `Indeed`, `Glassdoor`, `ZipRecruiter`, or `Direct Career Site`.
* The candidate's real profile information (`FULL_NAME`, `CANDIDATE_EMAIL`, `CANDIDATE_PHONE`, `LINKEDIN_URL`, `GITHUB_URL`, `PORTFOLIO_URL`) must be injected into all application payloads and cover drafts.

---

## 3. Technology Stack Standards

| Layer | Standard Choice | Notes |
| :--- | :--- | :--- |
| **Backend Language & Runtime** | Python $\ge 3.11$ | Managed via `uv` or `venv` |
| **Backend Web API** | `FastAPI` + `Uvicorn` | REST API + Server-Sent Events (SSE) for live agent status streaming |
| **Frontend Framework** | `Next.js 15` (App Router, React 19, TypeScript, `pnpm`) | Styled with `Tailwind CSS` + `Lucide Icons` |
| **LLM SDK** | `google-genai` (Official SDK) | `gemini-2.5-flash` (extraction/screening), `gemini-2.5-pro` (resume tailoring) |
| **Orchestration** | `langgraph` | StateGraph coordinating Agents 1–4 |
| **ATS Evaluation (Agent 2)** | Existing Local ATS Checker (`ATS-Checker`) | Connected via `ATSCheckerAdapter` |
| **State Database** | Google Sheets (`gspread` + Google OAuth2 / Service Account) | Synchronized live with UI |
| **Inbox & Outbox (Agent 3)** | Gmail API (`google-api-python-client`) | Reads unread recruiter emails & sends/drafts application replies |
| **Calendar (Agent 4)** | Google Calendar API | Queries open slots & books interview events |
| **Testing** | `pytest` (Backend) | Unit tests + integration verification |

---

## 4. Coding & Security Conventions
1. **No Hardcoded Secrets or Seed Items:** All API keys, tokens, and candidate info are loaded from `.env`. Zero dummy data committed to disk.
2. **Git Hygiene:** `.env`, `.env.*`, `credentials/*.json`, and runtime data are strictly excluded in `.gitignore`.
3. **Graceful Degraded Modes:** When a third-party service is disconnected, the UI displays clear, actionable connection instructions.
