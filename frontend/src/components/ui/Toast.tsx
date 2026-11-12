"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const config = {
            success: {
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
              border: "border-emerald-500/30 bg-slate-900/90 text-emerald-200",
            },
            error: {
              icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
              border: "border-rose-500/30 bg-slate-900/90 text-rose-200",
            },
            info: {
              icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
              border: "border-sky-500/30 bg-slate-900/90 text-sky-200",
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 ${config.border}`}
            >
              <div className="flex items-center gap-2.5">
                {config.icon}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white shrink-0 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
