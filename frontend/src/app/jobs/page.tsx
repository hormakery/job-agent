"use client";

import { useEffect, useState } from "react";
import { API_BASE, fetchJobs, tailorJobResume, updateJobStatus } from "@/lib/api";
import { ApplicationStatus, JobSheetRow } from "@/lib/types";
import { Badge, Button, Card, ScoreRing, useToast } from "@/components/ui";
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
  X,
  Download,
  Filter,
  ArrowUpDown,
  Building2,
  Clock,
  Layers,
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

const PLATFORMS = ["ALL", "LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter", "Direct Career Site"];

export default function JobTrackerPage() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [gateFilter, setGateFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<JobSheetRow | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"ats" | "resume" | "metadata">("ats");
  const [tailoringId, setTailoringId] = useState<string | null>(null);

  async function loadJobs() {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, [statusFilter, gateFilter, search]);

  async function handleStatusChange(jobId: string, newStatus: ApplicationStatus) {
    try {
      await updateJobStatus(jobId, newStatus);
      await loadJobs();
      showToast(`Status updated to "${newStatus}"`, "success");
    } catch {
      showToast("Failed to update status", "error");
    }
  }

  async function handleReTailor(jobId: string) {
    setTailoringId(jobId);
    try {
      await tailorJobResume(jobId);
      await loadJobs();
      showToast("Resume tailored successfully with Gemini 2.5 Pro!", "success");
    } catch (err: any) {
      showToast(err.message || "Tailoring failed", "error");
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              Canonical State Store
            </span>
            <span className="text-xs text-slate-500 font-mono">
              13 Columns • Multi-Platform
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Job Tracker &amp; ATS Gate Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time pipeline state tracked across Sourcing (Agent 1), ATS Gate (Agent 2), Dispatch (Agent 3), and Calendar (Agent 4).
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-900/90 border border-slate-800/80 p-1 shadow-sm">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search company, role, skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Application Statuses</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Gate Filter */}
          <select
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Gate Results</option>
            <option value="PASSED">Passed Gate (&ge;50%)</option>
            <option value="SKIPPED">Skipped (&lt;50%)</option>
          </select>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === "ALL" ? "All Platforms" : p}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] font-mono text-slate-400 shrink-0">
          Showing <span className="font-bold text-white">{displayedJobs.length}</span> of {jobs.length} jobs
        </div>
      </div>

      {/* Main View: Table vs Kanban */}
      {viewMode === "table" ? (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-4 py-3">Company & Role</th>
                  <th className="px-4 py-3">Origin Platform</th>
                  <th className="px-4 py-3 text-center">ATS Score</th>
                  <th className="px-4 py-3">Gate Verdict</th>
                  <th className="px-4 py-3">Pipeline Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Date Applied</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center">
                      <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <div className="text-sm font-semibold text-slate-300">No jobs match your filter</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Try clearing search terms or running a new sourcing batch from the Command Center.
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedJobs.map((job) => (
                    <tr
                      key={job.job_id}
                      className="hover:bg-slate-800/30 transition group cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      {/* Company & Role */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-300 border border-indigo-500/25 flex items-center justify-center font-bold text-xs shrink-0">
                            {job.company_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white group-hover:text-indigo-300 transition">
                              {job.company_name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {job.role_title}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Origin Platform */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            job.source_platform === "LinkedIn"
                              ? "sky"
                              : job.source_platform === "Indeed"
                              ? "indigo"
                              : job.source_platform === "Glassdoor"
                              ? "emerald"
                              : "slate"
                          }
                          size="sm"
                        >
                          {job.source_platform || "Direct"}
                        </Badge>
                      </td>

                      {/* ATS Score */}
                      <td className="px-4 py-3.5 text-center">
                        <ScoreRing score={job.initial_match_score} size="sm" />
                      </td>

                      {/* Gate Verdict */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={job.passed_gate ? "emerald" : "rose"}
                          size="sm"
                          withDot
                        >
                          {job.passed_gate ? "Passed (\u226550%)" : "Skipped (<50%)"}
                        </Badge>
                      </td>

                      {/* Pipeline Status */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={job.status}
                          onChange={(e) =>
                            handleStatusChange(job.job_id, e.target.value as ApplicationStatus)
                          }
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Submission Method */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            job.submission_method === "email_submission"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {job.submission_method === "email_submission" ? "Direct Email" : "Portal"}
                        </span>
                      </td>

                      {/* Date Applied */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                        {job.date_applied ? (
                          <span className="text-emerald-400 font-semibold">
                            {new Date(job.date_applied).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-600">Not Applied</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleReTailor(job.job_id)}
                            disabled={tailoringId === job.job_id}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition disabled:opacity-50"
                          >
                            {tailoringId === job.job_id ? "..." : "Tailor"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colJobs = displayedJobs.filter((j) => j.status === colStatus);

            return (
              <div
                key={colStatus}
                className="rounded-2xl glass-panel p-3 flex flex-col min-w-[220px]"
              >
                <div className="flex items-center justify-between px-1 pb-2.5 mb-2.5 border-b border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
                    {colStatus}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 font-bold">
                    {colJobs.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                  {colJobs.map((job) => (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJob(job)}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/60 transition cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs truncate group-hover:text-indigo-300 transition">
                          {job.company_name}
                        </span>
                        <ScoreRing score={job.initial_match_score} size="sm" />
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium truncate">
                        {job.role_title}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span className="font-mono">{job.source_platform || "Direct"}</span>
                        <span>{job.date_applied ? "Applied" : "Pending"}</span>
                      </div>
                    </div>
                  ))}

                  {colJobs.length === 0 && (
                    <div className="text-[11px] text-slate-500 text-center py-8 italic font-sans">
                      No jobs in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Job Inspector Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-250">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedJob.passed_gate ? "emerald" : "rose"}
                    size="sm"
                    withDot
                  >
                    {selectedJob.passed_gate ? "Passed Gate (\u226550%)" : "Skipped (<50%)"}
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {selectedJob.job_id}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedJob.company_name} — {selectedJob.role_title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{selectedJob.location}</span>
                  <span>•</span>
                  <span>{selectedJob.source_platform}</span>
                  <span>•</span>
                  <span>{selectedJob.submission_method}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedJob(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center gap-2 px-5 border-b border-slate-800 bg-slate-950/20">
              <button
                onClick={() => setActiveDrawerTab("ats")}
                className={`py-3 text-xs font-semibold border-b-2 transition ${
                  activeDrawerTab === "ats"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                ATS Match &amp; Gaps ({selectedJob.initial_match_score}%)
              </button>
              <button
                onClick={() => setActiveDrawerTab("resume")}
                className={`py-3 text-xs font-semibold border-b-2 transition ${
                  activeDrawerTab === "resume"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Tailored Resume (STAR)
              </button>
              <button
                onClick={() => setActiveDrawerTab("metadata")}
                className={`py-3 text-xs font-semibold border-b-2 transition ${
                  activeDrawerTab === "metadata"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Listing &amp; Raw Description
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {activeDrawerTab === "ats" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        Local ATS Checker Match Score
                      </div>
                      <div className="text-2xl font-black text-white mt-0.5">
                        {selectedJob.initial_match_score}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {selectedJob.gap_analysis}
                      </div>
                    </div>
                    <ScoreRing score={selectedJob.initial_match_score} size="lg" />
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Matched Core Competencies:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.matched_skills.length > 0 ? (
                        selectedJob.matched_skills.map((sk) => (
                          <Badge key={sk} variant="emerald" size="sm">
                            ✓ {sk}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">None detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Missing Critical Skills:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.missing_critical_skills.length > 0 ? (
                        selectedJob.missing_critical_skills.map((sk) => (
                          <Badge key={sk} variant="rose" size="sm">
                            ✗ {sk}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No critical missing skills</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === "resume" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Grounded strictly in Master Resume (STAR method)
                    </span>
                    <a
                      href={`${API_BASE}/api/resumes/${selectedJob.job_id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                  </div>

                  {selectedJob.tailored_markdown ? (
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
                      {selectedJob.tailored_markdown}
                    </pre>
                  ) : (
                    <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-rose-400">
                        Tailoring skipped because match score ({selectedJob.initial_match_score}%) was below the 50% cutoff gate.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === "metadata" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Origin URL:</span>
                    {selectedJob.job_url ? (
                      <a
                        href={selectedJob.job_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-mono inline-flex items-center gap-1"
                      >
                        {selectedJob.job_url.slice(0, 45)}... <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto font-sans">
                    {selectedJob.raw_description || "No description available"}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedJob(null)}
              >
                Close
              </Button>

              <Button
                variant="primary"
                size="sm"
                loading={tailoringId === selectedJob.job_id}
                onClick={() => handleReTailor(selectedJob.job_id)}
              >
                Re-Tailor Resume (Gemini 2.5 Pro)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
