import {
  ApplicationStatus,
  DashboardStats,
  EmailClassification,
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

