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
} from "lucide-react";

function SettingsContent() {
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumePath, setResumePath] = useState<string>("");
  const [savingResume, setSavingResume] = useState(false);
  const [savedResumeNotice, setSavedResumeNotice] = useState(false);

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
  const [savedProfileNotice, setSavedProfileNotice] = useState(false);

  // Google OAuth2 State
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);
  const [syncingSheet, setSyncingSheet] = useState(false);

  // Client credentials manual input toggle
  const [showCredsForm, setShowCredsForm] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

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
            setGoogleSuccess(`Successfully authenticated Google account (${res.email || "Connected"})!`);
            window.history.replaceState({}, "", "/settings");
            loadGoogleStatus();
            fetchHealth().then(setHealth);
          })
          .catch((err) => {
            setGoogleError(`OAuth callback failed: ${err.message}`);
          })
          .finally(() => setLoadingGoogle(false));
      }
    }
  }, []);

  async function handleSaveResume() {
    setSavingResume(true);
    setSavedResumeNotice(false);
    try {
      await saveMasterResume(resumeText);
      setSavedResumeNotice(true);
      setTimeout(() => setSavedResumeNotice(false), 3000);
    } finally {
      setSavingResume(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setSavedProfileNotice(false);
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
      setSavedProfileNotice(true);
      setTimeout(() => setSavedProfileNotice(false), 3000);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleConnectGoogle() {
    setLoadingGoogle(true);
    setGoogleError(null);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      const { url } = await getGoogleAuthUrl(redirectUri);
      window.location.href = url;
    } catch (err: any) {
      setGoogleError(err.message || "Failed to initiate Google OAuth");
      setLoadingGoogle(false);
    }
  }

  async function handleDisconnectGoogle() {
    if (!confirm("Are you sure you want to disconnect your Google Workspace account?")) return;
    setLoadingGoogle(true);
    try {
      await disconnectGoogleAccount();
      setGoogleSuccess("Google account disconnected.");
      await loadGoogleStatus();
      await fetchHealth().then(setHealth);
    } catch (err: any) {
      setGoogleError(err.message);
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
      setGoogleSuccess("OAuth client credentials saved. You can now connect your Google account.");
      await loadGoogleStatus();
    } catch (err: any) {
      setGoogleError(err.message);
    } finally {
      setSavingCreds(false);
    }
  }

  async function handleSyncToGoogleSheet() {
    setSyncingSheet(true);
    setGoogleSuccess(null);
    setGoogleError(null);
    try {
      const res = await syncAllJobsToGoogleSheet();
      setGoogleSuccess(`Successfully synced ${res.synced_count} jobs to Google Sheet!`);
    } catch (err: any) {
      setGoogleError(err.message);
    } finally {
      setSyncingSheet(false);
    }
  }

  const integrations = health?.integrations || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white">
          Settings, Google Workspace &amp; Candidate Profile
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Authenticate live Google Workspace services (Gmail, Google Sheets, Google Drive, Google Calendar), manage candidate identity, and maintain your canonical master resume.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Connected Systems &amp; Adapters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(integrations).map(([key, val]: [string, any]) => (
            <div
              key={key}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-slate-300">
                  {key.replace(/_/g, " ")}
                </span>
                <Server className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {val.mode || (val.connected ? "Connected" : "Active")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Workspace OAuth2 Live Connection Card */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              <span>Google Workspace Live Authentication (OAuth2)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Powers live Gmail monitoring, 13-column Google Sheets relational tracking, Drive resume uploads, and Calendar slot booking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {googleStatus?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected ({googleStatus.mode.toUpperCase()})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {/* Notices */}
        {googleSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{googleSuccess}</span>
          </div>
        )}
        {googleError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{googleError}</span>
          </div>
        )}

        {/* Connected State Details */}
        {googleStatus?.connected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Authenticated Account:</span>
                <span className="font-semibold text-white text-sm mt-0.5 block truncate">
                  {googleStatus.email || "Active User"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Google Sheet Sync:</span>
                <span className="text-slate-200 mt-0.5 block font-mono text-[11px] truncate">
                  {googleStatus.sheet_id || "Ready for sync"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Google Drive Folder:</span>
                <span className="text-slate-200 mt-0.5 block font-mono text-[11px] truncate">
                  {googleStatus.drive_folder_id || "Root / Job Applications"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncToGoogleSheet}
                  disabled={syncingSheet}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${syncingSheet ? "animate-spin" : ""}`} />
                  <span>{syncingSheet ? "Syncing..." : "Sync All Jobs to Google Sheet"}</span>
                </button>
              </div>

              <button
                onClick={handleDisconnectGoogle}
                disabled={loadingGoogle}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Google Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected State */
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Connecting your Google Account grants JobAgent OS permission to modify spreadsheets, compose and read application emails in Gmail, upload tailored resume PDFs to Google Drive, and manage interview bookings on Google Calendar.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-indigo-400" /> Gmail Modify &amp; Compose
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" /> Google Sheets
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-cyan-400" /> Google Drive Files
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" /> Google Calendar
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {googleStatus?.has_client_secret ? (
                <button
                  onClick={handleConnectGoogle}
                  disabled={loadingGoogle}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{loadingGoogle ? "Connecting..." : "Connect Google Workspace via OAuth2"}</span>
                </button>
              ) : (
                <div className="space-y-3 w-full">
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
                    <strong>OAuth Client Credentials Needed:</strong> Provide your Google Cloud OAuth Client ID and Secret to enable one-click login, or add them to your <code className="text-amber-200">.env</code> file.
                  </div>
                  <button
                    onClick={() => setShowCredsForm(!showCredsForm)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showCredsForm ? "Hide Credentials Form" : "Enter Google Client ID & Secret"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Manual Client Credentials Form */}
            {showCredsForm && (
              <form onSubmit={handleSaveClientCredentials} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3 max-w-lg">
                <div className="text-xs font-semibold text-slate-200">Enter Google Cloud OAuth Credentials</div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
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
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="px-3.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingCreds ? "Saving..." : "Save Credentials"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Candidate Profile Editor */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              <span>Verified Candidate Identity &amp; Application Profile</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Attached to all job applications dispatched by Agent 3 (email submissions, recruiter replies, and screening questions)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedProfileNotice && (
              <span className="text-xs text-emerald-400 font-medium">
                ✓ Candidate profile saved
              </span>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingProfile ? "Saving..." : "Save Candidate Profile"}
            </button>
          </div>
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5 text-indigo-400" />
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={profile.linkedin_url}
              onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/alex-mercer"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </form>
      </div>

      {/* Master Resume Editor */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Master Resume Markdown Source (Ground Truth)
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {resumePath || "data/master_resume.md"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedResumeNotice && (
              <span className="text-xs text-emerald-400 font-medium">
                ✓ Saved to disk
              </span>
            )}
            <button
              onClick={handleSaveResume}
              disabled={savingResume}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingResume ? "Saving..." : "Save Master Resume"}
            </button>
          </div>
        </div>

        <textarea
          rows={18}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          className="w-full p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
        />
      </div>
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
