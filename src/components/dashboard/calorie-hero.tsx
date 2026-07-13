import { ProgressRing } from "@/components/ui/progress-ring";
import { DAY_STATUS_COPY, type DayStatus } from "@/features/goals/lib/daily-progress";
import { cn } from "@/lib/utils";

const STATUS_TONE_CLASSES: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-muted text-muted-foreground",
  outline: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

/** The screen's centerpiece — deliberately no card, no border, maximum whitespace. */
export function CalorieHero({
  status,
  caloriesConsumed,
  calorieTarget,
}: {
  status: DayStatus;
  caloriesConsumed: number;
  calorieTarget: number;
}) {
  const isOver = caloriesConsumed > calorieTarget;
  const caloriesRemaining = Math.abs(calorieTarget - caloriesConsumed);
  const progress = calorieTarget > 0 ? caloriesConsumed / calorieTarget : 0;
  const statusCopy = DAY_STATUS_COPY[status];

  return (
    <div className="relative flex flex-col items-center gap-5 py-6">
      <div
        aria-hidden="true"
        className="bg-primary/10 dark:bg-primary/15 absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />

      <div className="relative">
        <ProgressRing
          progress={progress}
          size={272}
          strokeWidth={18}
          indicatorClassName={isOver ? "stroke-destructive" : "stroke-primary"}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-6xl font-semibold tracking-tight tabular-nums">
            {caloriesRemaining.toLocaleString()}
          </span>
          <span className="text-muted-foreground mt-1.5 text-sm tracking-wide">
            {isOver ? "kcal over" : "kcal left"}
          </span>
        </div>
      </div>

      <span
        className={cn(
          "rounded-full px-3.5 py-1.5 text-xs font-medium",
          STATUS_TONE_CLASSES[statusCopy.badgeVariant],
        )}
      >
        {statusCopy.label}
      </span>
    </div>
  );
}
