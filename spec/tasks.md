# Phased Implementation Tasks (`tasks.md`)

> **Execution Guide:** Work through phases sequentially (Phase 1 $\rightarrow$ Phase 6). Each task is atomic, strictly avoids hardcoded mock data, and enforces real-world integration verification against [`checklist.md`](./checklist.md).

---

## Phase 1: Clean Slate, Truthful State & Candidate Profile
**Goal:** Remove all synthetic dummy/seed records, establish truthful zero-state reporting, and configure the candidate's real profile.

- [x] **T1.1 — Wipe Synthetic Seed Data & Enforce Truthful Zero-State**
  - Delete dummy records from `data/state_store.json`.
  - Update `GoogleSheetsClient` so that it starts completely empty (`jobs: []`, `emails: []`, `interviews: []`).
  - Verify dashboard displays `0 Jobs Sourced, 0 Applied` when no real jobs exist.
- [x] **T1.2 — Candidate Profile Model & Configuration (`config.py` & `.env.example`)**
  - Implement `CandidateProfile` schema: `full_name`, `email`, `phone`, `linkedin_url`, `github_url`, `portfolio_url`, `location`.
  - Add configuration keys to `Settings` and `.env.example`.
  - Expose `GET /api/candidate-profile` and `PUT /api/candidate-profile` endpoints.
- [x] **T1.3 — Extend Job Schemas with Sourcing Origin & Application Method**
  - Update `ExtractedJobListing` and `JobSheetRow` with:
    - `source_platform`: `Literal["LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter", "Direct Career Site"]`.
    - `application_method`: `Literal["email_submission", "portal_submission"]`.
    - `application_email`: Optional direct email for jobs requiring email submission.
    - `date_applied`: Timestamp when application was actually submitted.
- [x] **T1.4 — Remove Telegram Dependencies**
  - Remove `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `telegram_bot.py`.
  - Remove all Telegram alerts from agent flows.

---

## Phase 2: Real Google Workspace OAuth2 Integration
**Goal:** Enable real Google account authentication for Gmail, Google Sheets, Google Drive, and Google Calendar.

- [x] **T2.1 — Google OAuth2 Flow Backend (`src/job_agent/integrations/google_auth.py`)**
  - Implement Google OAuth2 web flow using `google-auth-oauthlib`:
    - Scopes: `gmail.modify`, `gmail.compose`, `spreadsheets`, `drive.file`, `calendar`.
    - `GET /api/auth/google/url`: Returns Google OAuth authorization URL.
    - `POST /api/auth/google/callback`: Exchanges code for refresh token and stores in `credentials/token.json`.
    - `GET /api/auth/google/status`: Returns whether user is connected and authenticated email address.
    - `POST /api/auth/google/disconnect`: Revokes and deletes token.
- [x] **T2.2 — Real Google Sheets Sync (`sheets_client.py`)**
  - Connect `gspread` using live OAuth credentials / service account.
  - Create the canonical 13-column sheet header if sheet is new.
  - Implement real row read/write/update methods.
- [x] **T2.3 — Real Google Drive Uploader (`drive_client.py`)**
  - Upload tailored resume PDFs directly to user's Google Drive folder (`GOOGLE_DRIVE_RESUME_FOLDER_ID`) using live OAuth credentials.
  - Return shareable `webViewLink` for the Google Sheet.
- [x] **T2.4 — Next.js Google Account Connection Card (`/settings`)**
  - Add "Connect Google Account" button initiating OAuth flow.
  - Display connected account email, active Google services badges (Gmail, Sheets, Drive, Calendar), and "Disconnect" button.

---

## Phase 3: Live Integration with Your Real `ATS-Checker`
**Goal:** Connect Agent 2 directly to your local Express app at `/Users/beebee/Desktop/personal project/ATS-Checker`.

- [x] **T3.1 — ATS-Checker Service Client (`ats_adapter.py`)**
  - Implement HTTP client targeting the local Express ATS-Checker backend (`/api/scans/analyze` or upload endpoint).
  - Add fallback to CLI invocation (`npx tsx src/index.ts`) if the local HTTP server is not yet running.
- [x] **T3.2 — Health Check & Live Ping (`GET /api/ats/health`)**
  - Add endpoint checking connectivity to the local ATS-Checker service.
  - Surface live connection badge in Next.js Settings and ATS Studio pages.
- [x] **T3.3 — Output Normalization to `MatchEvaluation`**
  - Map the ATS-Checker's real response (scores, missing keywords, section breakdown) into canonical `MatchEvaluation`.

---

## Phase 4: Sourcing Engine & Platform Transparency (Agent 1)
**Goal:** Transparent job scraping with source tagging and application method detection.

- [x] **T4.1 — Multi-Platform Ingestion (`jsearch_client.py`)**
  - Extract and tag source platform (`LinkedIn`, `Indeed`, `Glassdoor`, `ZipRecruiter`, `Direct Career Site`).
- [x] **T4.2 — Application Method Detection**
  - Use `gemini-2.5-flash` with deterministic regex fallback to inspect job listing text and determine:
    - `email_submission` (detect recipient email e.g. `jobs@...`, `careers@...`).
    - `portal_submission` (detect application URL e.g. Greenhouse, Lever, Ashby, Workday, LinkedIn Easy Apply).
- [x] **T4.3 — Idempotent Deduplication**
  - Deduplicate against live Google Sheets `Job ID` column before passing to Agent 2.

---

## Phase 5: Application Dispatcher & Submission Engine (Agent 3)
**Goal:** Bridge the missing gap between tailored resumes and submitted applications.

- [ ] **T5.1 — Direct Email Application Engine (`src/job_agent/agents/agent3_dispatch.py`)**
  - Generate tailored, professional application cover email referencing candidate's matched skills, LinkedIn, portfolio, and contact details.
  - Attach tailored resume PDF.
  * Implement Gmail draft creation via Gmail API (`users().drafts().create`).
  * Implement 1-click "Send Application Email" via Gmail API (`users().messages().send`).
- [ ] **T5.2 — Portal / Form Application Package Generator**
  - For online portals/forms:
    - Package the direct application URL and 1-click tailored PDF download.
    - Pre-generate STAR-formatted answers for standard screening questions (years of experience, sponsorship, notice period, technical challenges overcome).
- [ ] **T5.3 — Application Dispatch Hub View in Next.js (`/dispatch`)**
  - Create dedicated view to review application packages:
    - Tab 1: Direct Email Applications (preview draft, edit recipient/subject/body, 1-click Send).
    - Tab 2: Portal / Form Applications (open portal link, download PDF, copy screening answers, 1-click "Mark as Applied").
- [ ] **T5.4 — Transition to `Applied` Status**
  - Upon sending email or marking portal submission, record `Date Applied` and transition status to **`Applied`** in Google Sheets.

---

## Phase 6: Post-Application Inbox Monitor & Calendar HITL (Agent 4)
**Goal:** Monitor recruiter replies strictly for submitted jobs and streamline interview scheduling.

- [ ] **T6.1 — Filtered Inbox Monitoring (`src/job_agent/agents/agent4_inbox.py`)**
  - Poll Gmail API *strictly for companies matching applications in `Applied` status*.
  - Classify responses into `Application Received`, `Under Review`, `Assessment Request`, `Rejection`, or `Interview Invite`.
- [ ] **T6.2 — Interview Link & Availability Detection**
  - For `Interview Invite`:
    - Detect recruiter scheduling links (Calendly, Ashby, Greenhouse, Lever).
    - If availability is requested, query Google Calendar API `freebusy` for open slots and draft a response.
- [ ] **T6.3 — Web UI Interview Coordinator & 1-Click Booking (`/interviews`)**
  - Display recruiter message alongside open calendar slots and booking link.
  - 1-click approval: books Google Calendar event and updates Google Sheets `Interview Date` + `Status = "Scheduled"`.
- [ ] **T6.4 — End-to-End Workflow Verification**
  - Run complete end-to-end test from Sourcing $\rightarrow$ ATS Gate $\rightarrow$ Tailor $\rightarrow$ Dispatch / Apply $\rightarrow$ Inbox Reply $\rightarrow$ Scheduled.
