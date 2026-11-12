"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileCheck2,
  CalendarClock,
  Settings,
  Sparkles,
  ShieldCheck,
  SendHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: LayoutDashboard, badge: "Orchestrator" },
  { href: "/jobs", label: "Job Tracker & Gate", icon: Briefcase, badge: "Agent 1 & 2" },
  { href: "/studio", label: "ATS & Tailor Studio", icon: FileCheck2, badge: "Gemini 2.5" },
  { href: "/dispatch", label: "Application Dispatch", icon: SendHorizontal, badge: "Agent 3" },
  { href: "/interviews", label: "Inbox & Calendar", icon: CalendarClock, badge: "Agent 4 HITL" },
  { href: "/settings", label: "Integrations & Resume", icon: Settings, badge: "Config" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/60 bg-slate-950/75 backdrop-blur-2xl flex flex-col justify-between min-h-screen p-4 select-none">
      <div>
        {/* Brand Header */}
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800/60 group transition"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)] group-hover:border-indigo-400 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] transition">
            <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="font-extrabold text-white tracking-tight text-base flex items-center gap-1.5">
              <span>JobAgent</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                OS
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              4-Agent Autonomous
            </div>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  active
                    ? "bg-indigo-600/15 text-white border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                {/* Left active glow accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,1)]" />
                )}

                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      active
                        ? "text-indigo-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition ${
                    active
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-500 group-hover:text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Gatekeeper Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md text-xs space-y-1.5 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>&ge; 50% ATS Gate Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Jobs below 50% match score in your Local ATS are skipped to eliminate false tailoring.
        </p>
      </div>
    </aside>
  );
}
