import { cn } from "@/lib/utils";

/** Generic circular progress indicator. No domain knowledge — `progress` is 0–1. */
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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - clamped);

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
          "stroke-primary fill-none transition-[stroke-dashoffset] duration-700 ease-out",
          indicatorClassName,
        )}
      />
    </svg>
  );
}

export { ProgressRing };
