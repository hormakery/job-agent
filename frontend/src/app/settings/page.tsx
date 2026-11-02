"use client";

import { useEffect, useState } from "react";
import { fetchHealth, fetchMasterResume, saveMasterResume } from "@/lib/api";
import { Save, CheckCircle2, Server } from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumePath, setResumePath] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(console.error);
    fetchMasterResume()
      .then((r) => {
        setResumeText(r.content);
        setResumePath(r.path);
      })
      .catch(console.error);
  }, []);

  async function handleSaveResume() {
    setSaving(true);
    setSavedNotice(false);
    try {
      await saveMasterResume(resumeText);
      setSavedNotice(true);
    } finally {
      setSaving(false);
    }
  }

  const integrations = health?.integrations || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white">
          Integrations Health &amp; Canonical Master Resume
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify your Local ATS Checker connection, Google Workspace credentials, Telegram Bot, and edit your Master Resume
        </p>
      </div>

      {/* Integration Status Cards */}
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
                {val.mode || (val.connected ? "Connected" : "Local Active")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Master Resume Editor */}
      <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Master Resume Markdown Editor
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {resumePath || "data/master_resume.md"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedNotice && (
              <span className="text-xs text-emerald-400 font-medium">
                ✓ Saved to disk
              </span>
            )}
            <button
              onClick={handleSaveResume}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Master Resume"}
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

