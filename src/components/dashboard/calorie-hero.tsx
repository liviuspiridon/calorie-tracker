import { ProgressRing } from "@/components/ui/progress-ring";
import { DAY_STATUS_COPY, type DayStatus } from "@/features/goals/lib/daily-progress";
import { cn } from "@/lib/utils";

const STATUS_TONE_CLASSES: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  secondary: "bg-muted text-muted-foreground",
  outline: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
};

/**
 * The screen's centerpiece. No card, no border — separation comes from an
 * ambient color wash and whitespace, not a box. Numeral weight is medium,
 * not bold: large + confident reads calmer than large + heavy.
 */
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
    <div className="relative flex flex-col items-center gap-6 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="bg-primary/14 dark:bg-primary/18 size-80 rounded-full blur-3xl" />
        <div className="bg-primary/10 dark:bg-primary/15 absolute size-52 rounded-full blur-2xl" />
      </div>

      <div className="relative">
        <ProgressRing
          progress={progress}
          size={280}
          strokeWidth={15}
          trackClassName="stroke-muted/60"
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
          "rounded-full px-3.5 py-1.5 text-xs font-medium",
          STATUS_TONE_CLASSES[statusCopy.badgeVariant],
        )}
      >
        {statusCopy.label}
      </span>
    </div>
  );
}
