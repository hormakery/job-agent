import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "@/components/SidebarNav";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "JobAgent OS — Autonomous Job Application & Interview Coordinator",
  description:
    "LangGraph + Google Gemini + Local ATS Gatekeeper (>=50%) + Google Sheets/Drive/Calendar + Web HITL",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex text-slate-100 antialiased font-sans">
        <ToastProvider>
          <SidebarNav />
          <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}

