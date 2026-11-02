# Technical & Behavioral Specification (`spec.md`)

> **Project:** Autonomous 4-Agent Job Application & Interview Coordinator (Full-Stack)  
> **Source PRD:** [`prd.md`](../prd.md)  
> **Architecture:** Next.js Web Dashboard $\leftrightarrow$ FastAPI Server $\leftrightarrow$ LangGraph Multi-Agent Pipeline + Local ATS Checker + Google Workspace + Telegram HITL

---

## 1. Full-Stack System Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend Web Application                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ Pipeline KPI │ │ Job Tracker  │ │ Resume Studio &  │ │ Inbox & Calendar│  │
│  │  Dashboard   │ │ & Gate Table │ │ Local ATS Tester │ │   HITL Center   │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼────────────────────┼───────────┘
          │                │  REST API + SSE  │                    │
          ▼                ▼                  ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend Server (`src/job_agent/api`)                │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          LangGraph Orchestrator                              │
│                 (StateGraph: JobPipelineState / InboxState)                  │
└────────┬──────────────────────┬──────────────────────┬────────────────────┬──┘
         │                      │                      │                    │
         ▼                      ▼                      ▼                    ▼
┌────────────────┐    ┌──────────────────┐    ┌────────────────┐    ┌────────────────┐
│    Agent 1:    │    │     Agent 2:     │    │    Agent 3:    │    │    Agent 4:    │
│   Sourcing &   │───►│ Local ATS Gate & │    │ Inbox Monitor  │───►│  Calendar &    │
│ Pre-Filtering  │    │  Resume Tailor   │    │  & Classifier  │◄───│ Web/TG HITL    │
└────────┬───────┘    └─────────┬────────┘    └────────┬───────┘    └────────┬───────┘
         │                      │                      │                     │
         │                      ▼                      │                     │
         │            ┌──────────────────┐             │                     │
         │            │  Existing Local  │             │                     │
         │            │   ATS Checker    │             │                     │
         │            │ (Adapter Bridge) │             │                     │
         │            └─────────┬────────┘             │                     │
         ▼                      ▼                      ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│           Google Sheets (Centralized Source of Truth via gspread)            │
│                 + Google Drive (Tailored Resume PDF Storage)                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Two Main Execution Flows
1. **Workflow A — Sourcing, ATS Gate & Tailoring Pipeline (Agent 1 $\rightarrow$ Agent 2):**
   * Triggered from the **Web Dashboard ("Run Sourcing")**, CLI, or scheduler.
   * Fetches raw job listings via JSearch API $\rightarrow$ normalizes via `gemini-2.5-flash` $\rightarrow$ deduplicates against Google Sheets $\rightarrow$ evaluates match score via the **Existing Local ATS Checker** $\rightarrow$ enforces the $\ge 50\%$ gate $\rightarrow$ tailors passing resumes via `gemini-2.5-pro` $\rightarrow$ renders PDF & uploads to Google Drive $\rightarrow$ updates Google Sheets & streams real-time progress to the Web UI.
2. **Workflow B — Inbox Monitoring & Interview Scheduling Pipeline (Agent 3 $\leftrightarrow$ Agent 4):**
   * Polls Gmail for unread threads matching tracked companies in Google Sheets $\rightarrow$ classifies email intent via `gemini-2.5-flash` $\rightarrow$ updates Google Sheets status $\rightarrow$ if `Interview Invite`, triggers Agent 4 $\rightarrow$ fetches free slots from Google Calendar $\rightarrow$ notifies user in both the **Web Dashboard HITL Center** and **Telegram Bot** with interactive slot buttons $\rightarrow$ on user selection & approval, books Google Calendar event, updates Google Sheets, and triggers Agent 3 to send the confirmation email.

---

## 2. Canonical Data Schemas (`Pydantic` Models)

### 2.1 Extracted Job Listing Schema (Agent 1 Output)
```python
from pydantic import BaseModel, Field
from typing import Optional

class ExtractedJobListing(BaseModel):
    job_id: str = Field(description="Deterministic MD5 hash of normalized company_name + role_title")
    company_name: str = Field(description="Hiring company name")
    role_title: str = Field(description="Normalized role title")
    location: str = Field(description="Job location (City, State/Country or Remote)")
    is_remote: bool = Field(description="True if role is fully remote or hybrid-remote")
    sponsorship_explicitly_mentioned: bool = Field(
        description="True if visa sponsorship is explicitly mentioned (positively or negatively)"
    )
    job_url: str = Field(description="Direct application or posting URL")
    raw_description: str = Field(description="Cleaned full text of the job description")
```

### 2.2 ATS Match Evaluation Schema (Agent 2 Gatekeeper)
```python
class MatchEvaluation(BaseModel):
    match_score: int = Field(ge=0, le=100, description="Percentage match from 0 to 100")
    missing_critical_skills: list[str] = Field(
        default_factory=list,
        description="Key skills required in JD but missing in master resume"
    )
    passed_threshold: bool = Field(description="True ONLY if match_score >= 50, otherwise False")
    reasoning: str = Field(description="Concise gap analysis and explanation of the score")
```

### 2.3 Email Classification Schema (Agent 3 Output)
```python
from typing import Literal

class EmailClassification(BaseModel):
    thread_id: str
    company_name: str
    job_id: Optional[str] = None
    category: Literal["Interview Invite", "Rejection", "Assessment Request", "Neutral"]
    summary: str = Field(description="1-2 sentence summary of the email content")
    proposed_times_raw: list[str] = Field(
        default_factory=list,
        description="Any specific dates/times proposed by the recruiter in the email"
    )
    sender_email: str
    subject: str
```

---

## 3. Google Sheets State Schema

The Google Sheet serves as the centralized relational state database across all 4 agents (`gspread`) and backs the Frontend Job Tracker view:

| Col # | Column Name | Modifying Agent / UI | Type / Format | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `Job ID` | Agent 1 | String (MD5 12-char) | `a1b2c3d4e5f6` |
| **B** | `Company Name` | Agent 1 | String | `Stripe` |
| **C** | `Role Title` | Agent 1 | String | `Senior Mobile Engineer` |
| **D** | `Initial Match Score` | Agent 2 | Percentage String | `58%` |
| **E** | `Passed Gate (>=50%)` | Agent 2 | Boolean (`TRUE` / `FALSE`) | `TRUE` |
| **F** | `Gap Analysis` | Agent 2 | String | `Missing Swift UI experience; strong in React Native` |
| **G** | `Status` | Agent 2 / 3 / 4 / UI | Enum String | `Skipped (<50% Match)` \| `Tailored & Ready` \| `Applied` \| `Assessment Requested` \| `Rejected` \| `Interview Requested` \| `Scheduled` |
| **H** | `Tailored Resume Link` | Agent 2 | URL String | `https://drive.google.com/file/d/...` |
| **I** | `Interview Date` | Agent 4 / UI | ISO Timestamp String | `2026-11-04 10:00:00` |
| **J** | `Job URL` *(Extended)* | Agent 1 | URL String | `https://...` |
| **K** | `Location / Remote` *(Extended)* | Agent 1 | String | `Remote (US/UK)` |

---

## 4. Detailed Agent Specifications (Backend)

### 4.1 Agent 1: Sourcing & Pre-Filtering Agent
* **Inputs:** Search queries (`target_roles`: Software Engineer, Mobile Engineer, Frontend Engineer, Deployment/DevOps Engineer), location/remote filters, pagination limit.
* **Provider Architecture:** `JobSourceProvider` abstract interface with `JSearchProvider` (RapidAPI) as primary.
* **Extraction & Normalization:** Uses `gemini-2.5-flash` with `response_schema=ExtractedJobListing` (`temperature=0.1`) and deterministic `job_id` hashing.
* **Deduplication:** Batch-checks existing `Job ID` column values from Google Sheets.

### 4.2 Agent 2: Local ATS Gatekeeper & Resume Tailor Agent
* **Integration with Existing Local ATS Checker (`ATSCheckerAdapter`):**
  * Connects to your existing local ATS checker via `ATS_INTEGRATION_MODE` (`python_import`, `http_local`, or `cli_subprocess`).
  * Maps output into `MatchEvaluation`.
* **Gatekeeper Logic ($\ge 50\%$ Rule):**
  * **If `match_score < 50`:** Logs `Status = "Skipped (<50% Match)"`, `Passed Gate (>=50%) = FALSE`, and `Gap Analysis` in Google Sheets. `gemini-2.5-pro` is NOT called.
  * **If `match_score >= 50`:** Calls `gemini-2.5-pro` (`temperature=0.3`) to rewrite bullet points using the STAR method and impact metrics without fabricating experience, renders Markdown $\rightarrow$ PDF locally (`output/resumes/{Company}_{Role}_{JobID}.pdf`), uploads to Google Drive, and logs `Status = "Tailored & Ready"` with the Drive URL.

### 4.3 Agent 3: Inbox Monitor & Response Agent
* Queries Gmail API for unread threads matching active companies in Google Sheets.
* Classifies threads via `gemini-2.5-flash` (`EmailClassification`).
* Automatically updates Google Sheets row status for `Rejection` / `Assessment Request`, or transitions to `Interview Requested` and triggers Agent 4.
* Exposes `send_approved_reply(thread_id, to, subject, body)` gated behind explicit human approval (via Web UI or Telegram).

### 4.4 Agent 4: Interview & Calendar Coordinator (Web UI + Telegram HITL)
* Queries **Google Calendar API** (`freebusy.query`) over the next 7 business days within configured working hours to compute top 3 open slots (`Option A`, `Option B`, `Option C`).
* Publishes the pending interview coordination request to:
  1. **Frontend Web UI (Interview Coordinator Hub)**, and
  2. **Telegram Bot** (inline keyboard buttons).
* Once the user picks a slot and approves the drafted email reply (from either Web UI or Telegram), Agent 4 books the Google Calendar event with reminders, updates `Interview Date` & `Status = "Scheduled"` in Google Sheets, and triggers Agent 3 to send the Gmail response.

---

## 5. FastAPI Backend API Specification (`src/job_agent/api`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns health & connection status of Local ATS Checker, Google Sheets, Drive, Gmail, Calendar, and Telegram. |
| `GET` | `/api/dashboard/stats` | Returns aggregated KPI metrics (Total Sourced, Passed $\ge 50\%$, Skipped $<50\%$, Tailored, Applied, Interviews, Scheduled). |
| `GET` | `/api/jobs` | Lists all job rows from Google Sheets with filtering (`status`, `passed_gate`, `min_score`, `search`). |
| `PATCH` | `/api/jobs/{job_id}/status` | Manually updates a job's status (e.g., marking a `Tailored & Ready` job as `Applied` from the UI). |
| `POST` | `/api/workflows/source` | Triggers Workflow A (Agent 1 $\rightarrow$ Agent 2 batch run) with target roles, location, and limit. |
| `GET` | `/api/workflows/stream` | Server-Sent Events (SSE) stream emitting real-time agent step updates (`Sourcing`, `ATS Evaluating`, `Tailoring`, `Completed`). |
| `POST` | `/api/ats/evaluate` | Manual Sandbox endpoint: runs the **Existing Local ATS Checker** on any resume + job description and returns `MatchEvaluation`. |
| `POST` | `/api/resumes/{job_id}/tailor` | Triggers or re-triggers `gemini-2.5-pro` tailoring + PDF generation + Drive upload for a specific job. |
| `GET` | `/api/resumes/{job_id}/preview` | Returns the tailored Markdown text, local PDF stream, and Google Drive link for side-by-side preview. |
| `GET` | `/api/master-resume` | Fetches the current `data/master_resume.md` content. |
| `PUT` | `/api/master-resume` | Updates `data/master_resume.md` from the Frontend editor. |
| `POST` | `/api/workflows/inbox-sync` | Triggers Agent 3 Gmail inbox scan & classification. |
| `GET` | `/api/inbox/threads` | Lists classified recruiter emails and pending `Interview Invite` requests awaiting user action. |
| `GET` | `/api/interviews/{job_id}/slots` | Fetches proposed Google Calendar free slots (`Option A`, `Option B`, `Option C`) and drafted email reply. |
| `POST` | `/api/interviews/{job_id}/confirm` | Confirms selected calendar slot, books Google Calendar event, updates Google Sheets, and sends approved Gmail reply. |

---

## 6. Frontend Web Application Specification (`frontend/`)

Built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, and **shadcn/ui** components.

### 6.1 View 1: Command Center & Pipeline Overview (`/`)
* **KPI Summary Cards:**
  * *Total Jobs Sourced* | *Passed Gate ($\ge 50\%$)* | *Skipped ($< 50\%$)* | *Tailored & Ready* | *Interviews Requested / Scheduled*.
* **Quick Action Bar:**
  * **"Run Sourcing & Tailor Batch"** modal (select roles: Software, Mobile, Frontend, DevOps; remote toggle; max jobs).
  * **"Sync Gmail Inbox"** button.
* **Live Agent Execution Stream:**
  * Real-time SSE log console showing Agent 1 scraping, Agent 2 running the Local ATS Checker score, gate pass/skip decisions, and PDF/Drive uploads.

### 6.2 View 2: Job Tracker & ATS Gate Explorer (`/jobs`)
* **Interactive Data Table & Kanban Toggle:**
  * Mirrors the Google Sheet in real time with direct link to open the live Google Sheet.
  * **Columns:** Company, Role, Location/Remote, **ATS Match Score Badge** (Red `<50%`, Amber `50-69%`, Emerald `>=70%`), Gate Status (`Passed` / `Skipped`), Gap Analysis summary, Application Status dropdown (`Tailored & Ready` $\rightarrow$ `Applied` $\rightarrow$ `Interview Requested` $\rightarrow$ `Scheduled`), Tailored Resume PDF/Drive link, and Original Job URL.
* **Job Detail Drawer:**
  * Clicking any job opens a slide-over drawer showing the full Job Description, the Local ATS Checker's `missing_critical_skills` tags, `reasoning`, and tailored resume actions.

### 6.3 View 3: Resume Tailor Studio & Local ATS Sandbox (`/studio`)
* **Interactive Local ATS Checker Sandbox:**
  * Paste any Job Description (or pick a sourced job) and click **"Score with Local ATS Checker"** to immediately see the `match_score` gauge, missing critical skills, and gate result without spending `gemini-2.5-pro` tokens.
* **Side-by-Side Resume Diff & PDF Viewer:**
  * Left pane: **Master Resume** (`data/master_resume.md` editor).
  * Right pane: **Tailored Resume** (Markdown editor + rendered PDF preview + **"Open in Google Drive"** & **"Download PDF"** buttons).

### 6.4 View 4: Inbox & Interview Coordinator Hub (`/interviews`)
* **Classified Recruiter Inbox Feed (Agent 3):**
  * Filterable by badge: `Interview Invite`, `Assessment Request`, `Rejection`, `Neutral`.
* **Human-in-the-Loop Interview Scheduler Card (Agent 4):**
  * For any `Interview Requested` thread, displays the recruiter's message alongside **Google Calendar Open Slots** (`Option A`, `Option B`, `Option C`, or custom date/time picker).
  * **Draft Reply Editor & Approval Gate:** Shows the `gemini-2.5-flash` drafted email reply with an **"Approve, Book Calendar & Send Email"** button (synced with Telegram Bot state so approving in Telegram updates the Web UI and vice versa).

### 6.5 View 5: Integrations & System Settings (`/settings`)
* Live connectivity badges & configuration checks for:
  * **Existing Local ATS Checker** (Mode: `python_import` / `http_local` / `cli_subprocess`, endpoint/path status, test ping button)
  * **Google Sheets & Google Drive**
  * **Gmail & Google Calendar OAuth**
  * **JSearch API & Gemini API**
  * **Telegram Bot Webhook / Polling status**
