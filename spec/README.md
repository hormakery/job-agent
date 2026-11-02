# Spec-Driven Development (SDD) Suite — `job-agent` (Full-Stack)

This `spec/` directory contains the complete **Spec-Driven Development (SDD)** blueprint derived from [`../prd.md`](../prd.md) for building the **Full-Stack Autonomous 4-Agent Job Application & Interview Coordinator** (Backend Agents + FastAPI Server + Next.js Frontend Web Application).

---

## Document Index

| File | Purpose |
| :--- | :--- |
| **[`constitution.md`](./constitution.md)** | **Ground Rules & Guardrails:** Architectural invariants, reuse of your existing local ATS checker, the strict $\ge 50\%$ match threshold gate, zero resume fabrication policy, dual Web UI + Telegram HITL safety, and full-stack tech standards. |
| **[`spec.md`](./spec.md)** | **Full-Stack Technical & Behavioral Spec:** System architecture, Pydantic schemas, Google Sheets 11-column state schema, specifications for Agents 1–4, **FastAPI REST/SSE API contracts**, and **Next.js Frontend Web Application** views. |
| **[`plan.md`](./plan.md)** | **Phased Architecture Plan:** Full-stack monorepo layout (`src/job_agent/` + `frontend/`), the 3 integration modes (`python_import`, `http_local`, `cli_subprocess`) for bridging your **existing local ATS checker**, and the **6-phase batch execution strategy (Phases 0–5)**. |
| **[`tasks.md`](./tasks.md)** | **Actionable Phased Checklist:** Granular, sequential engineering tasks (`T0.1` through `T5.7`) covering backend agents, FastAPI routes, and Next.js frontend pages. |
| **[`checklist.md`](./checklist.md)** | **Quality Gates:** Verification criteria (`Gate 0` through `Gate 5`) that must pass before advancing to the next phase. |

---

## Key Architectural Decisions Captured

1. **Full-Stack Web Dashboard (`frontend/` + `FastAPI`):**
   * **Next.js 15 (App Router, TypeScript, Tailwind CSS, `shadcn/ui`)** frontend connected to a **FastAPI** backend with Server-Sent Events (SSE) for live agent progress streaming:
     * **Command Center (`/`)**: KPI metrics, manual batch triggers, and real-time Agent activity console.
     * **Job Tracker & ATS Gate Explorer (`/jobs`)**: Interactive table & Kanban view synced with Google Sheets, `<50%` vs `>=50%` match badges, and Gap Analysis drawer.
     * **Resume Tailor Studio & Local ATS Sandbox (`/studio`)**: Test any JD against your **Existing Local ATS Checker** and inspect Master vs. Tailored Resume (Markdown + live PDF preview + Drive link) side-by-side.
     * **Inbox & Interview Coordinator Hub (`/interviews`)**: View classified recruiter emails, pick open Google Calendar slots (`Option A/B/C`), and approve drafted Gmail replies from the Web UI (synced with Telegram).
     * **Settings & Health (`/settings`)**: Live connectivity checks for Local ATS Checker, Google Workspace, JSearch, and Telegram + Master Resume editor.
2. **Existing Local ATS Checker Reused (Agent 2 & Frontend Studio):**
   * Connected via `ATSCheckerAdapter` (`src/job_agent/integrations/ats_adapter.py`) supporting `python_import`, `http_local`, or `cli_subprocess`.
3. **Strict $\ge 50\%$ Match Gate & Tailoring Pipeline (Agent 1 & Agent 2):**
   * Jobs scoring $< 50\%$ are logged as `Skipped (<50% Match)` without calling `gemini-2.5-pro`. Jobs scoring $\ge 50\%$ are tailored via `gemini-2.5-pro`, rendered to PDF locally, uploaded to Google Drive, and linked in Google Sheets.
4. **Dual Human-in-the-Loop Coordinator (Agent 3 & Agent 4):**
   * Both the **Next.js Web UI (`/interviews`)** and the **Telegram Bot** allow you to select open Google Calendar slots and approve drafted recruiter replies before Agent 3 sends them.
