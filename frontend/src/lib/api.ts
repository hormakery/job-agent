import {
  ApplicationDispatchItem,
  ApplicationStatus,
  CandidateProfile,
  DashboardStats,
  EmailClassification,
  GoogleAuthStatus,
  InterviewCoordinationItem,
  JobSheetRow,
  MatchEvaluation,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/dashboard/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export async function fetchJobs(params?: {
  status?: string;
  passed_gate?: boolean;
  search?: string;
}): Promise<JobSheetRow[]> {
  const url = new URL(`${API_BASE}/api/jobs`);
  if (params?.status && params.status !== "ALL") url.searchParams.set("status", params.status);
  if (params?.passed_gate !== undefined)
    url.searchParams.set("passed_gate", String(params.passed_gate));
  if (params?.search) url.searchParams.set("search", params.search);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function updateJobStatus(
  jobId: string,
  status: ApplicationStatus,
  interview_date?: string
): Promise<JobSheetRow> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, interview_date }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function runSourcingWorkflow(payload: {
  roles: string[];
  location: string;
  remote_only: boolean;
  max_jobs: number;
}): Promise<{ logs: string[]; processed_count: number; processed_rows: JobSheetRow[] }> {
  const res = await fetch(`${API_BASE}/api/workflows/source`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to run sourcing workflow");
  return res.json();
}

export async function evaluateAtsMatch(
  job_description: string,
  master_resume?: string
): Promise<MatchEvaluation> {
  const res = await fetch(`${API_BASE}/api/ats/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_description, master_resume }),
  });
  if (!res.ok) throw new Error("Failed to run local ATS checker");
  return res.json();
}

export async function fetchAtsHealth(): Promise<{
  connected: boolean;
  service: string;
  latency_ms: number | null;
  endpoint: string;
  mode: string;
  repo_path: string;
  environment?: string;
  note?: string;
}> {
  const res = await fetch(`${API_BASE}/api/ats/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to check ATS health");
  return res.json();
}

export async function tailorJobResume(jobId: string): Promise<JobSheetRow> {
  const res = await fetch(`${API_BASE}/api/resumes/${jobId}/tailor`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to tailor resume");
  return res.json();
}

export async function fetchMasterResume(): Promise<{ path: string; content: string }> {
  const res = await fetch(`${API_BASE}/api/master-resume`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load master resume");
  return res.json();
}

export async function saveMasterResume(content: string): Promise<{ saved: boolean }> {
  const res = await fetch(`${API_BASE}/api/master-resume`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to save master resume");
  return res.json();
}

export async function fetchInboxThreads(): Promise<{
  emails: EmailClassification[];
  interviews: InterviewCoordinationItem[];
}> {
  const res = await fetch(`${API_BASE}/api/inbox/threads`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load inbox threads");
  return res.json();
}

export async function syncInboxWorkflow(): Promise<{
  logs: string[];
  emails: EmailClassification[];
  interviews: InterviewCoordinationItem[];
}> {
  const res = await fetch(`${API_BASE}/api/workflows/inbox-sync`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to sync inbox");
  return res.json();
}

export async function confirmInterviewSlot(
  jobId: string,
  slot_id: string,
  custom_draft_reply?: string
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/api/interviews/${jobId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot_id, custom_draft_reply }),
  });
  if (!res.ok) throw new Error("Failed to confirm interview slot");
  return res.json();
}

export async function fetchHealth(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("Backend offline");
  return res.json();
}

export async function fetchCandidateProfile(): Promise<CandidateProfile> {
  const res = await fetch(`${API_BASE}/api/candidate-profile`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load candidate profile");
  return res.json();
}

export async function saveCandidateProfile(profile: CandidateProfile): Promise<CandidateProfile> {
  const res = await fetch(`${API_BASE}/api/candidate-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save candidate profile");
  return res.json();
}

export async function fetchApplications(): Promise<ApplicationDispatchItem[]> {
  const res = await fetch(`${API_BASE}/api/applications`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load applications");
  return res.json();
}

export async function fetchApplicationByJobId(jobId: string): Promise<ApplicationDispatchItem> {
  const res = await fetch(`${API_BASE}/api/applications/${jobId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load application item");
  return res.json();
}

export async function prepareApplication(jobId: string): Promise<ApplicationDispatchItem> {
  const res = await fetch(`${API_BASE}/api/applications/${jobId}/prepare`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to prepare application package");
  return res.json();
}

export async function prepareAllApplications(): Promise<{
  prepared_count: number;
  applications: ApplicationDispatchItem[];
}> {
  const res = await fetch(`${API_BASE}/api/applications/prepare-all`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to prepare all application packages");
  return res.json();
}

export async function createApplicationDraft(
  jobId: string,
  customSubject?: string,
  customBody?: string
): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/applications/${jobId}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ custom_subject: customSubject, custom_body: customBody }),
  });
  if (!res.ok) throw new Error("Failed to create Gmail draft");
  return res.json();
}

export async function sendApplicationEmail(
  jobId: string,
  customSubject?: string,
  customBody?: string,
  draftId?: string
): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/applications/${jobId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      custom_subject: customSubject,
      custom_body: customBody,
      draft_id: draftId,
    }),
  });
  if (!res.ok) throw new Error("Failed to send application email");
  return res.json();
}

export async function markPortalApplicationApplied(jobId: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/applications/${jobId}/mark-applied`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark application as applied");
  return res.json();
}

export async function fetchGoogleAuthStatus(): Promise<GoogleAuthStatus> {
  const res = await fetch(`${API_BASE}/api/auth/google/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load Google auth status");
  return res.json();
}

export async function getGoogleAuthUrl(redirectUri?: string): Promise<{ url: string; state: string }> {
  const url = new URL(`${API_BASE}/api/auth/google/url`);
  if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to generate Google OAuth URL" }));
    throw new Error(err.detail || "Failed to generate Google OAuth URL");
  }
  return res.json();
}

export async function submitGoogleAuthCallback(code: string, redirectUri?: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/api/auth/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "OAuth exchange failed" }));
    throw new Error(err.detail || "OAuth exchange failed");
  }
  return res.json();
}

export async function disconnectGoogleAccount(): Promise<{ connected: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/google/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to disconnect Google account");
  return res.json();
}

export async function saveGoogleClientSecret(clientId: string, clientSecret: string): Promise<{ saved: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/google/client-secret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error("Failed to save client secrets");
  return res.json();
}

export async function syncAllJobsToGoogleSheet(): Promise<{ synced_count: number; sheet_id: string }> {
  const res = await fetch(`${API_BASE}/api/google/sheets/sync-all`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to sync to Google Sheet" }));
    throw new Error(err.detail || "Failed to sync to Google Sheet");
  }
  return res.json();
}

