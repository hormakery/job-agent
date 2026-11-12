"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  fetchDashboardStats,
  fetchJobs,
  runSourcingWorkflow,
  syncInboxWorkflow,
} from "@/lib/api";
import { DashboardStats, JobSheetRow } from "@/lib/types";
import { Button, Card, Badge, ScoreRing, useToast } from "@/components/ui";
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
  Copy,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Globe,
  MailCheck,
  Flame,
} from "lucide-react";

export default function CommandCenterPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobSheetRow[]>([]);
  const [logs, setLogs] = useState<string[]>([
    "[System] LangGraph 4-Agent Autonomous Orchestrator initialized.",
    "[Agent 2] Local ATS-Checker Gatekeeper active (strict >=50% cutoff).",
    "[Agent 3] Application Dispatch Engine ready (Direct Email & Portal Packages).",
    "[Agent 4] Post-Application Inbox & Calendar HITL initialized.",
  ]);
  const [runningSource, setRunningSource] = useState(false);
  const [runningInbox, setRunningInbox] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  async function handleRunSourcing() {
    setRunningSource(true);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [Orchestrator] Starting Workflow A: Agent 1 (Multi-Platform Sourcing) -> Agent 2 (ATS Gatekeeper & Gemini 2.5 Pro Tailoring)...`,
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
      showToast(`Sourcing complete! Processed ${res.processed_count} listings.`, "success");
    } catch (e: any) {
      setLogs((prev) => [...prev, `[Error] ${e.message}`]);
      showToast(e.message || "Sourcing workflow failed", "error");
    } finally {
      setRunningSource(false);
    }
  }

  async function handleSyncInbox() {
    setRunningInbox(true);
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] [Orchestrator] Starting Workflow B: Agent 4 (Strict Applied Inbox Scanner) -> Calendar HITL Coordinator...`,
    ]);
    try {
      const res = await syncInboxWorkflow();
      setLogs((prev) => [...prev, ...res.logs]);
      await loadData();
      showToast(`Inbox synced! Classified ${res.emails.length} threads.`, "info");
    } catch (e: any) {
      setLogs((prev) => [...prev, `[Error] ${e.message}`]);
      showToast(e.message || "Inbox sync failed", "error");
    } finally {
      setRunningInbox(false);
    }
  }

  function copyLogs() {
    navigator.clipboard.writeText(logs.join("\n"));
    showToast("Terminal logs copied to clipboard!", "info");
  }

  function clearLogs() {
    setLogs(["[System] Logs cleared."]);
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="indigo" size="sm" withDot>
              Autonomous Multi-Agent System
            </Badge>
            <span className="text-xs text-slate-500 font-mono">
              Next.js 15 • Gemini 2.5 • LangGraph
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
            Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Autonomous job pipeline coordinating Sourcing (Agent 1), ATS Gatekeeper (Agent 2), Application Dispatcher (Agent 3), and Calendar Coordinator (Agent 4).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="md"
            loading={runningSource}
            icon={<Play className="w-3.5 h-3.5" />}
            onClick={handleRunSourcing}
          >
            {runningSource ? "Running Sourcing & Tailoring..." : "Run Sourcing & Tailor Batch"}
          </Button>

          <Button
            variant="secondary"
            size="md"
            loading={runningInbox}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${runningInbox ? "animate-spin" : ""}`} />}
            onClick={handleSyncInbox}
          >
            {runningInbox ? "Scanning Inbox..." : "Sync Recruiter Inbox"}
          </Button>
        </div>
      </div>

      {/* 4-Stage Pipeline Flow Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stage 1: Sourcing */}
        <div className="glass-panel-interactive p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center text-xs font-bold font-mono">
                1
              </span>
              <span className="text-xs font-bold text-slate-200">Sourcing Engine</span>
            </div>
            <Badge variant="sky" size="sm">
              Agent 1
            </Badge>
          </div>
          <div className="text-2xl font-black text-white tabular-nums tracking-tight">
            {stats?.total_jobs_sourced ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Multi-platform ingestion</span>
            <span className="font-mono text-sky-400">LinkedIn/Indeed</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <Link href="/jobs" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
              View Jobs <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stage 2: ATS Gate & Tailor */}
        <div className="glass-panel-interactive p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold font-mono">
                2
              </span>
              <span className="text-xs font-bold text-slate-200">ATS Gate & Tailor</span>
            </div>
            <Badge variant="emerald" size="sm">
              Agent 2
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-300 tabular-nums tracking-tight">
            {stats?.passed_gate_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Passed &ge;50% Cutoff</span>
            <span className="font-mono text-emerald-400">Gemini 2.5 Pro</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <Link href="/studio" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
              ATS Studio <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stage 3: Dispatch & Apply */}
        <div className="glass-panel-interactive p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs font-bold font-mono">
                3
              </span>
              <span className="text-xs font-bold text-slate-200">Application Dispatch</span>
            </div>
            <Badge variant="indigo" size="sm">
              Agent 3
            </Badge>
          </div>
          <div className="text-2xl font-black text-indigo-300 tabular-nums tracking-tight">
            {stats?.applied_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Verified Applied</span>
            <span className="font-mono text-indigo-400">Gmail & Portals</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <Link href="/dispatch" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
              Dispatch Hub <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stage 4: Interview & Scheduling */}
        <div className="glass-panel-interactive p-4 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs font-bold font-mono">
                4
              </span>
              <span className="text-xs font-bold text-slate-200">Interview HITL</span>
            </div>
            <Badge variant="amber" size="sm">
              Agent 4
            </Badge>
          </div>
          <div className="text-2xl font-black text-amber-300 tabular-nums tracking-tight">
            {stats?.interview_requested_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Scheduled: {stats?.scheduled_count ?? 0}</span>
            <span className="font-mono text-amber-400">Google Calendar</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <Link href="/interviews" className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
              Coordinator <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: State Feed & Execution Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* State Feed (Recent Decisions) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <span>Relational State Feed</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  Recent Decisions
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time tracking synchronized across ATS Gate, Tailored Resumes, and Google Sheets
              </p>
            </div>
            <Link
              href="/jobs"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="p-12 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  No applications in state store yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Start with a clean slate. Click &quot;Run Sourcing &amp; Tailor Batch&quot; to fetch realistic job listings and evaluate ATS match scores.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 flex-1 overflow-y-auto max-h-[460px]">
              {recentJobs.map((job) => (
                <div
                  key={job.job_id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm group-hover:text-indigo-300 transition">
                        {job.company_name}
                      </span>
                      <span className="text-slate-600 text-xs">•</span>
                      <span className="text-slate-300 text-xs truncate font-medium">
                        {job.role_title}
                      </span>
                      {job.source_platform && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 font-mono">
                          {job.source_platform}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {job.gap_analysis || "Evaluated by local ATS Checker"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <ScoreRing score={job.initial_match_score} size="sm" />
                    <Badge
                      variant={
                        job.status === "Scheduled"
                          ? "cyan"
                          : job.status === "Interview Requested"
                          ? "amber"
                          : job.status === "Applied"
                          ? "emerald"
                          : job.status === "Tailored & Ready"
                          ? "indigo"
                          : "slate"
                      }
                      size="sm"
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live LangGraph Execution Console */}
        <div className="glass-panel rounded-2xl flex flex-col h-[520px] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Agent Telemetry Console
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyLogs}
                title="Copy logs"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={clearLogs}
                title="Clear logs"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] space-y-2 text-slate-300 bg-slate-950/80 select-text leading-relaxed">
            {logs.map((line, i) => {
              let color = "text-slate-300";
              if (line.includes("[Agent 1]")) color = "text-sky-300";
              else if (line.includes("[Agent 2]")) color = "text-indigo-300";
              else if (line.includes("[Agent 3]")) color = "text-purple-300";
              else if (line.includes("[Agent 4]")) color = "text-amber-300";
              else if (line.includes("PASSED GATE")) color = "text-emerald-400 font-bold";
              else if (line.includes("SKIPPED")) color = "text-rose-400";
              else if (line.includes("[Error]")) color = "text-red-400 font-bold";

              return (
                <div key={i} className={`break-words ${color}`}>
                  {line}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
