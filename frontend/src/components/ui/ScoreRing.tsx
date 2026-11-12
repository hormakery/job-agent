import React from "react";

export interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreRing({ score, size = "md", showLabel = false }: ScoreRingProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  const dimensions = {
    sm: { diameter: 36, stroke: 3, textSize: "text-[10px]", labelSize: "text-[9px]" },
    md: { diameter: 48, stroke: 4, textSize: "text-xs font-bold", labelSize: "text-[10px]" },
    lg: { diameter: 72, stroke: 5, textSize: "text-base font-extrabold", labelSize: "text-xs" },
  }[size];

  const radius = (dimensions.diameter - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  let colorClass = "text-rose-500 stroke-rose-500";
  let bgTrack = "stroke-rose-950/40";
  let label = "Below Gate";

  if (clampedScore >= 70) {
    colorClass = "text-emerald-400 stroke-emerald-400";
    bgTrack = "stroke-emerald-950/40";
    label = "High Match";
  } else if (clampedScore >= 50) {
    colorClass = "text-amber-400 stroke-amber-400";
    bgTrack = "stroke-amber-950/40";
    label = "Passed Gate";
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: dimensions.diameter, height: dimensions.diameter }}
      >
        <svg
          className="transform -rotate-90"
          width={dimensions.diameter}
          height={dimensions.diameter}
        >
          {/* Background Track */}
          <circle
            className={bgTrack}
            strokeWidth={dimensions.stroke}
            fill="transparent"
            r={radius}
            cx={dimensions.diameter / 2}
            cy={dimensions.diameter / 2}
          />
          {/* Progress Ring */}
          <circle
            className={`${colorClass} transition-all duration-500 ease-out`}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={dimensions.diameter / 2}
            cy={dimensions.diameter / 2}
          />
        </svg>

        <span className={`absolute font-mono tabular-nums ${dimensions.textSize} ${colorClass}`}>
          {clampedScore}%
        </span>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className={`font-semibold ${dimensions.labelSize} ${colorClass}`}>{label}</span>
          <span className="text-[10px] text-slate-400">ATS Match</span>
        </div>
      )}
    </div>
  );
}
