"use client";

import { useEffect, useState } from "react";
import {
  fetchCandidateProfile,
  fetchHealth,
  fetchMasterResume,
  saveCandidateProfile,
  saveMasterResume,
} from "@/lib/api";
import { CandidateProfile } from "@/lib/types";
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
} from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumePath, setResumePath] = useState<string>("");
  const [savingResume, setSavingResume] = useState(false);
  const [savedResumeNotice, setSavedResumeNotice] = useState(false);

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

  const integrations = health?.integrations || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white">
          Settings, Candidate Profile &amp; Integrations
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your verified candidate identity (LinkedIn, portfolio, email), local ATS Checker connection, Google Workspace credentials, and master resume.
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
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
