/**
 * Post-log feedback: "nudge or silence". After a new entry is saved, exactly
 * one outcome is chosen from the day's numbers — a short, actionable
 * Romanian micro-copy nudge, or nothing at all. Fully deterministic (no AI
 * call): every scenario is computable from calories/protein/targets, which
 * is what makes the nudge instant and free.
 */

export type NudgeScenario =
  | "over-target" //       D: this entry pushed the day past its calorie budget
  | "approaching-target" //C: within 15% of the day's budget
  | "protein-goal" //      E: this entry crossed the protein target
  | "light-meal"; //       B: light morning entry with a generous budget left

export interface Nudge {
  scenario: NudgeScenario;
  message: string;
}

export interface NudgeInput {
  /** Calories of the entry that was just logged. */
  entryCalories: number;
  /** Today's calorie total before / after this entry. */
  caloriesBefore: number;
  caloriesAfter: number;
  /** The day's effective calorie budget (base target + activity bonus). */
  calorieTarget: number;
  /** Today's protein total before / after this entry. */
  proteinBefore: number;
  proteinAfter: number;
  proteinTarget: number;
  /** The user's local hour (0-23) — gates the breakfast copy to mornings. */
  localHour: number;
}

/** Scenario C fires when remaining budget drops inside this fraction. */
const APPROACHING_FRACTION = 0.15;
/** Scenario B: an entry at or under this counts as "light". */
const LIGHT_MEAL_MAX_KCAL = 300;
/** Scenario B: at least this fraction of the budget must still be open. */
const GENEROUS_REMAINING_FRACTION = 0.5;

/** All user-facing copy in one place. Romanian only, micro-length. */
export const NUDGE_COPY = {
  lightMeal: (remaining: number) =>
    `Mic dejun salvat! Mai ai un buget generos de ${Math.round(remaining)} kcal pentru restul zilei.`,
  approachingTarget: (remaining: number) =>
    `Înregistrat cu succes. Ți-au mai rămas ${Math.round(remaining)} kcal pentru cină.`,
  overTarget: (over: number) =>
    `Ai depășit obiectivul cu ${Math.round(over)} kcal azi, dar e în regulă—ne reglăm din mers mâine!`,
  proteinGoal: () => "Bravo! Ai atins deja targetul de proteine pentru astăzi.",
} as const;

/**
 * Picks at most one nudge, in priority order: over target (D) beats
 * approaching (C) beats protein win (E) beats light-morning reassurance (B);
 * everything else is silence (A). Two anti-nagging rules: D and E fire only
 * when THIS entry crosses their threshold — being told "you're over" or
 * "protein done" again on every subsequent snack would be noise, not a
 * nudge.
 */
export function decideNudge(input: NudgeInput): Nudge | null {
  const {
    entryCalories,
    caloriesBefore,
    caloriesAfter,
    calorieTarget,
    proteinBefore,
    proteinAfter,
    proteinTarget,
    localHour,
  } = input;

  if (calorieTarget <= 0) return null;
  const remaining = calorieTarget - caloriesAfter;

  // D — crossed the budget with this entry.
  if (caloriesAfter > calorieTarget) {
    if (caloriesBefore > calorieTarget) return null; // already over: stay quiet
    return {
      scenario: "over-target",
      message: NUDGE_COPY.overTarget(caloriesAfter - calorieTarget),
    };
  }

  // C — inside the final stretch of the budget.
  if (remaining > 0 && remaining <= calorieTarget * APPROACHING_FRACTION) {
    return {
      scenario: "approaching-target",
      message: NUDGE_COPY.approachingTarget(remaining),
    };
  }

  // E — this entry crossed the protein target.
  if (proteinTarget > 0 && proteinBefore < proteinTarget && proteinAfter >= proteinTarget) {
    return { scenario: "protein-goal", message: NUDGE_COPY.proteinGoal() };
  }

  // B — light morning entry with most of the day's budget still open. Gated
  // to mornings because the copy literally says breakfast; a light dinner
  // with budget left is routine (A), not nudge-worthy.
  if (
    localHour >= 5 &&
    localHour < 12 &&
    entryCalories <= LIGHT_MEAL_MAX_KCAL &&
    remaining >= calorieTarget * GENEROUS_REMAINING_FRACTION
  ) {
    return { scenario: "light-meal", message: NUDGE_COPY.lightMeal(remaining) };
  }

  // A — routine. Silence.
  return null;
}
