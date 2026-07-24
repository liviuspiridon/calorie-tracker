export interface DailyTargets {
  /** Resting Energy / BMR — the baseline the deficit is subtracted from. */
  bmr: number;
  /** Target daily calorie deficit, subtracted from bmr. */
  calorieDeficit: number;
  protein: number;
  fiber: number;
  /** For computing BMI from weight entries — not date-scoped, just the current value. */
  heightCm: number;
}

/**
 * Generic defaults so the dashboard is useful immediately, editable anytime
 * from the targets sheet. Not personalized — there's no onboarding flow
 * (yet) to derive these from bodyweight, activity, or goals.
 */
export const DEFAULT_DAILY_TARGETS: DailyTargets = {
  bmr: 1750,
  calorieDeficit: 500,
  protein: 120,
  fiber: 28,
  heightCm: 178,
};

/** The daily calorie budget is always derived, never stored as its own input. */
export function calorieTargetFrom(targets: Pick<DailyTargets, "bmr" | "calorieDeficit">): number {
  return targets.bmr - targets.calorieDeficit;
}
