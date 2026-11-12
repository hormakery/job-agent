import React from "react";

export type CardVariant = "default" | "interactive" | "subtle" | "glass";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  topHighlight?: boolean;
}

export function Card({
  children,
  className = "",
  variant = "default",
  topHighlight = true,
  ...props
}: CardProps) {
  const effectiveVariant = variant === "glass" ? "default" : variant;

  const variantStyles = {
    default: "glass-panel",
    interactive: "glass-panel-interactive cursor-pointer",
    subtle: "glass-subtle",
  }[effectiveVariant];

  return (
    <div
      className={`relative rounded-2xl overflow-hidden p-5 ${variantStyles} ${className}`}
      {...props}
    >
      {topHighlight && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      )}
      {children}
    </div>
  );
}
