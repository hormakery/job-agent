import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      isLoading = false,
      disabled = false,
      icon,
      ...props
    },
    ref
  ) => {
    const isBusy = loading || isLoading;

    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const sizeStyles = {
      xs: "text-[11px] px-2.5 py-1 gap-1.5",
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-xs font-semibold px-4 py-2 gap-2",
      lg: "text-sm font-semibold px-5 py-2.5 gap-2.5",
    }[size];

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/20 focus:ring-indigo-500",
      secondary:
        "bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/60 shadow-sm focus:ring-slate-400",
      outline:
        "bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700/80 focus:ring-indigo-500",
      ghost:
        "bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 border border-transparent focus:ring-slate-500",
      danger:
        "bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 border border-rose-400/20 focus:ring-rose-500",
      success:
        "bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400/20 focus:ring-emerald-500",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isBusy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
