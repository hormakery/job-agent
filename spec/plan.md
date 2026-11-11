# Phased Implementation Plan (`plan.md`)

> **Project:** Autonomous 4-Agent Job Application, Dispatch & Interview Coordinator (Full-Stack)  
> **Version:** 2.0.0 (Truthful Lifecycle: Zero Fake Seed Data, Real Google Auth, Application Dispatch & ATS-Checker Integration)

---

## 1. Architectural Strategy & Phased Breakdown

Instead of jumping from resume tailoring straight to "Interview Requested", the architecture now enforces the real-world job application lifecycle:

```
[Agent 1: Sourcing] 
       │ (Platform Tagged: LinkedIn / Indeed / Direct)
       ▼
[Agent 2: Local ATS-Checker Gate (>=50%)]
       │
       ├── [< 50% Match] ──► Status: Skipped (<50% Match) + Log Gap Analysis
       │
       └── [>= 50% Match] ──► Agent 2: Tailors Resume (STAR method) + Renders PDF
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │   Agent 3: Application Dispatcher & Submission Hub     │
       │                                                        │
       │  • Email Application: Drafts/Sends in Gmail with       │
       │    tailored PDF + LinkedIn + Portfolio attached.       │
       │                                                        │
       │  • Portal / LinkedIn Application: Packages direct link │
       │    + PDF download + AI screening answers.              │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                         Status: APPLIED (Timestamped)
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │     Agent 4: Inbox Monitor & Calendar HITL Hub         │
       │  (Only monitors companies that have reached Applied)   │
       │                                                        │
       │  • Detects Rejections, Assessments, or Interview Invites│
       │  • Surfaces recruiter links (Calendly/Ashby) with      │
       │    conflict-free Google Calendar slots side-by-side.   │
       │  • 1-Click calendar booking + email reply in Web UI.   │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Six Implementation Phases

### Phase 1: Clean Slate, Truthful State & Candidate Profile
* **Goal:** Eliminate all fake seed data and establish candidate profile configuration.
* **Tasks:**
  * Wipe dummy records from `data/state_store.json`. Ensure dashboard shows truthful zero state (`0 Jobs Sourced, 0 Applied`).
  * Add `CandidateProfile` model and configuration (`FULL_NAME`, `CANDIDATE_EMAIL`, `CANDIDATE_PHONE`, `LINKEDIN_URL`, `GITHUB_URL`, `PORTFOLIO_URL`).
  * Extend `ExtractedJobListing` with `source_platform` (`LinkedIn`, `Indeed`, `Direct`) and `application_method` (`email_submission` vs `portal_submission`).
  * Remove all Telegram dependencies and configurations across the project.

### Phase 2: Real Google Workspace OAuth2 Integration
* **Goal:** Enable real Google account authentication for Gmail, Google Sheets, Google Drive, and Google Calendar.
* **Tasks:**
  * Implement Google OAuth2 endpoints (`/api/auth/google/url`, `/api/auth/google/callback`, `/api/auth/google/status`, `/api/auth/google/disconnect`) using `google-auth-oauthlib`.
  * Store credentials securely in `credentials/token.json` (git-ignored).
  * Build live "Connect Google Account" modal/card in Next.js Settings UI showing authenticated email and active scopes.
  * Connect live bidirectional Google Sheets sync (`gspread`) and Google Drive PDF uploads.

### Phase 3: Live Integration with Your Real `ATS-Checker`
* **Goal:** Connect Agent 2 directly to your local Express app at `/Users/beebee/Desktop/personal project/ATS-Checker`.
* **Tasks:**
  * Configure `ATSCheckerAdapter` to target the local ATS-Checker service (`http://localhost:5000` or configured port) or CLI bridge.
  * Implement health ping endpoint (`GET /api/ats/health`) verifying live connection to your ATS-Checker.
  * Map real ATS output (scores, missing keywords, section breakdown) into `MatchEvaluation`.

### Phase 4: Sourcing Engine & Platform Transparency (Agent 1)
* **Goal:** Transparent job scraping with source tagging and application method detection.
* **Tasks:**
  * Tag job listings with their origin platform: `LinkedIn`, `Indeed`, `Glassdoor`, `Direct Portal`.
  * Auto-detect if job specifies direct email submission (`jobs@...`) or portal submission (LinkedIn Easy Apply, Greenhouse, Lever, Ashby, Workday).
  * Enforce deterministic MD5 `job_id` deduplication against Google Sheets.

### Phase 5: Application Dispatcher & Submission Engine (Agent 3)
* **Goal:** Bridge the missing gap between tailored resumes and submitted applications.
* **Tasks:**
  * **Email Submission Engine:**
    * Generate tailored, professional cover email referencing candidate's matched skills, LinkedIn, and portfolio.
    * Attach tailored resume PDF.
    * Save draft directly to user's live Gmail account via Gmail API (with 1-click "Send from Gmail" option in Web UI).
  * **Portal / Form Submission Package:**
    * Provide direct application URL + 1-click tailored PDF download.
    * Pre-generate STAR-formatted answers for screening questions.
  * **Timestamped Status Tracking:**
    * Transition state to **`Applied`** with date and submission channel.

### Phase 6: Post-Application Inbox Monitor & Calendar HITL (Agent 4)
* **Goal:** Monitor replies for submitted jobs and streamline interview scheduling.
* **Tasks:**
  * Poll Gmail threads *strictly for companies in `Applied` status*.
  * Classify responses into `Application Received`, `Under Review`, `Assessment Request`, `Rejection`, or `Interview Invite`.
  * For `Interview Invite`:
    * Detect recruiter scheduling links (Calendly, Ashby, Greenhouse, Lever) and display conflict-free Google Calendar slots side-by-side in the Web UI.
    * For availability requests, draft a reply with open slots for 1-click user approval.
    * On confirmation, book the event on Google Calendar and update Google Sheets to `Scheduled`.
