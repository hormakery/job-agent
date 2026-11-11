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
  Briefcase,
  Globe,
  Send,
  Calendar,
} from "lucide-react";

const ALL_STATUSES: ApplicationStatus[] = [
  "Skipped (<50% Match)",
  "Tailored & Ready",
  "Application Drafted",
  "Applied",
  "Assessment Requested",
  "Rejected",
  "Interview Requested",
  "Scheduled",
];

const KANBAN_COLUMNS: ApplicationStatus[] = [
  "Skipped (<50% Match)",
  "Tailored & Ready",
  "Application Drafted",
  "Applied",
  "Interview Requested",
  "Scheduled",
];

const PLATFORMS = ["ALL", "LinkedIn", "Indeed", "Glassdoor", "Direct", "Other"];

export default function JobTrackerPage() {
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gateFilter, setGateFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
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

  const displayedJobs = jobs.filter((j) => {
    if (platformFilter !== "ALL" && (j.source_platform || "Other") !== platformFilter) {
      return false;
    }
    return true;
  });

  function getPlatformBadge(platform?: string) {
    const p = platform || "Direct";
    if (p === "LinkedIn") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
          LinkedIn
        </span>
      );
    }
    if (p === "Indeed") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
          Indeed
        </span>
      );
    }
    if (p === "Glassdoor") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
          Glassdoor
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        {p}
      </span>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Google Sheets Job Tracker &amp; &ge;50% Gate Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Canonical 13-column relational state store shared across Agent 1 (Sourcing), Agent 2 (Tailor), Agent 3 (Dispatch), and Agent 4 (Calendar)
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
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === "ALL" ? "All Platforms" : p}
              </option>
            ))}
          </select>

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
          {displayedJobs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Briefcase className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">
                No jobs found in canonical state store
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No fake seed jobs exist. Run the Sourcing Workflow from the Command Center to fetch real postings from LinkedIn and JSearch and evaluate ATS matches.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-950/60">
                  <th className="py-3.5 px-4">Job ID</th>
                  <th className="py-3.5 px-4">Platform</th>
                  <th className="py-3.5 px-4">Company &amp; Role</th>
                  <th className="py-3.5 px-4">ATS Match</th>
                  <th className="py-3.5 px-4">Gate (&ge;50%)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date Applied</th>
                  <th className="py-3.5 px-4">Actions / Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {displayedJobs.map((job) => (
                  <tr
                    key={job.job_id}
                    onClick={() => setSelectedJob(job)}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                      {job.job_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {getPlatformBadge(job.source_platform)}
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
                          <CheckCircle2 className="w-4 h-4" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                          <XCircle className="w-4 h-4" /> SKIP
                        </span>
                      )}
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
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 cursor-pointer"
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                      {job.date_applied || "—"}
                    </td>
                    <td
                      className="py-3.5 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        {job.passed_gate && (
                          <button
                            onClick={() => handleReTailor(job.job_id)}
                            disabled={tailoringId === job.job_id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium border border-indigo-500/40 cursor-pointer"
                            title="Re-run Gemini 2.5 Pro Tailoring"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {tailoringId === job.job_id ? "Tailoring..." : "Tailor"}
                            </span>
                          </button>
                        )}
                        {job.job_url && (
                          <a
                            href={job.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-white"
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
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colJobs = displayedJobs.filter((j) => j.status === colStatus);
            return (
              <div
                key={colStatus}
                className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 truncate">
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
                        <span className="font-semibold text-white text-xs truncate">
                          {job.company_name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            job.passed_gate
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-rose-950 text-rose-300"
                          }`}
                        >
                          {job.initial_match_score}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 font-medium truncate">
                        {job.role_title}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>{job.source_platform || "Direct"}</span>
                        <span>{job.date_applied ? `Applied: ${job.date_applied}` : job.submission_method}</span>
                      </div>
                    </div>
                  ))}
                  {colJobs.length === 0 && (
                    <div className="text-[11px] text-slate-500 text-center py-4 italic">
                      Empty
                    </div>
                  )}
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
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-white">
                  {selectedJob.company_name} — {selectedJob.role_title}
                </h3>
                {getPlatformBadge(selectedJob.source_platform)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Job ID: {selectedJob.job_id} • Location: {selectedJob.location} • Submission Method: {selectedJob.submission_method || "portal_submission"} • Date Applied: {selectedJob.date_applied || "Not applied yet"}
              </p>
            </div>
            <button
              onClick={() => setSelectedJob(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-slate-800"
            >
              Close Inspector ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Job Description &amp; Local ATS Breakdown
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
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
