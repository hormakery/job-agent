"use client";

import { useEffect, useState, Suspense } from "react";
import {
  disconnectGoogleAccount,
  fetchCandidateProfile,
  fetchGoogleAuthStatus,
  fetchHealth,
  fetchMasterResume,
  getGoogleAuthUrl,
  saveCandidateProfile,
  saveGoogleClientSecret,
  saveMasterResume,
  submitGoogleAuthCallback,
  syncAllJobsToGoogleSheet,
} from "@/lib/api";
import { CandidateProfile, GoogleAuthStatus } from "@/lib/types";
import {
  Save,
  CheckCircle2,
  Server,
  User,
  Linkedin,
  Github,
  Globe,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Key,
  LogOut,
  ExternalLink,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge, Button, useToast } from "@/components/ui";

function SettingsContent() {
  const { toast } = useToast();
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumePath, setResumePath] = useState<string>("");
  const [savingResume, setSavingResume] = useState(false);

  // Candidate Profile State
  const [profile, setProfile] = useState<CandidateProfile>({
    full_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    location: "",
    target_roles: [],
  });
  const [targetRolesInput, setTargetRolesInput] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Google OAuth2 State
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);

  // Client credentials manual input toggle
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);

  async function loadGoogleStatus() {
    try {
      const status = await fetchGoogleAuthStatus();
      setGoogleStatus(status);
    } catch (err: any) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchHealth().then(setHealth).catch(console.error);
    fetchMasterResume()
      .then((r) => {
        setResumeText(r.content);
        setResumePath(r.path);
      })
      .catch(console.error);
    fetchCandidateProfile()
      .then((p) => {
        setProfile(p);
        setTargetRolesInput(p.target_roles ? p.target_roles.join(", ") : "");
      })
      .catch(console.error);
    loadGoogleStatus();

    // Check for OAuth callback code in URL query string
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        setLoadingGoogle(true);
        const redirectUri = `${window.location.origin}/settings`;
        submitGoogleAuthCallback(code, redirectUri)
          .then((res) => {
            toast.success(`Successfully authenticated Google account (${res.email || "Connected"})!`);
            window.history.replaceState({}, "", "/settings");
            loadGoogleStatus();
            fetchHealth().then(setHealth);
          })
          .catch((err) => {
            toast.error(`OAuth callback failed: ${err.message}`);
          })
          .finally(() => setLoadingGoogle(false));
      }
    }
  }, []);

  async function handleSaveResume() {
    setSavingResume(true);
    try {
      await saveMasterResume(resumeText);
      toast.success("Master resume saved to disk successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save master resume");
    } finally {
      setSavingResume(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updatedProfile: CandidateProfile = {
        ...profile,
        target_roles: targetRolesInput
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      };
      const saved = await saveCandidateProfile(updatedProfile);
      setProfile(saved);
      toast.success("Candidate identity & profile saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleConnectGoogle() {
    setLoadingGoogle(true);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      const { url } = await getGoogleAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate Google OAuth");
      setLoadingGoogle(false);
    }
  }

  async function handleDisconnectGoogle() {
    if (!confirm("Are you sure you want to disconnect your Google Workspace account?")) return;
    setLoadingGoogle(true);
    try {
      await disconnectGoogleAccount();
      toast.info("Google account disconnected.");
      await loadGoogleStatus();
      await fetchHealth().then(setHealth);
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    } finally {
      setLoadingGoogle(false);
    }
  }

  async function handleSaveClientCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!clientIdInput || !clientSecretInput) return;
    setSavingCreds(true);
    try {
      await saveGoogleClientSecret(clientIdInput, clientSecretInput);
      setShowCredsForm(false);
      toast.success("OAuth client credentials saved. You can now connect your Google account.");
      await loadGoogleStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to save client credentials");
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleSyncToGoogleSheet() {
    setSyncingSheet(true);
    try {
      const res = await syncAllJobsToGoogleSheet();
      toast.success(`Successfully synced ${res.synced_count} jobs to Google Sheet!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to sync to Google Sheet");
    } finally {
      setSyncingSheet(false);
    }
  }

  const integrations = health?.integrations || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="cyan">Configuration</Badge>
          <Badge variant="neutral">Integrations &amp; Ground Truth</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Settings, Google Workspace &amp; Candidate Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Authenticate live Google Workspace services (Gmail, Google Sheets, Google Drive, Google Calendar), manage candidate identity, and maintain your canonical master resume.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Connected Systems &amp; Adapters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Object.entries(integrations).map(([key, val]: [string, any]) => (
            <Card
              key={key}
              variant="glass"
              className="p-4 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {key.replace(/_/g, " ")}
                </span>
                <Server className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                <Badge variant="emerald" pulse>
                  {val.mode || (val.connected ? "Connected" : "Active")}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Google Workspace OAuth2 Live Connection Card */}
      <Card variant="glass" className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              <span>Google Workspace Live Authentication (OAuth2)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Powers live Gmail monitoring, 13-column Google Sheets relational tracking, Drive resume uploads, and Calendar slot booking.
            </p>
          </div>

          <div>
            {googleStatus?.connected ? (
              <Badge variant="emerald" pulse>
                Connected ({googleStatus.mode.toUpperCase()})
              </Badge>
            ) : (
              <Badge variant="neutral">Not Connected</Badge>
            )}
          </div>
        </div>

        {/* Connected State Details */}
        {googleStatus?.connected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Authenticated Account:</span>
                <span className="font-semibold text-white text-sm mt-0.5 block truncate">
                  {googleStatus.email || "Active User"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Google Sheet Sync:</span>
                <span className="text-slate-300 mt-0.5 block font-mono text-[11px] truncate">
                  {googleStatus.sheet_id || "Ready for sync"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Google Drive Folder:</span>
                <span className="text-slate-300 mt-0.5 block font-mono text-[11px] truncate">
                  {googleStatus.drive_folder_id || "Root / Job Applications"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncToGoogleSheet}
                isLoading={syncingSheet}
                className="shadow-lg shadow-cyan-500/20"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Sync All Jobs to Google Sheet
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDisconnectGoogle}
                isLoading={loadingGoogle}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Disconnect Google Account
              </Button>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.06] text-xs text-slate-300 space-y-2">
              <p>
                Connecting your Google Account grants JobAgent OS permission to modify spreadsheets, compose and read application emails in Gmail, upload tailored resume PDFs to Google Drive, and manage interview bookings on Google Calendar.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <Badge variant="cyan">
                  <Mail className="w-3 h-3 mr-1" /> Gmail Modify &amp; Compose
                </Badge>
                <Badge variant="emerald">
                  <FileSpreadsheet className="w-3 h-3 mr-1" /> Google Sheets
                </Badge>
                <Badge variant="purple">
                  <HardDrive className="w-3 h-3 mr-1" /> Google Drive Files
                </Badge>
                <Badge variant="amber">
                  <Calendar className="w-3 h-3 mr-1" /> Google Calendar
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {googleStatus?.has_client_secret ? (
                <>
                  <Button
                    variant="primary"
                    onClick={handleConnectGoogle}
                    isLoading={loadingGoogle}
                    className="shadow-lg shadow-cyan-500/20"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Connect Google Workspace via OAuth2
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOAuthHelp(!showOAuthHelp)}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    {showOAuthHelp ? "Hide Access Denied Guide" : "Getting 'Access Denied'? Read Fix"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3 w-full">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <strong>OAuth Client Credentials Needed:</strong> Provide your Google Cloud OAuth Client ID and Secret to enable one-click login, or add them to your <code className="text-amber-200 font-mono">.env</code> file.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCredsForm(!showCredsForm)}
                    >
                      <Key className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      {showCredsForm ? "Hide Credentials Form" : "Enter Google Client ID & Secret"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOAuthHelp(!showOAuthHelp)}
                    >
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                      {showOAuthHelp ? "Hide Guide" : "How to Set Up in Google Cloud"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Google Cloud Access Denied & Setup Walkthrough */}
            {showOAuthHelp && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3 text-xs text-amber-200/90 animate-in fade-in duration-200">
                <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Why Google Cloud Shows "Access Denied" (Error 403) &amp; How to Fix It:
                </div>
                <p className="leading-relaxed">
                  In Google Cloud Console, any new app defaults to <strong>"Publishing Status: Testing"</strong>. While in testing mode, Google automatically blocks any email address that has not been explicitly added as a <strong>Test User</strong>.
                </p>
                <div className="space-y-2 p-3 rounded-lg bg-slate-950/80 border border-amber-500/20 font-mono text-[11px] text-slate-300">
                  <div className="font-semibold text-amber-300 font-sans text-xs">3-Step Fix in Google Cloud Console:</div>
                  <div>1. Go to <strong>Google Cloud Console &rarr; APIs &amp; Services &rarr; OAuth consent screen</strong>.</div>
                  <div>2. Scroll to <strong>Test users</strong> &rarr; click <strong>+ ADD USERS</strong> &rarr; enter your exact Gmail address.</div>
                  <div>3. Under <strong>Credentials &rarr; Authorized redirect URIs</strong>, ensure <code className="text-cyan-400">http://localhost:3001/settings</code> is listed.</div>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Once your email is added under Test Users, clicking "Connect Google Workspace via OAuth2" will immediately allow sign-in.
                </p>
              </div>
            )}

            {/* Manual Client Credentials Form */}
            {showCredsForm && (
              <form onSubmit={handleSaveClientCredentials} className="p-4 rounded-xl bg-slate-950/70 border border-white/[0.08] space-y-3 max-w-lg">
                <div className="text-xs font-semibold text-slate-200">Enter Google Cloud OAuth Credentials</div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={clientSecretInput}
                    onChange={(e) => setClientSecretInput(e.target.value)}
                    placeholder="GOCSPX-xxxx"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/[0.08] text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={savingCreds}
                >
                  Save Credentials
                </Button>
              </form>
            )}
          </div>
        )}
      </Card>

      {/* Candidate Profile Editor */}
      <Card variant="glass" className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              <span>Verified Candidate Identity &amp; Application Profile</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Attached to all job applications dispatched by Agent 3 (email submissions, recruiter replies, and screening questions)
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProfile}
            isLoading={savingProfile}
            className="shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Profile
          </Button>
        </div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="e.g. Alex Mercer"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Primary Application Email
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="e.g. alex.mercer.dev@gmail.com"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Phone Number
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. +1 (555) 019-2834"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Location / Timezone
            </label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="e.g. San Francisco, CA (PST / Remote)"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5 text-cyan-400" />
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={profile.linkedin_url}
              onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/alex-mercer"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono transition"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-slate-400" />
              GitHub Profile URL
            </label>
            <input
              type="url"
              value={profile.github_url}
              onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              placeholder="https://github.com/alex-mercer"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Portfolio / Personal Website URL
            </label>
            <input
              type="url"
              value={profile.portfolio_url}
              onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
              placeholder="https://alexmercer.dev"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              Target Roles (comma-separated)
            </label>
            <input
              type="text"
              value={targetRolesInput}
              onChange={(e) => setTargetRolesInput(e.target.value)}
              placeholder="Software Engineer, Full Stack Engineer, Frontend Engineer, DevOps Engineer"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/70 border border-white/[0.08] text-xs text-slate-100 focus:outline-none focus:border-cyan-500/50 transition"
            />
          </div>
        </form>
      </Card>

      {/* Master Resume Editor */}
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Master Resume Markdown Source (Ground Truth)
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {resumePath || "data/master_resume.md"}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveResume}
            isLoading={savingResume}
            className="shadow-lg shadow-cyan-500/20"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Master Resume
          </Button>
        </div>

        <textarea
          rows={18}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="w-full p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 leading-relaxed transition"
        />
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
