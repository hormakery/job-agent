"use client";

import { useEffect, useState } from "react";
import { API_BASE, fetchJobs, tailorJobResume, updateJobStatus } from "@/lib/api";
import { ApplicationStatus, JobSheetRow } from "@/lib/types";
import {
  Search,
  ExternalLink,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Table2,
  Kanban,
} from "lucide-react";

const ALL_STATUSES: ApplicationStatus[] = [
  "Skipped (<50% Match)",
  "Tailored & Ready",
  "Applied",
  "Assessment Requested",
  "Rejected",
  "Interview Requested",
  "Scheduled",
];

const KANBAN_COLUMNS: ApplicationStatus[] = [
  "Skipped (<50% Match)",
  "Tailored & Ready",
  "Applied",
  "Interview Requested",
  "Scheduled",
];

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gateFilter, setGateFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<JobSheetRow | null>(null);
  const [tailoringId, setTailoringId] = useState<string | null>(null);

  async function loadJobs() {
    const passed_gate =
      gateFilter === "PASSED" ? true : gateFilter === "SKIPPED" ? false : undefined;
    const rows = await fetchJobs({
      status: statusFilter,
      passed_gate,
      search: search || undefined,
    });
    setJobs(rows);
    if (selectedJob) {
      const updated = rows.find((r) => r.job_id === selectedJob.job_id);
      if (updated) setSelectedJob(updated);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [statusFilter, gateFilter, search]);

  async function handleStatusChange(jobId: string, newStatus: ApplicationStatus) {
    await updateJobStatus(jobId, newStatus);
    await loadJobs();
  }

  async function handleReTailor(jobId: string) {
    setTailoringId(jobId);
    try {
      await tailorJobResume(jobId);
      await loadJobs();
    } finally {
      setTailoringId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Google Sheets Job Tracker &amp; &ge;50% Gate Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Canonical 11-column relational state store shared by Agents 1–4
          </p>
        </div>

        {/* Filters & Table/Kanban Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, role, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          >
            <option value="ALL">All Gate Outcomes</option>
            <option value="PASSED">Passed Gate (&ge;50%)</option>
            <option value="SKIPPED">Skipped (&lt;50%)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode: Table vs Kanban */}
      {viewMode === "table" ? (
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-4">Job ID</th>
                <th className="py-3.5 px-4">Company &amp; Role</th>
                <th className="py-3.5 px-4">ATS Match Score</th>
                <th className="py-3.5 px-4">Passed Gate (&ge;50%)</th>
                <th className="py-3.5 px-4">Gap Analysis (Local ATS)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Tailored Resume / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {jobs.map((job) => (
                <tr
                  key={job.job_id}
                  onClick={() => setSelectedJob(job)}
                  className="hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {job.job_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">
                      {job.company_name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {job.role_title} • {job.location}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        job.initial_match_score >= 70
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60"
                          : job.initial_match_score >= 50
                          ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                          : "bg-rose-950/70 text-rose-300 border-rose-700/60"
                      }`}
                    >
                      {job.initial_match_score}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {job.passed_gate ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> TRUE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                        <XCircle className="w-4 h-4" /> FALSE
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {job.gap_analysis}
                    </p>
                  </td>
                  <td
                    className="py-3.5 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={job.status}
                      onChange={(e) =>
                        handleStatusChange(
                          job.job_id,
                          e.target.value as ApplicationStatus
                        )
                      }
                      className="px-2.5 py-1.5 rounded-md bg-slate-950 border border-slate-700 text-xs text-slate-100"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td
                    className="py-3.5 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      {job.passed_gate && (
                        <a
                          href={`${API_BASE}/api/resumes/${job.job_id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleReTailor(job.job_id)}
                        disabled={tailoringId === job.job_id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>
                          {tailoringId === job.job_id
                            ? "Tailoring..."
                            : "Tailor"}
                        </span>
                      </button>
                      {job.job_url && (
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-white"
                          title="Open Original Job Posting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colJobs = jobs.filter((j) => j.status === colStatus);
            return (
              <div
                key={colStatus}
                className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {colStatus}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                    {colJobs.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colJobs.map((job) => (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJob(job)}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white text-xs">
                          {job.company_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            job.passed_gate
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-rose-950 text-rose-300"
                          }`}
                        >
                          {job.initial_match_score}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium">
                        {job.role_title}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {job.gap_analysis}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Job Inspector Drawer / Card */}
      {selectedJob && (
        <div className="p-6 rounded-xl bg-slate-900 border border-indigo-500/40 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {selectedJob.company_name} — {selectedJob.role_title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Job ID: {selectedJob.job_id} • Location: {selectedJob.location} •
                Interview Date: {selectedJob.interview_date || "Not scheduled"}
              </p>
            </div>
            <button
              onClick={() => setSelectedJob(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close Inspector ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Job Description &amp; Local ATS Breakdown
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedJob.raw_description}
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                {selectedJob.matched_skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800"
                  >
                    ✓ {sk}
                  </span>
                ))}
                {selectedJob.missing_critical_skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-2 py-0.5 rounded text-[11px] bg-rose-950 text-rose-300 border border-rose-800"
                  >
                    ✗ Missing: {sk}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Tailored Resume Preview (Gemini 2.5 Pro)
              </div>
              {selectedJob.tailored_markdown ? (
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                  {selectedJob.tailored_markdown}
                </pre>
              ) : (
                <p className="text-xs text-rose-400">
                  Skipped tailoring because initial ATS score ({selectedJob.initial_match_score}%) was below the 50% threshold gate.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
