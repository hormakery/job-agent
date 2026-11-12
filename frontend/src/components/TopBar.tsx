"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { fetchAtsHealth, fetchGoogleAuthStatus, fetchHealth } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export function TopBar() {
  const pathname = usePathname();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [atsOnline, setAtsOnline] = useState<boolean | null>(null);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkStatuses() {
      try {
        const [h, ats, g] = await Promise.allSettled([
          fetchHealth(),
          fetchAtsHealth(),
          fetchGoogleAuthStatus(),
        ]);
        setBackendOnline(h.status === "fulfilled");
        setAtsOnline(ats.status === "fulfilled" && (ats.value.connected ?? false));
        setGoogleConnected(g.status === "fulfilled" && (g.value.connected ?? false));
      } catch {
        // quiet fallback
      }
    }
    checkStatuses();
    const interval = setInterval(checkStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const pageTitles: Record<string, { title: string; subtitle: string }> = {
    "/": { title: "Command Center", subtitle: "Autonomous 4-Agent Pipeline & KPI Overview" },
    "/jobs": { title: "Job Tracker & ATS Gate", subtitle: "13-Column Relational State Store & Platform Tracking" },
    "/studio": { title: "ATS & Tailor Studio", subtitle: "Side-by-Side Scoring & Gemini 2.5 Pro Tailoring" },
    "/dispatch": { title: "Application Dispatch Hub", subtitle: "Direct Gmail Sender & Portal Submission Assistant" },
    "/interviews": { title: "Inbox & Calendar Coordinator", subtitle: "Recruiter Reply Classification & Conflict-Free Booking" },
    "/settings": { title: "Integrations & Resume", subtitle: "Google Workspace OAuth, Candidate Profile & Master Resume" },
  };

  const current = pageTitles[pathname] || {
    title: "JobAgent OS",
    subtitle: "Full-Stack Autonomous Application Engine",
  };

  return (
    <header className="sticky top-0 z-30 mb-6 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3.5 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span>JobAgent OS</span>
          <span className="text-slate-600">/</span>
          <span className="text-indigo-400 font-semibold">{current.title}</span>
        </div>
        <div className="text-xs text-slate-400 hidden sm:block mt-0.5 font-normal">
          {current.subtitle}
        </div>
      </div>

      {/* Live System Health Pills */}
      <div className="flex items-center gap-2 text-xs">
        {/* Backend Status */}
        <Badge
          variant={backendOnline === true ? "emerald" : backendOnline === false ? "rose" : "slate"}
          size="sm"
          withDot
        >
          API: {backendOnline === true ? "8080 Active" : "Connecting..."}
        </Badge>

        {/* Local ATS Checker Status */}
        <Link href="/studio">
          <Badge
            variant={atsOnline === true ? "indigo" : "amber"}
            size="sm"
            withDot
            className="cursor-pointer hover:border-indigo-400/50 transition"
          >
            ATS: {atsOnline === true ? "Port 4000 Express" : "Local Heuristic Engine"}
          </Badge>
        </Link>

        {/* Google OAuth Status */}
        <Link href="/settings">
          <Badge
            variant={googleConnected === true ? "sky" : "slate"}
            size="sm"
            withDot
            className="cursor-pointer hover:border-sky-400/50 transition"
          >
            Google: {googleConnected === true ? "OAuth Active" : "Unconnected"}
          </Badge>
        </Link>
      </div>
    </header>
  );
}
