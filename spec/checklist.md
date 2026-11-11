# Phase Quality Gate & Verification Checklist (`checklist.md`)

> **Purpose:** Before transitioning from one implementation phase to the next, every item in that phase's checklist must pass without using hardcoded or simulated seed data.

---

## Gate 1: Clean Slate & Candidate Profile Quality Gate
- [x] **C1.1:** `data/state_store.json` contains no hardcoded or fake application entries.
- [x] **C1.2:** The Next.js dashboard truthfully displays `0 Jobs Sourced, 0 Applied` when no real jobs exist.
- [x] **C1.3:** `CandidateProfile` model is implemented with `full_name`, `email`, `phone`, `linkedin_url`, `github_url`, and `portfolio_url`.
- [x] **C1.4:** Telegram code and configuration keys are fully removed from the codebase.

---

## Gate 2: Real Google Workspace OAuth2 Quality Gate
- [ ] **C2.1:** `/api/auth/google/url` returns a valid Google OAuth2 authorization link requesting required scopes (`gmail.modify`, `gmail.compose`, `spreadsheets`, `drive.file`, `calendar`).
- [ ] **C2.2:** Completing the OAuth2 flow saves valid tokens in `credentials/token.json` and updates `/api/auth/google/status` with the connected email address.
- [ ] **C2.3:** Live Google Sheets sync verifies that newly created or updated applications write directly to the user's remote Google Sheet.
- [ ] **C2.4:** Live Google Drive upload creates a valid PDF in the user's specified folder and returns an accessible `webViewLink`.

---

## Gate 3: Live ATS-Checker Integration Quality Gate
- [ ] **C3.1:** `/api/ats/health` reports green status when communicating with the local Express ATS-Checker backend (`/Users/beebee/Desktop/personal project/ATS-Checker`).
- [ ] **C3.2:** Submitting a job description through `ATSCheckerAdapter` returns a real ATS score, matched skills, and missing critical skills from the ATS-Checker.
- [ ] **C3.3:** The Next.js `/studio` page reflects the real score and gap analysis returned by the ATS-Checker.

---

## Gate 4: Sourcing Engine & Platform Transparency Quality Gate
- [ ] **C4.1:** Sourced jobs carry a transparent `source_platform` tag (`LinkedIn`, `Indeed`, `Glassdoor`, `Direct Career Site`).
- [ ] **C4.2:** Agent 1 accurately detects `application_method` (`email_submission` vs `portal_submission`) from listing text.
- [ ] **C4.3:** Deterministic `job_id` deduplication prevents duplicate rows from being created.

---

## Gate 5: Application Dispatcher & Submission Quality Gate
- [ ] **C5.1:** For email submissions, Agent 3 generates a professional cover email including the candidate's real LinkedIn URL, portfolio, and contact details, and creates a live draft in Gmail with the tailored PDF attached.
- [ ] **C5.2:** For portal submissions, Agent 3 packages the direct portal link, PDF download, and AI-generated answers for common application questions.
- [ ] **C5.3:** No job transitions to `Under Review` or `Interview Requested` without first having an explicit `Applied` status and timestamp recorded.

---

## Gate 6: Post-Application Inbox & Calendar HITL Quality Gate
- [ ] **C6.1:** Agent 4 queries Gmail *strictly for companies that have reached `Applied` status*.
- [ ] **C6.2:** Recruiter scheduling links (Calendly, Ashby, Greenhouse, Lever) are extracted and displayed alongside conflict-free Google Calendar slots in the Web UI.
- [ ] **C6.3:** 1-Click calendar booking confirms the event on Google Calendar and updates the Google Sheet with the confirmed interview date.
