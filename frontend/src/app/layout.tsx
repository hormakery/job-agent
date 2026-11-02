import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "@/components/SidebarNav";

export const metadata: Metadata = {
  title: "JobAgent OS — 4-Agent Autonomous Job & Interview Coordinator",
  description:
    "LangGraph + Google Gemini + Local ATS Gatekeeper (>=50%) + Google Sheets/Drive/Calendar + Telegram HITL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex bg-[#090d16] text-slate-100 antialiased">
        <SidebarNav />
        <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}

