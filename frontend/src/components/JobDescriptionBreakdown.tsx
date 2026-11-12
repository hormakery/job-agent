"use client";

import React, { useState, useMemo } from "react";
import { JobSheetRow } from "@/lib/types";
import { Badge, Button, Card, ScoreRing } from "@/components/ui";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Shield,
  Sparkles,
  Target,
  Wrench,
  XCircle,
} from "lucide-react";

interface JobDescriptionBreakdownProps {
  job: JobSheetRow;
  onClose?: () => void;
  onReTailor?: () => void;
  isTailoring?: boolean;
}

interface ParsedJobSections {
  overview: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  compensation: string[];
}

export function parseJobDescription(raw: string): ParsedJobSections {
  if (!raw || raw.trim().length === 0) {
    return {
      overview: "No detailed description provided in the original listing.",
      responsibilities: [],
      requirements: [],
      preferred: [],
      compensation: [],
    };
  }

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: ParsedJobSections = {
    overview: "",
    responsibilities: [],
    requirements: [],
    preferred: [],
    compensation: [],
  };

  let currentSection: "overview" | "responsibilities" | "requirements" | "preferred" | "compensation" = "overview";
  const overviewLines: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Section detection heuristics
    if (
      lower.includes("responsibilit") ||
      lower.includes("what you'll do") ||
      lower.includes("what you will do") ||
      lower.includes("the role") ||
      lower.includes("duties")
    ) {
      currentSection = "responsibilities";
      continue;
    } else if (
      lower.includes("requirement") ||
      lower.includes("what you bring") ||
      lower.includes("qualifications") ||
      lower.includes("who you are") ||
      lower.includes("skills") ||
      lower.includes("must have")
    ) {
      currentSection = "requirements";
      continue;
    } else if (
      lower.includes("nice to have") ||
      lower.includes("preferred") ||
      lower.includes("bonus") ||
      lower.includes("plus")
    ) {
      currentSection = "preferred";
      continue;
    } else if (
      lower.includes("compensation") ||
      lower.includes("salary") ||
      lower.includes("benefits") ||
      lower.includes("perks") ||
      lower.includes("we offer")
    ) {
      currentSection = "compensation";
      continue;
    }

    // Is it a bullet point?
    const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || /^\d+\./.test(line);
    const cleaned = line.replace(/^[•\-*\d.]+\s*/, "").trim();

    if (currentSection === "overview") {
      if (overviewLines.length < 5 && !isBullet) {
        overviewLines.push(line);
      } else if (isBullet) {
        sections.responsibilities.push(cleaned);
      }
    } else if (currentSection === "responsibilities") {
      if (cleaned.length > 5) sections.responsibilities.push(cleaned);
    } else if (currentSection === "requirements") {
      if (cleaned.length > 5) sections.requirements.push(cleaned);
    } else if (currentSection === "preferred") {
      if (cleaned.length > 5) sections.preferred.push(cleaned);
    } else if (currentSection === "compensation") {
      if (cleaned.length > 5) sections.compensation.push(cleaned);
    }
  }

  sections.overview = overviewLines.join(" ") || lines.slice(0, 3).join(" ");
  return sections;
}

export function JobDescriptionBreakdown({
  job,
  onClose,
  onReTailor,
  isTailoring = false,
}: JobDescriptionBreakdownProps) {
  const [activeTab, setActiveTab] = useState<"breakdown" | "ats" | "resume" | "raw">("breakdown");

  const parsed = useMemo(() => parseJobDescription(job.raw_description), [job.raw_description]);

  return (
    <div className="flex flex-col h-full bg-[#080c14] text-slate-100">
      {/* Drawer Top Header */}
      <div className="p-5 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight truncate">
                {job.role_title}
              </span>
              <Badge
                variant={job.passed_gate ? "emerald" : "rose"}
                size="sm"
                pulse={job.passed_gate}
              >
                {job.passed_gate ? "Passed Gate (\u226550%)" : "Skipped (<50%)"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                {job.company_name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.is_remote ? "Remote" : job.location || "Location not specified"}
              </span>
              <span>•</span>
              <Badge variant="neutral" size="sm">
                {job.source_platform || "Direct"}
              </Badge>
              <span>•</span>
              <Badge
                variant={job.submission_method === "email_submission" ? "cyan" : "purple"}
                size="sm"
              >
                {job.submission_method === "email_submission" ? "Direct Email" : "Portal Form"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ScoreRing score={job.initial_match_score} size="md" />
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center border border-white/[0.06] transition"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mt-5 border-b border-white/[0.06] -mb-5 pb-0">
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "breakdown"
                ? "border-cyan-500 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Structured Breakdown
          </button>

          <button
            onClick={() => setActiveTab("ats")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "ats"
                ? "border-indigo-500 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            ATS Gap Matrix ({job.initial_match_score}%)
          </button>

          <button
            onClick={() => setActiveTab("resume")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "resume"
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tailored Resume (STAR)
          </button>

          <button
            onClick={() => setActiveTab("raw")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "raw"
                ? "border-amber-500 text-amber-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Raw Description
          </button>
        </div>
      </div>

      {/* Main Drawer Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: Structured Breakdown */}
        {activeTab === "breakdown" && (
          <div className="space-y-4">
            {/* Quick Badges / Meta Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Work Mode</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {job.is_remote ? "100% Remote" : "Hybrid / Onsite"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Location</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {job.location || "Unspecified"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Visa Sponsorship</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {job.sponsorship_explicitly_mentioned ? "Available / Mentioned" : "Not Stated"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Original Listing</span>
                {job.job_url ? (
                  <a
                    href={job.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-cyan-400 hover:text-cyan-300 mt-0.5 inline-flex items-center gap-1 truncate"
                  >
                    Open Post <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500 mt-0.5 block">N/A</span>
                )}
              </div>
            </div>

            {/* Role Mission / Overview */}
            {parsed.overview && (
              <Card variant="glass" className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <Compass className="w-4 h-4" />
                  <span>Role Mission &amp; Executive Summary</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {parsed.overview}
                </p>
              </Card>
            )}

            {/* Key Responsibilities */}
            {parsed.responsibilities.length > 0 && (
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <Layers className="w-4 h-4" />
                    <span>Key Responsibilities ({parsed.responsibilities.length})</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  {parsed.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Technical Stack & Requirements */}
            {parsed.requirements.length > 0 && (
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Wrench className="w-4 h-4" />
                    <span>Technical Stack &amp; Qualifications ({parsed.requirements.length})</span>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  {parsed.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Preferred / Nice to Haves */}
            {parsed.preferred.length > 0 && (
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                  <Sparkles className="w-4 h-4" />
                  <span>Preferred / Bonus Skills ({parsed.preferred.length})</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  {parsed.preferred.map((pref, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5" />
                      <span>{pref}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Compensation & Benefits */}
            {parsed.compensation.length > 0 && (
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <DollarSign className="w-4 h-4" />
                  <span>Compensation &amp; Benefits</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  {parsed.compensation.map((comp, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{comp}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: ATS Gap & Competency Matrix */}
        {activeTab === "ats" && (
          <div className="space-y-4">
            <Card variant="glass" className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400">
                  ATS Checker Match Score
                </div>
                <div className="text-3xl font-black text-white mt-0.5 font-mono">
                  {job.initial_match_score}%
                </div>
                <div className="text-xs text-slate-400 mt-1 max-w-md">
                  {job.gap_analysis || "Scored against your canonical Master Resume."}
                </div>
              </div>
              <ScoreRing score={job.initial_match_score} size="lg" />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Matched Skills */}
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Matched Competencies ({job.matched_skills.length})</span>
                  </div>
                  <Badge variant="emerald" size="sm">Ground Truth</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {job.matched_skills.length > 0 ? (
                    job.matched_skills.map((sk) => (
                      <Badge key={sk} variant="emerald" size="sm">
                        ✓ {sk}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None detected</span>
                  )}
                </div>
              </Card>

              {/* Missing Skills */}
              <Card variant="glass" className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Missing / Gap Skills ({job.missing_critical_skills.length})</span>
                  </div>
                  <Badge variant="rose" size="sm">ATS Gate Risk</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {job.missing_critical_skills.length > 0 ? (
                    job.missing_critical_skills.map((sk) => (
                      <Badge key={sk} variant="rose" size="sm">
                        ✗ {sk}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No critical missing skills</span>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 3: Tailored Resume (STAR) */}
        {activeTab === "resume" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Grounded strictly in Master Resume (No Hallucinations)
              </span>
              <a
                href={`http://127.0.0.1:8080/api/resumes/${job.job_id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Tailored PDF
              </a>
            </div>

            {job.tailored_markdown ? (
              <pre className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {job.tailored_markdown}
              </pre>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-950/80 border border-white/[0.08]">
                <p className="text-xs text-rose-400">
                  Tailoring skipped because match score ({job.initial_match_score}%) was below the 50% cutoff gate.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Raw Description */}
        {activeTab === "raw" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Original Listing Source:</span>
              {job.job_url ? (
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1"
                >
                  {job.job_url.slice(0, 50)}... <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500">N/A</span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto font-mono">
              {job.raw_description || "No description text available."}
            </div>
          </div>
        )}
      </div>

      {/* Drawer Bottom Actions */}
      <div className="p-4 border-t border-white/[0.08] bg-slate-950/90 backdrop-blur-md flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>

        {onReTailor && (
          <Button
            variant="primary"
            size="sm"
            isLoading={isTailoring}
            onClick={onReTailor}
            className="shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Re-Tailor Resume (Gemini 2.5 Pro)
          </Button>
        )}
      </div>
    </div>
  );
}

