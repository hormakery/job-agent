# Project Constitution: Autonomous Job Application & Interview Coordinator (`job-agent`)

> **Spec-Driven Development (SDD) Ground Rules & Architectural Guardrails**
> Version: 1.1.0 (Full-Stack: Backend Agents + FastAPI + Next.js Frontend Dashboard) | Status: Active

---

## 1. Core Mission
Build a reliable, token-efficient, **full-stack** 4-agent autonomous job application and interview coordination platform powered by **Google Gemini (`google-genai`)**, **LangGraph**, **FastAPI**, a **Next.js (React + TypeScript + Tailwind CSS) Web Dashboard**, **Google Workspace APIs** (Sheets, Drive, Gmail, Calendar), **Telegram Bot (Human-in-the-Loop)**, and the user's **existing local ATS Checker**.

---

## 2. Non-Negotiable Architectural Guardrails

### Rule 1: Reuse the Existing Local ATS Checker (No Reinvention)
* The user has **already built a local ATS Resume Checker**.
* **Do NOT build a new ATS scoring algorithm from scratch.**
* Agent 2 and the Frontend ATS Sandbox MUST integrate with the existing local ATS checker through a clean **Adapter Pattern** (`ATSCheckerAdapter`) supporting:
  1. **Direct Python Module Import** (if the existing ATS checker is a local Python package/script),
  2. **Local HTTP/REST Call** (if the local ATS checker runs as a local server on `localhost`), or
  3. **CLI Subprocess Bridge** (invoking the local ATS checker script/binary and parsing JSON stdout).
* `gemini-2.5-flash` may only be used as a structured normalizer/fallback if the local ATS output needs formatting into the `MatchEvaluation` schema (`match_score`, `missing_critical_skills`, `passed_threshold`, `reasoning`).

### Rule 2: Strict $\ge 50\%$ Match Score Gatekeeper
* Every scraped job MUST pass through the pre-assessment gate before any resume tailoring or PDF generation occurs.
* **If `match_score < 50`:**
  * Immediately halt tailoring for that job (`gemini-2.5-pro` MUST NOT be called).
  * Record the row in Google Sheets with `Passed Gate (>=50%) = FALSE`, `Status = Skipped (<50% Match)`, and populate `Gap Analysis` with the missing critical skills and reason.
* **If `match_score >= 50`:**
  * Proceed to `gemini-2.5-pro` tailoring, Markdown-to-PDF rendering, and Google Drive upload.

### Rule 3: Zero Hallucination / Zero Fabrication in Resume Tailoring
* When `gemini-2.5-pro` rewrites resume bullet points using the STAR method and high-impact metrics, it MUST strictly rephrase and emphasize **real accomplishments, skills, and projects** present in the Master Resume.
* It MUST NEVER invent employers, degrees, certifications, metrics, or technologies not grounded in the Master Resume.

### Rule 4: Google Sheets as the Single Source of Truth (Idempotency)
* All 4 agents and the Frontend Web UI read and write state through the centralized Google Sheet (`gspread`), exposed to the frontend via FastAPI endpoints with local caching to respect rate limits.
* Every job listing is uniquely identified by `Job ID` = `MD5(normalize(company_name) + "_" + normalize(role_title))`.
* Upsert operations MUST be idempotent: re-running Agent 1 or Agent 2 on the same job listing must not create duplicate rows in Google Sheets.

### Rule 5: Dual Human-in-the-Loop (HITL) Safety (Web UI + Telegram Bot)
* **Calendar & Email Safety:** Agent 3 and Agent 4 MUST NEVER automatically send an email reply to a recruiter or book a confirmed calendar invite without explicit user approval via either the **Frontend Web Dashboard** OR the **Telegram Bot** inline confirmation flow.

---

## 3. Technology Stack Standards

| Layer | Standard Choice | Notes |
| :--- | :--- | :--- |
| **Backend Language & Runtime** | Python $\ge 3.11$ | Managed via `uv` or `venv` |
| **Backend Web API** | `FastAPI` + `Uvicorn` | REST API + Server-Sent Events (SSE) for live agent status streaming to Frontend |
| **Frontend Framework** | `Next.js 15` (App Router, React 19, TypeScript, managed via `pnpm`) | Styled with `Tailwind CSS` + `shadcn/ui` + `Lucide Icons` |
| **LLM SDK** | `google-genai` (Official SDK) | `gemini-2.5-flash` (extraction/classification), `gemini-2.5-pro` (resume tailoring) |
| **Orchestration** | `langgraph` | StateGraph coordinating Agents 1–4 |
| **Data Validation** | `pydantic` ($\ge 2.0$) | Strict schemas shared across Agents, FastAPI, and OpenAPI types |
| **Job Sourcing (Agent 1)** | JSearch API (RapidAPI) | Behind a pluggable `JobSourceProvider` interface |
| **ATS Evaluation (Agent 2)** | Existing Local ATS Checker | Connected via `ATSCheckerAdapter` |
| **Resume PDF & Storage** | Markdown $\rightarrow$ PDF (`weasyprint` / `reportlab`) + Google Drive API | Uploads tailored PDF and serves local/Drive preview in Frontend |
| **State Database** | Google Sheets (`gspread` + `google-auth`) | Canonical relational state store synced with Frontend UI |
| **Inbox Monitor (Agent 3)** | Gmail API (`google-api-python-client`) | OAuth2 user credentials |
| **Calendar & HITL (Agent 4)** | Google Calendar API + Web UI + `python-telegram-bot` | Slot selection & email approval in both Web UI and Telegram |
| **Testing** | `pytest` (Backend) + `Vitest` / `Playwright` (Frontend) | Unit tests + end-to-end API/UI verification |

---

## 4. Coding & Repository Conventions
1. **Monorepo Layout:** Backend lives in `backend/` (or `src/job_agent/`) and Frontend lives in `frontend/` with a unified root runner/Makefile.
2. **Modular Agent Boundaries:** Each agent resides in its own module under `src/job_agent/agents/` with clearly typed input/output contracts.
3. **Configuration via Environment Variables:** All API keys, OAuth token paths, Google Sheet IDs, Telegram chat IDs, and the local ATS checker path/URL MUST be loaded via `pydantic-settings` from `.env`. Never hardcode secrets.
4. **Structured Logging & Real-Time UI Telemetry:** Every state transition, gate decision, and API call must log structured context (`job_id`, `company`, `agent`, `status`) and stream to the Frontend Activity Log.
