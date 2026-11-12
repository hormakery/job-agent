"use client";

import { useEffect, useState } from "react";
import {
  API_BASE,
  evaluateAtsMatch,
  fetchAtsHealth,
  fetchJobs,
  fetchMasterResume,
  tailorJobResume,
} from "@/lib/api";
import { JobSheetRow, MatchEvaluation } from "@/lib/types";
import { Badge, Button, Card, ScoreRing, useToast } from "@/components/ui";
import {
  Gauge,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Server,
  ShieldCheck,
  Zap,
  Download,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";

export default function AtsAndTailorStudioPage() {
  const { showToast } = useToast();
  const [masterResume, setMasterResume] = useState<string>("");
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jdInput, setJdInput] = useState<string>(
    "We are looking for a Senior Full-Stack & Mobile Engineer experienced in Python, FastAPI, TypeScript, React, Next.js, React Native, Docker, Kubernetes, and AWS."
  );
  const [evaluation, setEvaluation] = useState<MatchEvaluation | null>(null);
  const [atsHealth, setAtsHealth] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [tailoring, setTailoring] = useState(false);

  useEffect(() => {
    fetchAtsHealth().then(setAtsHealth).catch(console.error);
    Promise.all([fetchMasterResume(), fetchJobs()]).then(([mr, jb]) => {
      setMasterResume(mr.content);
      setJobs(jb);
      const firstPassed = jb.find((j) => j.passed_gate) || jb[0];
      if (firstPassed) {
        setSelectedJobId(firstPassed.job_id);
        setJdInput(firstPassed.raw_description);
      }
    });
  }, []);

  const currentJob = jobs.find((j) => j.job_id === selectedJobId) || null;

  async function handleRunLocalAts() {
    setEvaluating(true);
    try {
      const res = await evaluateAtsMatch(jdInput, masterResume);
      setEvaluation(res);
      showToast(`Evaluation completed! Match score: ${res.match_score}%`, res.passed_threshold ? "success" : "info");
    } catch (err: any) {
      showToast(err.message || "Failed to score with local ATS", "error");
    } finally {
      setEvaluating(false);
    }
  }

  async function handleTailorSelectedJob() {
    if (!currentJob) return;
    setTailoring(true);
    try {
      const updated = await tailorJobResume(currentJob.job_id);
      setJobs((prev) =>
        prev.map((j) => (j.job_id === updated.job_id ? updated : j))
      );
      showToast(`Tailored resume generated for ${currentJob.company_name}!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to tailor resume", "error");
    } finally {
      setTailoring(false);
    }
  }

  const score = evaluation?.match_score ?? currentJob?.initial_match_score ?? 0;
  const passed = evaluation?.passed_threshold ?? currentJob?.passed_gate ?? false;
  const reasoning =
    evaluation?.reasoning ??
    currentJob?.gap_analysis ??
    "Click 'Evaluate with Local ATS' to calculate real ATS score and gaps.";
  const matchedSkills = evaluation?.matched_skills ?? currentJob?.matched_skills ?? [];
  const missingSkills =
    evaluation?.missing_critical_skills ?? currentJob?.missing_critical_skills ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <Badge variant="indigo" size="sm" withDot>
            Agent 2 Studio
          </Badge>
          <span className="text-xs text-slate-500 font-mono">
            ATS Pre-Filtering &amp; Gemini 2.5 Pro Tailoring
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          ATS Sandbox &amp; Resume Tailor Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Score any job description against your Master Resume using your local ATS Checker, enforce the &ge;50% gatekeeper cutoff, and preview STAR tailored resumes.
        </p>
      </div>

      {/* ATS Integration Health Banner */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Server className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-slate-300 font-semibold">ATS Integration Engine:</span>
          {atsHealth?.connected ? (
            <Badge variant="emerald" size="sm" withDot>
              Live Express Backend ({atsHealth.service} • {atsHealth.latency_ms ?? 5}ms)
            </Badge>
          ) : (
            <Badge variant="amber" size="sm" withDot>
              Built-in Heuristic Engine (Hard Skills 50%, Role 30%, Domain 20%)
            </Badge>
          )}
        </div>
        <span className="text-slate-500 font-mono text-[11px] truncate">
          Target: {atsHealth?.endpoint || "http://127.0.0.1:4000/api/v1/scans/analyze"}
        </span>
      </div>

      {/* Top Panel: Local ATS Checker Live Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white text-sm">
                Step 1: Job Description Pre-Assessment
              </h2>
            </div>

            {jobs.length > 0 && (
              <select
                value={selectedJobId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedJobId(id);
                  const found = jobs.find((j) => j.job_id === id);
                  if (found) setJdInput(found.raw_description);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.company_name} — {j.role_title} ({j.initial_match_score}%)
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea
            rows={5}
            value={jdInput}
            onChange={(e) => setJdInput(e.target.value)}
            placeholder="Paste any job description here to evaluate with your Local ATS Checker..."
            className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              loading={evaluating}
              icon={<Gauge className="w-4 h-4" />}
              onClick={handleRunLocalAts}
            >
              {evaluating ? "Evaluating..." : "Evaluate with Local ATS Checker"}
            </Button>

            {currentJob && (
              <Button
                variant="success"
                size="sm"
                loading={tailoring}
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleTailorSelectedJob}
              >
                {tailoring
                  ? "Tailoring with Gemini 2.5 Pro..."
                  : `Tailor & Render PDF for ${currentJob.company_name}`}
              </Button>
            )}
          </div>
        </div>

        {/* ATS Gate Scorecard */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Gatekeeper Verdict
              </span>
              <Badge variant={passed ? "emerald" : "rose"} size="sm" withDot>
                {passed ? "Passed (\u226550%)" : "Below Cutoff"}
              </Badge>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-3xl font-black text-white tabular-nums tracking-tight">
                  {score}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  ATS Match Score
                </div>
              </div>
              <ScoreRing score={score} size="lg" />
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
              {reasoning}
            </div>

            {/* Missing vs Matched Skills */}
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400">
                Missing Key Requirements:
              </div>
              <div className="flex flex-wrap gap-1">
                {missingSkills.length > 0 ? (
                  missingSkills.map((sk) => (
                    <Badge key={sk} variant="rose" size="sm">
                      ✗ {sk}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Master Resume */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">
                Canonical Master Resume (Ground Truth)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              data/master_resume.md
            </span>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
            {masterResume || "Loading master resume..."}
          </pre>
        </div>

        {/* Right: Tailored Resume Preview */}
        <div className="glass-panel p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Tailored STAR Resume Preview
              </h3>
            </div>
            {currentJob?.local_pdf_path && (
              <a
                href={`${API_BASE}/api/resumes/${currentJob.job_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </a>
            )}
          </div>

          {currentJob?.tailored_markdown ? (
            <pre className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-emerald-200/90 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
              {currentJob.tailored_markdown}
            </pre>
          ) : (
            <div className="p-12 text-center rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-300">
                No Tailored Resume Available
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Jobs that score below 50% are skipped to eliminate false tailoring. For passed jobs, click &quot;Tailor &amp; Render PDF&quot; above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
