import { ProgressRing } from "@/components/ui/progress-ring";
import { DAY_STATUS_COPY, type DayStatus } from "@/features/goals/lib/daily-progress";
import { cn } from "@/lib/utils";

const STATUS_TONE_CLASSES: Record<string, string> = {
  default: "bg-primary/15 text-primary",
  secondary: "bg-foreground/5 text-muted-foreground",
  outline: "bg-foreground/5 text-muted-foreground",
  destructive: "bg-destructive/15 text-destructive",
};

/**
 * The screen's focal point. Lives inside the hero zone in TodayDashboard —
 * the zone provides the ambient color now, this only provides the number.
 */
export function CalorieHero({
  status,
  caloriesConsumed,
  calorieTarget,
  revealed,
}: {
  status: DayStatus;
  caloriesConsumed: number;
  calorieTarget: number;
  /** Delays the status pill until the ring has mostly finished filling. */
  revealed: boolean;
}) {
  const isOver = caloriesConsumed > calorieTarget;
  const caloriesRemaining = Math.abs(calorieTarget - caloriesConsumed);
  const progress = calorieTarget > 0 ? caloriesConsumed / calorieTarget : 0;
  const statusCopy = DAY_STATUS_COPY[status];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <ProgressRing
          progress={progress}
          size={272}
          strokeWidth={14}
          trackClassName="stroke-foreground/10"
          indicatorClassName={isOver ? "stroke-destructive" : "stroke-primary"}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl leading-none font-medium tracking-tighter tabular-nums">
            {caloriesRemaining.toLocaleString()}
          </span>
          <span className="text-muted-foreground mt-3 text-xs font-medium tracking-[0.12em] uppercase">
            {isOver ? "kcal over" : "kcal left"}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "rounded-full px-3.5 py-1.5 text-xs font-medium transition-[opacity,transform] duration-500 ease-out",
          revealed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          STATUS_TONE_CLASSES[statusCopy.badgeVariant],
        )}
        style={{ transitionDelay: revealed ? "500ms" : "0ms" }}
      >
        {statusCopy.label}
      </span>
    </div>
  );
}
