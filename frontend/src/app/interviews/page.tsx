"use client";

import { useEffect, useState } from "react";
import {
  confirmInterviewSlot,
  fetchInboxThreads,
  syncInboxWorkflow,
} from "@/lib/api";
import { EmailClassification, InterviewCoordinationItem } from "@/lib/types";
import {
  Mail,
  CalendarCheck,
  RefreshCw,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function InboxAndInterviewsPage() {
  const [emails, setEmails] = useState<EmailClassification[]>([]);
  const [interviews, setInterviews] = useState<InterviewCoordinationItem[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function loadInbox() {
    const data = await fetchInboxThreads();
    setEmails(data.emails);
    setInterviews(data.interviews);

    const initSlots: Record<string, string> = {};
    const initDrafts: Record<string, string> = {};
    data.interviews.forEach((item) => {
      initSlots[item.job_id] =
        item.selected_slot_id || item.available_slots[0]?.slot_id || "slot_a";
      initDrafts[item.job_id] = item.draft_reply;
    });
    setSelectedSlots((prev) => ({ ...initSlots, ...prev }));
    setDraftEdits((prev) => ({ ...initDrafts, ...prev }));
  }

  useEffect(() => {
    loadInbox();
  }, []);

  async function handleSyncInbox() {
    setSyncing(true);
    try {
      await syncInboxWorkflow();
      await loadInbox();
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirmSlot(jobId: string) {
    setConfirmingId(jobId);
    try {
      const slotId = selectedSlots[jobId] || "slot_a";
      const draft = draftEdits[jobId];
      await confirmInterviewSlot(jobId, slotId, draft);
      await loadInbox();
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Agent 3 &amp; Agent 4: Inbox Monitor &amp; Calendar HITL Coordinator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Classifies recruiter replies via Gemini 2.5 Flash, finds open Google Calendar slots, and coordinates human approval (Web UI + Telegram Bot)
          </p>
        </div>

        <button
          onClick={handleSyncInbox}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Scanning Gmail..." : "Scan Gmail Inbox Now"}
        </button>
      </div>

      {/* Agent 4 Human-in-the-Loop Interview Coordinator Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-emerald-400" />
          <span>
            Agent 4: Interview Slot Selection &amp; Email Approval Queue
          </span>
        </h2>

        <div className="grid grid-cols-1 gap-6">
          {interviews.map((item) => {
            const isConfirmed = item.status === "scheduled_and_sent";
            return (
              <div
                key={item.job_id}
                className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg font-bold text-white">
                        {item.company_name} — {item.role_title}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isConfirmed
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                            : "bg-amber-950 text-amber-300 border border-amber-700"
                        }`}
                      >
                        {isConfirmed
                          ? "Booked on Google Calendar & Reply Sent"
                          : "Awaiting Your Slot Selection"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Recruiter: {item.recruiter_email} • Subject: {item.subject}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                  &ldquo;{item.email_summary}&rdquo;
                </p>

                {/* Available Google Calendar Slots */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    Select Open Google Calendar Slot (Synced with Telegram Bot):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {item.available_slots.map((slot) => {
                      const active = selectedSlots[item.job_id] === slot.slot_id;
                      return (
                        <button
                          key={slot.slot_id}
                          onClick={() =>
                            setSelectedSlots((prev) => ({
                              ...prev,
                              [item.job_id]: slot.slot_id,
                            }))
                          }
                          className={`p-3.5 rounded-lg border text-left transition cursor-pointer ${
                            active
                              ? "bg-indigo-600/20 border-indigo-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span>{slot.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Draft Email Reply */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-slate-400">
                    Draft Email Response (Agent 3 will send upon your approval):
                  </div>
                  <textarea
                    rows={4}
                    value={draftEdits[item.job_id] ?? item.draft_reply}
                    onChange={(e) =>
                      setDraftEdits((prev) => ({
                        ...prev,
                        [item.job_id]: e.target.value,
                      }))
                    }
                    className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => handleConfirmSlot(item.job_id)}
                    disabled={confirmingId === item.job_id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isConfirmed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Re-Send / Update Calendar Booking</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {confirmingId === item.job_id
                            ? "Booking Calendar & Sending Email..."
                            : "Approve Slot, Book Google Calendar & Send Reply"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent 3 Classified Gmail Feed */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          <span>Agent 3: Classified Recruiter Inbox Threads</span>
        </h2>

        <div className="rounded-xl bg-slate-900/90 border border-slate-800 divide-y divide-slate-800">
          {emails.map((em) => (
            <div
              key={em.thread_id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-white text-sm">
                    {em.company_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({em.sender_email})
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      em.category === "Interview Invite"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : em.category === "Assessment Request"
                        ? "bg-amber-950 text-amber-300 border border-amber-700"
                        : em.category === "Rejection"
                        ? "bg-rose-950 text-rose-300 border border-rose-700"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {em.category}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {em.subject}
                </div>
                <p className="text-xs text-slate-400">{em.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

