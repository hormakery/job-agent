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
  Inbox,
  Sparkles,
  Calendar,
  Check,
  MessageSquare,
} from "lucide-react";
import { Card, Badge, Button, useToast } from "@/components/ui";

export default function InboxAndInterviewsPage() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<EmailClassification[]>([]);
  const [interviews, setInterviews] = useState<InterviewCoordinationItem[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function loadInbox() {
    try {
      const data = await fetchInboxThreads();
      setEmails(data.emails || []);
      setInterviews(data.interviews || []);

      const initSlots: Record<string, string> = {};
      const initDrafts: Record<string, string> = {};
      (data.interviews || []).forEach((item) => {
        initSlots[item.job_id] =
          item.selected_slot_id || item.available_slots[0]?.slot_id || "slot_a";
        initDrafts[item.job_id] = item.draft_reply;
      });
      setSelectedSlots((prev) => ({ ...initSlots, ...prev }));
      setDraftEdits((prev) => ({ ...initDrafts, ...prev }));
    } catch (err: any) {
      toast.error("Failed to load inbox data: " + (err.message || "Unknown error"));
    }
  }

  useEffect(() => {
    loadInbox();
  }, []);

  async function handleSyncInbox() {
    setSyncing(true);
    try {
      await syncInboxWorkflow();
      await loadInbox();
      toast.success("Gmail inbox scan complete! Classified latest recruiter messages.");
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Gmail inbox");
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
      toast.success("Interview slot confirmed! Google Calendar event booked & recruiter reply sent.");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm interview slot");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan" pulse>
              Agent 3 &amp; Agent 4
            </Badge>
            <Badge variant="neutral">
              Inbox Monitor &amp; Calendar HITL Coordinator
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Interview Coordination &amp; Recruiter Inbox
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Classifies inbound recruiter replies via Gemini, maps available slots on Google Calendar, and coordinates human slot selection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncInbox}
            isLoading={syncing}
            className="shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {syncing ? "Scanning Gmail..." : "Scan Gmail Inbox Now"}
          </Button>
        </div>
      </div>

      {/* Agent 4 Human-in-the-Loop Interview Coordinator Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
            <span>Agent 4: Interview Slot Selection &amp; Email Approval Queue</span>
          </h2>
          <Badge variant={interviews.length > 0 ? "amber" : "neutral"}>
            {interviews.length} Action Required
          </Badge>
        </div>

        {interviews.length === 0 ? (
          <div className="glass-panel p-10 text-center rounded-2xl">
            <CalendarCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="text-base font-semibold text-slate-200">
              No Interview Invitations Awaiting Coordination
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              When recruiter email invitations are classified from your inbox, Agent 4 will present open Google Calendar slots and draft replies here for your one-click approval.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {interviews.map((item) => {
              const isConfirmed = item.status === "scheduled_and_sent";
              const isBusy = confirmingId === item.job_id;

              return (
                <Card
                  key={item.job_id}
                  variant="glass"
                  className="p-6 space-y-5 hover:border-white/[0.12] transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg font-bold text-white">
                          {item.company_name} — {item.role_title}
                        </span>
                        <Badge variant={isConfirmed ? "emerald" : "amber"} pulse={!isConfirmed}>
                          {isConfirmed
                            ? "Booked on Google Calendar & Reply Sent"
                            : "Awaiting Your Slot Selection"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Recruiter: <span className="font-mono text-slate-300">{item.recruiter_email}</span> • Subject: <span className="text-slate-300 font-medium">{item.subject}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06] text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold mb-1">
                      Recruiter Email Summary
                    </span>
                    &ldquo;{item.email_summary}&rdquo;
                  </div>

                  {/* Available Google Calendar Slots */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Select Open Google Calendar Slot:
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
                            className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                              active
                                ? "bg-cyan-500/15 border-cyan-500/40 text-white shadow-sm shadow-cyan-500/20"
                                : "bg-slate-950/60 border-white/[0.06] text-slate-300 hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 text-xs font-semibold">
                              <Clock className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                              <span>{slot.label}</span>
                            </div>
                            {active && <Check className="w-4 h-4 text-cyan-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Draft Email Reply */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
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
                      className="w-full p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.08] text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 leading-relaxed transition"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-white/[0.06]">
                    <Button
                      variant={isConfirmed ? "secondary" : "success"}
                      size="sm"
                      onClick={() => handleConfirmSlot(item.job_id)}
                      isLoading={isBusy}
                      className={!isConfirmed ? "shadow-lg shadow-emerald-500/20" : ""}
                    >
                      {isConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                          Re-Send / Update Calendar Booking
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Approve Slot, Book Google Calendar &amp; Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent 3 Classified Gmail Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>Agent 3: Classified Recruiter Inbox Threads</span>
          </h2>
          <Badge variant="neutral">{emails.length} Threads</Badge>
        </div>

        {emails.length === 0 ? (
          <div className="glass-panel p-10 text-center rounded-2xl">
            <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="text-base font-semibold text-slate-200">
              No Recruiter Inbox Messages Classified Yet
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Click &quot;Scan Gmail Inbox Now&quot; above to fetch unread recruiter responses from companies you applied to.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 divide-y divide-white/[0.04] backdrop-blur-md overflow-hidden">
            {emails.map((em) => {
              let badgeVariant: "emerald" | "amber" | "rose" | "neutral" = "neutral";
              if (em.category === "Interview Invite") badgeVariant = "emerald";
              else if (em.category === "Assessment Request") badgeVariant = "amber";
              else if (em.category === "Rejection") badgeVariant = "rose";

              return (
                <div
                  key={em.thread_id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-white text-sm">
                        {em.company_name}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({em.sender_email})
                      </span>
                      <Badge variant={badgeVariant}>
                        {em.category}
                      </Badge>
                    </div>
                    <div className="text-xs font-medium text-slate-200">
                      {em.subject}
                    </div>
                    <p className="text-xs text-slate-400">{em.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
