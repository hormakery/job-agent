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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/jobs", label: "Job Tracker & Gate", icon: Briefcase },
  { href: "/studio", label: "ATS & Tailor Studio", icon: FileCheck2 },
  { href: "/interviews", label: "Inbox & Calendar HITL", icon: CalendarClock },
  { href: "/settings", label: "Integrations & Resume", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/90 flex flex-col justify-between min-h-screen p-4">
      <div>
        <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-100 tracking-tight text-base">
              JobAgent OS
            </div>
            <div className="text-xs text-slate-400">
              4-Agent LangGraph Pipeline
            </div>
          </div>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>&ge; 50% ATS Gate Active</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Jobs scoring &lt;50% in your Local ATS Checker are skipped before calling Gemini 2.5 Pro.
        </p>
      </div>
    </aside>
  );
}

