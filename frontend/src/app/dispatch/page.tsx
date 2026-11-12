"use client";

import { useEffect, useState } from "react";
import {
  createApplicationDraft,
  fetchApplications,
  fetchCandidateProfile,
  fetchJobs,
  markPortalApplicationApplied,
  prepareAllApplications,
  sendApplicationEmail,
  API_BASE,
} from "@/lib/api";
import { ApplicationDispatchItem, CandidateProfile, JobSheetRow } from "@/lib/types";
import {
  Mail,
  ExternalLink,
  Send,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Inbox,
  Globe,
  Building2,
  CheckCircle2,
  Download,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function DispatchHubPage() {
  const [applications, setApplications] = useState<ApplicationDispatchItem[]>([]);
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"email" | "portal" | "dispatched">("email");
  const [preparingAll, setPreparingAll] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  // Editable email drafts state: key = job_id
  const [emailEdits, setEmailEdits] = useState<
    Record<string, { recipient: string; subject: string; body: string }>
  >({});

  async function loadData() {
    try {
      setLoading(true);
      const [appsData, jobsData, profData] = await Promise.all([
        fetchApplications().catch(() => []),
        fetchJobs().catch(() => []),
        fetchCandidateProfile().catch(() => null),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
      setProfile(profData);

      // Initialize draft edits
      const edits: Record<string, { recipient: string; subject: string; body: string }> = {};
      appsData.forEach((app) => {
        edits[app.job_id] = {
          recipient: app.recipient_email || "",
          subject: app.cover_subject || `Application: ${app.role_title} - ${profData?.full_name || "Candidate"}`,
          body: app.cover_body || "",
        };
      });
      setEmailEdits((prev) => ({ ...edits, ...prev }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handlePrepareAll() {
    setPreparingAll(true);
    try {
      await prepareAllApplications();
      await loadData();
      setFeedbackMsg({
        id: "global",
        message: "Successfully generated dispatch packages for all pending tailored jobs.",
        type: "success",
      });
    } catch (err: any) {
      setFeedbackMsg({
        id: "global",
        message: err.message || "Failed to prepare packages",
        type: "error",
      });
    } finally {
      setPreparingAll(false);
    }
  }

  async function handleCreateDraft(jobId: string) {
    const edit = emailEdits[jobId];
    setActionInProgress(`draft_${jobId}`);
    try {
      const res = await createApplicationDraft(jobId, edit?.subject, edit?.body);
      await loadData();
      setFeedbackMsg({
        id: jobId,
        message: `Gmail draft created successfully (${res.mode === "gmail_api" ? "Synced to Gmail" : "Simulated Outbox"})!`,
        type: "success",
      });
    } catch (err: any) {
      setFeedbackMsg({
        id: jobId,
        message: err.message || "Failed to create draft",
        type: "error",
      });
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleSendEmail(jobId: string) {
    const edit = emailEdits[jobId];
    setActionInProgress(`send_${jobId}`);
    try {
      await sendApplicationEmail(jobId, edit?.subject, edit?.body);
      await loadData();
      setFeedbackMsg({
        id: jobId,
        message: "Application email sent! Job status transitioned to 'Applied'.",
        type: "success",
      });
    } catch (err: any) {
      setFeedbackMsg({
        id: jobId,
        message: err.message || "Failed to send email",
        type: "error",
      });
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleMarkApplied(jobId: string) {
    setActionInProgress(`mark_${jobId}`);
    try {
      await markPortalApplicationApplied(jobId);
      await loadData();
      setFeedbackMsg({
        id: jobId,
        message: "Marked as Applied! Google Sheets status updated with submission timestamp.",
        type: "success",
      });
    } catch (err: any) {
      setFeedbackMsg({
        id: jobId,
        message: err.message || "Failed to mark as applied",
        type: "error",
      });
    } finally {
      setActionInProgress(null);
    }
  }

  const emailApps = applications.filter(
    (a) => a.submission_method === "email_submission" && a.status !== "Dispatched (Sent)"
  );
  const portalApps = applications.filter(
    (a) => a.submission_method === "portal_submission" && a.status !== "Dispatched (Sent)"
  );
  const dispatchedApps = applications.filter((a) => a.status === "Dispatched (Sent)");

  // Jobs tailored and ready that haven't been prepared yet
  const readyJobIds = new Set(applications.map((a) => a.job_id));
  const unPreparedJobs = jobs.filter(
    (j) => j.passed_gate && j.status === "Tailored & Ready" && !readyJobIds.has(j.job_id)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Agent 3 • Dispatch Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
              Human-in-the-Loop Review
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Application Dispatch Hub
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Review tailored application packages, create live Gmail drafts, dispatch verified emails, and copy STAR answers for portal forms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handlePrepareAll}
            disabled={preparingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {preparingAll ? "Generating Packages..." : "Prepare All Pending Packages"}
          </button>
        </div>
      </div>

      {/* Global alert feedback */}
      {feedbackMsg && feedbackMsg.id === "global" && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            feedbackMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{feedbackMsg.message}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-sky-400" />
            Direct Email Pending
          </div>
          <div className="text-2xl font-bold text-white mt-1">{emailApps.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Ready for 1-click send or Gmail draft</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-purple-400" />
            Portal Submissions Ready
          </div>
          <div className="text-2xl font-bold text-white mt-1">{portalApps.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">URL + Resume PDF + Screening Q&A</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Dispatched & Applied
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{dispatchedApps.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Recorded with application timestamp</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Unprepared Tailored Jobs
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{unPreparedJobs.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Click &quot;Prepare All&quot; to package</div>
        </div>
      </div>

      {/* Candidate Profile Quick-Bar */}
      {profile && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">{profile.full_name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{profile.email}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{profile.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Quick Copy:</span>
            {profile.linkedin_url && (
              <button
                onClick={() => copyToClipboard(profile.linkedin_url, "prof_li")}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1"
              >
                {copiedKey === "prof_li" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                LinkedIn
              </button>
            )}
            {profile.portfolio_url && (
              <button
                onClick={() => copyToClipboard(profile.portfolio_url, "prof_port")}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1"
              >
                {copiedKey === "prof_port" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Portfolio
              </button>
            )}
            {profile.github_url && (
              <button
                onClick={() => copyToClipboard(profile.github_url, "prof_gh")}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1"
              >
                {copiedKey === "prof_gh" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                GitHub
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "email"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          Direct Email Applications ({emailApps.length})
        </button>

        <button
          onClick={() => setActiveTab("portal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "portal"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" />
          Portal / Form Packages ({portalApps.length})
        </button>

        <button
          onClick={() => setActiveTab("dispatched")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "dispatched"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Dispatched History ({dispatchedApps.length})
        </button>
      </div>

      {/* Tab 1: Direct Email Applications */}
      {activeTab === "email" && (
        <div className="space-y-4">
          {emailApps.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
              <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-300">
                No Pending Direct Email Applications
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                When Agent 1 identifies roles with direct hiring emails (e.g. jobs@company.com), and Agent 2 approves them through the ATS Gate, complete cover emails and tailored attachments will appear here.
              </p>
            </div>
          ) : (
            emailApps.map((item) => {
              const edit = emailEdits[item.job_id] || {
                recipient: item.recipient_email || "",
                subject: item.cover_subject || "",
                body: item.cover_body || "",
              };
              const isBusy = actionInProgress === `send_${item.job_id}` || actionInProgress === `draft_${item.job_id}`;

              return (
                <div
                  key={item.job_id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{item.company_name}</span>
                        <span className="text-xs font-medium text-slate-400">— {item.role_title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {item.source_platform}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Job ID: <span className="font-mono text-slate-400">{item.job_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`${API_BASE}/api/resumes/${item.job_id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        Download Tailored PDF
                      </a>
                    </div>
                  </div>

                  {feedbackMsg && feedbackMsg.id === item.job_id && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        feedbackMsg.type === "success"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-300 border border-red-500/20"
                      }`}
                    >
                      {feedbackMsg.message}
                    </div>
                  )}

                  {/* Editable Recipient & Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Recipient Email:
                      </label>
                      <input
                        type="email"
                        value={edit.recipient}
                        onChange={(e) =>
                          setEmailEdits((prev) => ({
                            ...prev,
                            [item.job_id]: { ...edit, recipient: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Email Subject:
                      </label>
                      <input
                        type="text"
                        value={edit.subject}
                        onChange={(e) =>
                          setEmailEdits((prev) => ({
                            ...prev,
                            [item.job_id]: { ...edit, subject: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Editable Body */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Tailored Cover Email Body:
                    </label>
                    <textarea
                      rows={6}
                      value={edit.body}
                      onChange={(e) =>
                        setEmailEdits((prev) => ({
                          ...prev,
                          [item.job_id]: { ...edit, body: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Attachment: <span className="font-mono text-slate-400">{item.company_name}_Tailored.pdf</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateDraft(item.job_id)}
                        disabled={isBusy}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition disabled:opacity-50"
                      >
                        Create Gmail Draft
                      </button>

                      <button
                        onClick={() => handleSendEmail(item.job_id)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isBusy ? "Sending..." : "Send Application Email"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Company Portal & Form Submissions */}
      {activeTab === "portal" && (
        <div className="space-y-4">
          {portalApps.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
              <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-300">
                No Pending Portal Applications
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Portal submission packages with pre-generated STAR answers and 1-click tailored PDF downloads appear here once jobs pass the ATS gate.
              </p>
            </div>
          ) : (
            portalApps.map((item) => {
              const isBusy = actionInProgress === `mark_${item.job_id}`;

              return (
                <div
                  key={item.job_id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{item.company_name}</span>
                        <span className="text-xs font-medium text-slate-400">— {item.role_title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {item.source_platform}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Job ID: <span className="font-mono text-slate-400">{item.job_id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.portal_url && (
                        <a
                          href={item.portal_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Application Portal
                        </a>
                      )}
                      <a
                        href={`${API_BASE}/api/resumes/${item.job_id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        Download Tailored PDF
                      </a>
                    </div>
                  </div>

                  {feedbackMsg && feedbackMsg.id === item.job_id && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        feedbackMsg.type === "success"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-300 border border-red-500/20"
                      }`}
                    >
                      {feedbackMsg.message}
                    </div>
                  )}

                  {/* Pre-generated Screening Q&A */}
                  {item.screening_qa && Object.keys(item.screening_qa).length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        Pre-Generated STAR Screening Answers (Click to Copy):
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {Object.entries(item.screening_qa).map(([question, answer], idx) => {
                          const copyId = `qa_${item.job_id}_${idx}`;
                          const isCopied = copiedKey === copyId;

                          return (
                            <div
                              key={question}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between gap-2"
                            >
                              <div>
                                <div className="text-[11px] font-semibold text-slate-300 mb-1">
                                  {question}
                                </div>
                                <div className="text-xs text-slate-400 leading-relaxed">
                                  {answer}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard(answer, copyId)}
                                className="self-end px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                {isCopied ? "Copied" : "Copy Answer"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                    <div className="text-xs text-slate-500">
                      Step: Submit via portal link above, then click &quot;Mark as Applied&quot;.
                    </div>

                    <button
                      onClick={() => handleMarkApplied(item.job_id)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isBusy ? "Updating Status..." : "Mark as Applied"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Dispatched History */}
      {activeTab === "dispatched" && (
        <div className="space-y-4">
          {dispatchedApps.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-300">
                No Applications Dispatched Yet
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Once you send an email application or complete a portal submission, the verified timestamp and application record will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Company & Role</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Date Dispatched</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Resume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {dispatchedApps.map((item) => (
                    <tr key={item.job_id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.company_name}</div>
                        <div className="text-[11px] text-slate-400">{item.role_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {item.source_platform}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.submission_method === "email_submission"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          }`}
                        >
                          {item.submission_method === "email_submission" ? "Direct Email" : "Portal Form"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {item.dispatched_at ? new Date(item.dispatched_at).toLocaleString() : "Recently"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Applied
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${API_BASE}/api/resumes/${item.job_id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          <Download className="w-3 h-3" />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
