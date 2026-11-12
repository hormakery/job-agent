import React from "react";

export type BadgeVariant =
  | "emerald"
  | "amber"
  | "rose"
  | "indigo"
  | "sky"
  | "purple"
  | "slate"
  | "cyan"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  withDot?: boolean;
  pulse?: boolean;
}

export function Badge({
  children,
  className = "",
  variant = "slate",
  size = "md",
  withDot = false,
  pulse = false,
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
  }[size];

  const effectiveVariant = variant === "neutral" ? "slate" : variant;

  const variantStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/25",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    indigo: "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    purple: "bg-purple-500/10 text-purple-300 border-purple-500/25",
    cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25",
    slate: "bg-slate-800/80 text-slate-300 border-slate-700/60",
  }[effectiveVariant];

  const dotColors = {
    emerald: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    amber: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
    rose: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    indigo: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]",
    sky: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]",
    purple: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]",
    cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]",
    slate: "bg-slate-400",
  }[effectiveVariant];

  const showDot = withDot || pulse;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-sm ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${dotColors}`} />
      )}
      {children}
    </span>
  );
}
