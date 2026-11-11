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
} from "lucide-react";

export default function AtsAndTailorStudioPage() {
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
    } finally {
      setTailoring(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white">
          Local ATS Checker Sandbox &amp; Resume Tailor Studio
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Test any job description against your Existing Local ATS Checker (&ge;50% gatekeeper) and preview side-by-side tailored resumes &amp; PDFs
        </p>
      </div>

      {/* ATS Integration Health Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Server className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300 font-semibold">ATS Integration Engine:</span>
          {atsHealth?.connected ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Express ATS-Checker Connected ({atsHealth.service} • {atsHealth.latency_ms}ms latency)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Built-in ATS Scorer Active (50% Hard Skills, 30% Role, 20% Domain)</span>
            </span>
          )}
        </div>
        <span className="text-slate-400 font-mono text-[11px] truncate">
          Target: {atsHealth?.endpoint || "http://127.0.0.1:4000/api/v1/scans/analyze"}
        </span>
      </div>

      {/* Top Panel: Local ATS Checker Live Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-indigo-400" />
              <h2 className="font-semibold text-white">
                Step 1: Pre-Assessment via Local ATS Checker
              </h2>
            </div>

            <select
              value={selectedJobId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedJobId(id);
                const found = jobs.find((j) => j.job_id === id);
                if (found) setJdInput(found.raw_description);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
            >
              {jobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  {j.company_name} — {j.role_title} ({j.initial_match_score}%)
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={5}
            value={jdInput}
            onChange={(e) => setJdInput(e.target.value)}
            placeholder="Paste any job description here to score with your Local ATS Checker..."
            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunLocalAts}
              disabled={evaluating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Gauge className="w-4 h-4" />
              {evaluating
                ? "Scoring with Local ATS..."
                : "Score with Existing Local ATS Checker"}
            </button>

            {currentJob && (
              <button
                onClick={handleTailorSelectedJob}
                disabled={tailoring}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {tailoring
                  ? "Tailoring via Gemini 2.5 Pro..."
                  : `Tailor & Render PDF for ${currentJob.company_name}`}
              </button>
            )}
          </div>
        </div>

        {/* ATS Gate Scorecard */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              ATS Gatekeeper Verdict
            </div>

            {(() => {
              const score =
                evaluation?.match_score ??
                currentJob?.initial_match_score ??
                0;
              const passed =
                evaluation?.passed_threshold ??
                currentJob?.passed_gate ??
                false;
              const reasoning =
                evaluation?.reasoning ??
                currentJob?.gap_analysis ??
                "Click 'Score with Existing Local ATS Checker' to evaluate.";
              const missing =
                evaluation?.missing_critical_skills ??
                currentJob?.missing_critical_skills ??
                [];

              return (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-4xl font-extrabold text-white">
                      {score}%
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        passed
                          ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                          : "bg-rose-950 text-rose-300 border-rose-700"
                      }`}
                    >
                      {passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> PASSED (&ge;50%)
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> BLOCKED (&lt;50%)
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {reasoning}
                  </p>

                  {missing.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-rose-400 mb-1">
                        Missing Critical Skills:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {missing.map((sk) => (
                          <span
                            key={sk}
                            className="px-2 py-0.5 rounded text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            Engine:{" "}
            <span className="font-mono text-slate-300">
              {evaluation?.ats_source ?? "local_ats_checker"}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Master Resume vs Tailored Resume + PDF Link */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Canonical Master Resume (data/master_resume.md)
            </span>
          </div>
          <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-[420px] overflow-y-auto">
            {masterResume}
          </pre>
        </div>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Tailored Resume Output ({currentJob?.company_name ?? "Selected Job"})
            </span>
            {currentJob && currentJob.passed_gate && (
              <a
                href={`${API_BASE}/api/resumes/${currentJob.job_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Rendered PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <pre className="p-4 text-xs text-slate-200 font-mono whitespace-pre-wrap max-h-[420px] overflow-y-auto">
            {currentJob?.tailored_markdown ||
              "This job scored <50% on the Local ATS Gatekeeper, so tailoring was skipped to prevent false resume tailoring and save tokens."}
          </pre>
        </div>
      </div>
    </div>
  );
}

