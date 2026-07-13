"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Generic circular progress indicator. No domain knowledge — `progress` is
 * 0–1. Fills from empty on mount for a one-time, Activity-ring-style reveal,
 * then tracks further `progress` changes with the same transition.
 */
function ProgressRing({
  progress,
  size = 176,
  strokeWidth = 14,
  className,
  trackClassName,
  indicatorClassName,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
}) {
  const [filled, setFilled] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = filled ? circumference * (1 - clamped) : circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("-rotate-90", className)}
      role="img"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className={cn("stroke-muted fill-none", trackClassName)}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn(
          "stroke-primary fill-none transition-[stroke-dashoffset] duration-[900ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
          indicatorClassName,
        )}
      />
    </svg>
  );
}

export { ProgressRing };
