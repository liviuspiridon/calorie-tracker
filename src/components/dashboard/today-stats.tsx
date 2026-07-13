"use client";

import { type DayStatus } from "@/features/goals/lib/daily-progress";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

const STATUS_HEADLINE: Record<DayStatus, { text: string; className: string }> = {
  "just-starting": { text: "Fresh start today.", className: "text-foreground" },
  "on-track": { text: "You're on track today.", className: "text-primary" },
  ahead: { text: "Ahead of pace today.", className: "text-foreground" },
  behind: { text: "A bit behind today.", className: "text-foreground" },
  over: { text: "Over today's target.", className: "text-destructive" },
};

/**
 * The screen's core statement: a headline you read, then two numbers you
 * glance at. No ring, no card — the underline beneath each number is the
 * only progress cue, and it's typographic ornament, not a UI widget.
 */
export function TodayStats({
  status,
  caloriesConsumed,
  calorieTarget,
  proteinConsumed,
  proteinTarget,
}: {
  status: DayStatus;
  caloriesConsumed: number;
  calorieTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
}) {
  const isOver = caloriesConsumed > calorieTarget;
  const caloriesRemaining = Math.abs(calorieTarget - caloriesConsumed);
  const proteinRemaining = Math.max(0, proteinTarget - proteinConsumed);

  const calorieDisplay = useCountUp(caloriesRemaining);
  const proteinDisplay = useCountUp(proteinRemaining);

  const calorieProgress = calorieTarget > 0 ? Math.min(1, caloriesConsumed / calorieTarget) : 0;
  const proteinProgress = proteinTarget > 0 ? Math.min(1, proteinConsumed / proteinTarget) : 0;

  const headline = STATUS_HEADLINE[status];

  return (
    <div>
      <h1
        className={cn(
          "text-4xl leading-tight font-semibold tracking-tight",
          headline.className,
        )}
      >
        {headline.text}
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
        <div>
          <span className="text-7xl leading-none font-medium tracking-tighter tabular-nums">
            {calorieDisplay.toLocaleString()}
          </span>
          <p className="text-muted-foreground mt-3 text-xs font-medium tracking-[0.12em] uppercase">
            {isOver ? "kcal over" : "kcal left"}
          </p>
          <div className="bg-foreground/10 mt-3 h-[3px] w-full max-w-40 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-out",
                isOver ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${calorieProgress * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline">
            <span className="text-7xl leading-none font-medium tracking-tighter tabular-nums">
              {proteinDisplay}
            </span>
            <span className="text-muted-foreground ml-1 text-2xl font-medium">g</span>
          </div>
          <p className="text-muted-foreground mt-3 text-xs font-medium tracking-[0.12em] uppercase">
            protein left
          </p>
          <div className="bg-foreground/10 mt-3 h-[3px] w-full max-w-40 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${proteinProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
