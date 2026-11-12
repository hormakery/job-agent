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
  Globe,
  Building2,
  CheckCircle2,
  Download,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Card, Badge, Button, useToast } from "@/components/ui";

export default function DispatchHubPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationDispatchItem[]>([]);
  const [jobs, setJobs] = useState<JobSheetRow[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"email" | "portal" | "dispatched">("email");
  const [preparingAll, setPreparingAll] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    } catch (err: any) {
      toast.error("Failed to load dispatch data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function copyToClipboard(text: string, key: string, label?: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label || "text"} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handlePrepareAll() {
    setPreparingAll(true);
    try {
      await prepareAllApplications();
      await loadData();
      toast.success("Successfully generated dispatch packages for all pending tailored jobs.");
    } catch (err: any) {
      toast.error(err.message || "Failed to prepare application packages");
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
      toast.success(
        `Gmail draft created successfully (${res.mode === "gmail_api" ? "Synced to Gmail" : "Simulated Outbox"})!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to create draft");
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
      toast.success("Application email sent! Job status transitioned to 'Applied'.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleMarkApplied(jobId: string) {
    setActionInProgress(`mark_${jobId}`);
    try {
      await markPortalApplicationApplied(jobId);
      await loadData();
      toast.success("Marked as Applied! Google Sheets status updated with submission timestamp.");
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as applied");
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="emerald" pulse>
              Agent 3 • Dispatch Engine
            </Badge>
            <Badge variant="neutral">
              Human-in-the-Loop Review
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Application Dispatch Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Review tailored application packages, create live Gmail drafts, dispatch verified emails, and copy STAR answers for portal forms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={loading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrepareAll}
            isLoading={preparingAll}
            className="shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Prepare All Pending ({unPreparedJobs.length})
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card variant="glass" className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Direct Email Pending</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Mail className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{emailApps.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for 1-click send or Gmail draft</div>
        </Card>

        <Card variant="glass" className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Portal Submissions</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Globe className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{portalApps.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">URL + Resume PDF + Screening Q&A</div>
        </Card>

        <Card variant="glass" className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Dispatched & Applied</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{dispatchedApps.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded with application timestamp</div>
        </Card>

        <Card variant="glass" className="p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Unprepared Tailored</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">{unPreparedJobs.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Click &quot;Prepare All&quot; to package</div>
        </Card>
      </div>

      {/* Candidate Profile Quick-Bar */}
      {profile && (
        <div className="glass-panel p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-100">{profile.full_name}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono text-[11px]">{profile.email}</span>
            {profile.phone && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono text-[11px]">{profile.phone}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider mr-1">Quick Copy:</span>
            {profile.linkedin_url && (
              <button
                onClick={() => copyToClipboard(profile.linkedin_url, "prof_li", "LinkedIn URL")}
                className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-[11px] flex items-center gap-1 border border-white/[0.06] transition"
              >
                {copiedKey === "prof_li" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                LinkedIn
              </button>
            )}
            {profile.portfolio_url && (
              <button
                onClick={() => copyToClipboard(profile.portfolio_url, "prof_port", "Portfolio URL")}
                className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-[11px] flex items-center gap-1 border border-white/[0.06] transition"
              >
                {copiedKey === "prof_port" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                Portfolio
              </button>
            )}
            {profile.github_url && (
              <button
                onClick={() => copyToClipboard(profile.github_url, "prof_gh", "GitHub URL")}
                className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-mono text-[11px] flex items-center gap-1 border border-white/[0.06] transition"
              >
                {copiedKey === "prof_gh" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                GitHub
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modern Segmented Navigation Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-slate-900/80 border border-white/[0.06] backdrop-blur-md">
        <button
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === "email"
              ? "bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Direct Email Applications
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono">
            {emailApps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("portal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === "portal"
              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Portal Packages
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-mono">
            {portalApps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("dispatched")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === "dispatched"
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Dispatched History
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
            {dispatchedApps.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Direct Email Applications */}
      {activeTab === "email" && (
        <div className="space-y-4">
          {emailApps.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-200">
                No Pending Direct Email Applications
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                When Agent 1 discovers roles with direct hiring emails (e.g. jobs@company.com) and Agent 2 approves them through the ATS Gate, complete cover emails and tailored attachments appear here.
              </p>
            </div>
          ) : (
            emailApps.map((item) => {
              const edit = emailEdits[item.job_id] || {
                recipient: item.recipient_email || "",
                subject: item.cover_subject || "",
                body: item.cover_body || "",
              };
              const isBusyDraft = actionInProgress === `draft_${item.job_id}`;
              const isBusySend = actionInProgress === `send_${item.job_id}`;

              return (
                <Card
                  key={item.job_id}
                  variant="glass"
                  className="p-5 space-y-4 hover:border-white/[0.12] transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{item.company_name}</span>
                        <span className="text-xs text-slate-400">— {item.role_title}</span>
                        <Badge variant="cyan">{item.source_platform}</Badge>
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.06] transition"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Download Tailored PDF
                      </a>
                    </div>
                  </div>

                  {/* Editable Recipient & Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Recipient Email
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Email Subject
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 transition"
                      />
                    </div>
                  </div>

                  {/* Editable Body */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Tailored Cover Email Body
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
                      className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-sans leading-relaxed transition"
                    />
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Attachment: <span className="font-mono text-slate-300">{item.company_name}_Tailored.pdf</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCreateDraft(item.job_id)}
                        isLoading={isBusyDraft}
                      >
                        Create Gmail Draft
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSendEmail(item.job_id)}
                        isLoading={isBusySend}
                        className="shadow-lg shadow-sky-500/20"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Send Application Email
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Company Portal & Form Submissions */}
      {activeTab === "portal" && (
        <div className="space-y-4">
          {portalApps.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-200">
                No Pending Portal Applications
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Portal submission packages with pre-generated STAR answers and 1-click tailored PDF downloads appear here once jobs pass the ATS gate.
              </p>
            </div>
          ) : (
            portalApps.map((item) => {
              const isBusyMark = actionInProgress === `mark_${item.job_id}`;

              return (
                <Card
                  key={item.job_id}
                  variant="glass"
                  className="p-5 space-y-4 hover:border-white/[0.12] transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{item.company_name}</span>
                        <span className="text-xs text-slate-400">— {item.role_title}</span>
                        <Badge variant="purple">{item.source_platform}</Badge>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Application Portal
                        </a>
                      )}
                      <a
                        href={`${API_BASE}/api/resumes/${item.job_id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.06] transition"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        Download Tailored PDF
                      </a>
                    </div>
                  </div>

                  {/* Pre-generated Screening Q&A */}
                  {item.screening_qa && Object.keys(item.screening_qa).length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        Pre-Generated STAR Screening Answers (Click to Copy):
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(item.screening_qa).map(([question, answer], idx) => {
                          const copyId = `qa_${item.job_id}_${idx}`;
                          const isCopied = copiedKey === copyId;

                          return (
                            <div
                              key={question}
                              className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06] flex flex-col justify-between gap-2.5 hover:border-white/[0.12] transition"
                            >
                              <div>
                                <div className="text-[11px] font-semibold text-slate-300 mb-1">
                                  {question}
                                </div>
                                <div className="text-xs text-slate-400 leading-relaxed font-sans">
                                  {answer}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard(answer, copyId, "Screening Answer")}
                                className="self-end px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-medium flex items-center gap-1 border border-white/[0.06] transition"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                {isCopied ? "Copied" : "Copy Answer"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/[0.06]">
                    <div className="text-xs text-slate-400">
                      Step: Submit via portal link above, then click &quot;Mark as Applied&quot;.
                    </div>

                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleMarkApplied(item.job_id)}
                      isLoading={isBusyMark}
                      className="shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Mark as Applied
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Dispatched History */}
      {activeTab === "dispatched" && (
        <div className="space-y-4">
          {dispatchedApps.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-200">
                No Applications Dispatched Yet
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Once you send an email application or complete a portal submission, the verified timestamp and application record will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company &amp; Role</th>
                    <th className="px-4 py-3 font-semibold">Platform</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Date Dispatched</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Resume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-slate-300">
                  {dispatchedApps.map((item) => (
                    <tr key={item.job_id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.company_name}</div>
                        <div className="text-[11px] text-slate-400">{item.role_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{item.source_platform}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.submission_method === "email_submission" ? "cyan" : "purple"}>
                          {item.submission_method === "email_submission" ? "Direct Email" : "Portal Form"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {item.dispatched_at ? new Date(item.dispatched_at).toLocaleString() : "Recently"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="emerald">Applied</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${API_BASE}/api/resumes/${item.job_id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
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
