export type DayStatus = "just-starting" | "on-track" | "ahead" | "behind" | "over";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;

/**
 * Compares calories eaten so far against a simple time-of-day expectation —
 * not real activity data (no Apple Health integration yet), just "how far
 * through the day are you vs. how far through your budget are you."
 */
export function computeDayStatus({
  caloriesConsumed,
  calorieTarget,
  now,
}: {
  caloriesConsumed: number;
  calorieTarget: number;
  now: Date;
}): DayStatus {
  if (calorieTarget <= 0) return "on-track";
  if (caloriesConsumed > calorieTarget) return "over";

  const hour = now.getHours() + now.getMinutes() / 60;
  const dayFraction = clamp((hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR), 0, 1);
  const calorieFraction = caloriesConsumed / calorieTarget;

  if (caloriesConsumed === 0 && dayFraction < 0.2) return "just-starting";
  if (calorieFraction - dayFraction > 0.25) return "ahead";
  if (dayFraction - calorieFraction > 0.35 && dayFraction > 0.3) return "behind";
  return "on-track";
}

export const DAY_STATUS_COPY: Record<
  DayStatus,
  { label: string; badgeVariant: "default" | "secondary" | "outline" | "destructive" }
> = {
  "just-starting": { label: "Just getting started", badgeVariant: "secondary" },
  "on-track": { label: "On track", badgeVariant: "default" },
  ahead: { label: "Ahead of pace", badgeVariant: "outline" },
  behind: { label: "Behind for today", badgeVariant: "outline" },
  over: { label: "Over today's target", badgeVariant: "destructive" },
};

/** Rule-based today: no AI here yet — the AI coach can replace this later without the dashboard changing. */
export function getNextAction({
  status,
  mealsLoggedToday,
  caloriesRemaining,
  proteinRemaining,
}: {
  status: DayStatus;
  mealsLoggedToday: number;
  caloriesRemaining: number;
  proteinRemaining: number;
}): string {
  if (mealsLoggedToday === 0) {
    return "You haven't logged anything yet today — start with your last meal.";
  }
  if (status === "over") {
    return "You're over today's calorie target — maybe ease up for the rest of the day.";
  }
  if (status === "behind") {
    return "You're behind pace today — don't forget to eat.";
  }
  if (proteinRemaining >= 20 && caloriesRemaining > 0) {
    return `${proteinRemaining}g protein left today — a protein-rich meal would help.`;
  }
  if (caloriesRemaining <= 0) {
    return "You've hit your calorie target for today. Nice work.";
  }
  return `You're on track — ${caloriesRemaining} kcal and ${proteinRemaining}g protein left today.`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
