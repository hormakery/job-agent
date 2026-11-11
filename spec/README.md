# Spec-Driven Development (SDD) Suite — `job-agent` (Version 2.0.0)

This `spec/` directory contains the complete **Spec-Driven Development (SDD)** blueprint for building the **Full-Stack Autonomous Job Application, Dispatch & Interview Coordinator** (`job-agent`).

Version 2.0.0 eliminates all architectural loopholes: it mandates **zero synthetic seed data**, establishes the missing **Application Dispatch Engine**, integrates **real Google Workspace OAuth2** (Gmail, Sheets, Drive, Calendar), connects directly to your **existing local ATS-Checker**, and removes all unnecessary Telegram friction in favor of a unified **Next.js Web Command Center**.

---

## Document Index

| File | Purpose |
| :--- | :--- |
| **[`constitution.md`](./constitution.md)** | **Non-Negotiable Rules & Invariants:** Zero fake seed data policy, mandatory application dispatch before interview tracking, reuse of your existing local ATS-Checker, candidate profile injection, and tech standards. |
| **[`spec.md`](./spec.md)** | **Technical & Behavioral Specification:** Pydantic models (`CandidateProfile`, `ExtractedJobListing`, `MatchEvaluation`, `ApplicationDispatch`, `EmailClassification`), 13-column Google Sheets schema, truthful lifecycle state machine, real Google OAuth2 contracts, and Next.js view specifications. |
| **[`plan.md`](./plan.md)** | **Phased Implementation Strategy:** Detailed architectural breakdown across 6 sequential, fully verified phases (Foundation $\rightarrow$ Google OAuth2 $\rightarrow$ ATS-Checker $\rightarrow$ Sourcing $\rightarrow$ Dispatch $\rightarrow$ Inbox/Calendar). |
| **[`tasks.md`](./tasks.md)** | **Actionable Task Checklist:** Granular checklist covering every technical deliverable across Phases 1 through 6. |
| **[`checklist.md`](./checklist.md)** | **Quality Gates:** Strict verification criteria (Gates 1 through 6) that must pass before advancing from one phase to the next. |

---

## Key Architectural Decisions in Version 2.0.0

1. **Truthful State & Zero Fake Data:**
   * No hardcoded seed rows like "Stripe in Interview Requested". If zero applications have been sent, the dashboard truthfully reflects `0 Jobs Applied`.
2. **The Application Dispatch Engine (Agent 3):**
   * Eliminates the missing link between resume tailoring and interview tracking.
   * Handles **Direct Email Applications** (tailored cover email + PDF attachment + candidate LinkedIn/portfolio dispatched via Gmail API).
   * Handles **Portal Applications** (LinkedIn Easy Apply, Greenhouse, Lever, Ashby, Workday, Google Forms) with direct links and AI-generated answers for screening questions.
   * Records the exact `Date Applied` and submission channel before any inbox monitoring occurs.
3. **Real Google Workspace Authentication (OAuth2):**
   * Standardized Google OAuth2 flow granting live access to Gmail, Google Sheets, Google Drive, and Google Calendar.
4. **Direct Integration with Your Existing `ATS-Checker`:**
   * Agent 2 talks directly to your local Express ATS-Checker backend at `/Users/beebee/Desktop/personal project/ATS-Checker`.
5. **Single Web Command Center (Next.js 15):**
   * All tracking, ATS scoring, resume editing, application email review, and interview scheduling take place directly in the Next.js Web Dashboard. Telegram has been removed.
