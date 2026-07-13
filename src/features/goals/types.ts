export interface DailyTargets {
  calories: number;
  protein: number;
}

/**
 * Generic defaults so the dashboard is useful immediately, editable anytime
 * from the targets sheet. Not personalized — there's no onboarding flow
 * (yet) to derive these from bodyweight, activity, or goals.
 */
export const DEFAULT_DAILY_TARGETS: DailyTargets = {
  calories: 2000,
  protein: 120,
};
