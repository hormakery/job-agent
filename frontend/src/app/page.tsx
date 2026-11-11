"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchDashboardStats,
  fetchJobs,
  runSourcingWorkflow,
  syncInboxWorkflow,
} from "@/lib/api";
import { DashboardStats, JobSheetRow } from "@/lib/types";
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Terminal,
  ArrowUpRight,
  Sparkles,
  Send,
  Briefcase,
} from "lucide-react";

export default function CommandCenterPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobSheetRow[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "[System] LangGraph 4-Agent Orchestrator ready.",
    "[Agent 2] Local ATS Checker bridge connected (Threshold gate >= 50%).",
  ]);
  const [runningSource, setRunningSource] = useState(false);
  const [runningInbox, setRunningInbox] = useState(false);

  async function loadData() {
    try {
      const [s, j] = await Promise.all([fetchDashboardStats(), fetchJobs()]);
      setStats(s);
      setRecentJobs(j.slice(0, 8));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRunSourcing() {
    setRunningSource(true);
    setLogs((prev) => [
      ...prev,
      "[Orchestrator] Starting Workflow A: Agent 1 (JSearch Scraper) -> Agent 2 (Local ATS Gate >=50% & Gemini 2.5 Pro Tailor)...",
    ]);
    try {
      const res = await runSourcingWorkflow({
        roles: [
          "Software Engineer",
          "Mobile Engineer",
          "Frontend Engineer",
          "DevOps Engineer",
        ],
        location: "Remote",
        remote_only: true,
        max_jobs: 6,
      });
      setLogs((prev) => [...prev, ...res.logs]);
      await loadData();
    } catch (e: any) {
      setLogs((prev) => [...prev, `[Error] ${e.message}`]);
    } finally {
      setRunningSource(false);
    }
  }

  async function handleSyncInbox() {
    setRunningInbox(true);
    setLogs((prev) => [
      ...prev,
      "[Orchestrator] Starting Workflow B: Agent 3 (Gmail Classifier) -> Agent 4 (Google Calendar + HITL)...",
    ]);
    try {
      const res = await syncInboxWorkflow();
      setLogs((prev) => [...prev, ...res.logs]);
      await loadData();
    } catch (e: any) {
      setLogs((prev) => [...prev, `[Error] ${e.message}`]);
    } finally {
      setRunningInbox(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Autonomous Job Application Command Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Coordinating Agent 1 (Scraper), Agent 2 (Local ATS &ge;50% Gate &amp; Tailor), Agent 3 (Gmail Monitor), and Agent 4 (Calendar HITL)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunSourcing}
            disabled={runningSource}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            {runningSource
              ? "Running Agent 1 & 2..."
              : "Run Sourcing & ATS Gate Batch"}
          </button>

          <button
            onClick={handleSyncInbox}
            disabled={runningInbox}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 text-sm font-medium border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${runningInbox ? "animate-spin" : ""}`}
            />
            {runningInbox ? "Scanning Gmail..." : "Sync Inbox (Agent 3 & 4)"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Total Sourced</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.total_jobs_sourced ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Avg Score: {stats?.average_match_score ?? 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
            <span>Passed Gate (&ge;50%)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">
            {stats?.passed_gate_count ?? 0}
          </div>
          <div className="text-xs text-emerald-400/80 mt-1">
            Tailored via Gemini 2.5 Pro
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-medium">
            <span>Tailored &amp; Ready</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.tailored_ready_count ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Drafted: {stats?.application_drafted_count ?? 0}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/50">
          <div className="flex items-center justify-between text-xs text-blue-300 font-medium">
            <span>Applications Sent</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 mt-1">
            {stats?.applied_count ?? 0}
          </div>
          <div className="text-xs text-blue-400/80 mt-1">
            Dispatched to recruiters
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50">
          <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
            <span>Interview Invites</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">
            {stats?.interview_requested_count ?? 0}
          </div>
          <div className="text-xs text-amber-400/80 mt-1">
            Awaiting slot approval
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/50">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-medium">
            <span>Scheduled</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">
            {stats?.scheduled_count ?? 0}
          </div>
          <div className="text-xs text-cyan-400/80 mt-1">
            Booked on Google Calendar
          </div>
        </div>
      </div>

      {/* Live Agent Execution Console + Recent Gate Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Gatekeeper Decisions */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white text-base">
                Google Sheets State Feed (Recent Gate Decisions)
              </h2>
              <p className="text-xs text-slate-400">
                Live state tracked across Agent 1, Agent 2, Agent 3, and Agent 4
              </p>
            </div>
            <Link
              href="/jobs"
              className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
            >
              <span>Open Full Job Tracker</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Briefcase className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-200">
                No jobs sourced yet
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &quot;Run Sourcing &amp; ATS Gate Batch&quot; above to fetch real jobs and run local ATS match evaluations.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {recentJobs.map((job) => (
                <div
                  key={job.job_id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-slate-100 text-sm">
                        {job.company_name}
                      </span>
                      <span className="text-slate-400 text-sm">•</span>
                      <span className="text-slate-300 text-sm truncate">
                        {job.role_title}
                      </span>
                      {job.source_platform && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {job.source_platform}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {job.gap_analysis}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                        job.passed_gate
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                          : "bg-rose-950/60 text-rose-300 border-rose-700/50"
                      }`}
                    >
                      {job.initial_match_score}% Match
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Agent Telemetry Log */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 flex flex-col h-[420px]">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              LangGraph Agent Execution Console
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-2 text-slate-300">
            {logs.map((line, i) => (
              <div
                key={i}
                className={`leading-relaxed ${
                  line.includes("PASSED GATE")
                    ? "text-emerald-400"
                    : line.includes("SKIPPED")
                    ? "text-rose-400"
                    : line.includes("[Error]")
                    ? "text-red-400"
                    : "text-slate-300"
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

