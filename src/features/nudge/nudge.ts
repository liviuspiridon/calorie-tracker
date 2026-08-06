/**
 * Post-log feedback: "nudge or silence". After a new entry is saved, exactly
 * one outcome is chosen from the day's numbers — a short, actionable nudge,
 * or nothing at all. WHETHER a nudge fires (and which of the four scenarios)
 * stays fully deterministic and instant, computed here from calories/
 * protein/targets — no AI call, no latency, no cost for the common case of
 * silence. HOW it's phrased is a separate concern: `decideNudge` returns a
 * `NudgeSituation`, structured context handed to
 * features/nudge/server/nudge-message-service.ts, which is what actually
 * writes the message (a warm, nutritionist-voiced take on what was eaten,
 * not a fixed template) — see that file for why.
 */

export type NudgeScenario =
  | "over-target" //       D: this entry pushed the day past its calorie budget
  | "approaching-target" //C: within 15% of the day's budget
  | "protein-goal" //      E: this entry crossed the protein target
  | "light-meal"; //       B: light morning entry with a generous budget left

/** The final, displayed nudge — scenario plus the AI-generated message text. */
export interface Nudge {
  scenario: NudgeScenario;
  message: string;
}

export interface NudgeInput {
  /** What was just logged — feeds the message service's food-specific commentary. */
  entryDescription: string;
  entryCalories: number;
  entryProtein: number;
  entryCarbs: number;
  entryFat: number;
  entryFiber: number;
  /** Today's calorie total before / after this entry. */
  caloriesBefore: number;
  caloriesAfter: number;
  /** The day's effective calorie budget (base target + activity bonus). */
  calorieTarget: number;
  /** Today's protein total before / after this entry. */
  proteinBefore: number;
  proteinAfter: number;
  proteinTarget: number;
  /** The user's local hour (0-23) — gates the light-meal scenario to mornings. */
  localHour: number;
}

/**
 * Structured context for one scenario, handed to the AI to write the actual
 * message — see NudgeMessageService.generateMessage. Carries the entry's
 * real macros (not just calories) so the message can speak to meal quality
 * and balance, per the nutritionist persona, instead of only budget math.
 */
export interface NudgeSituation {
  scenario: NudgeScenario;
  entryDescription: string;
  entryCalories: number;
  entryProtein: number;
  entryCarbs: number;
  entryFat: number;
  entryFiber: number;
  /** Remaining budget for the day after this entry (0 when already over). */
  caloriesRemainingToday: number;
  /** Only meaningful for "over-target": how far past budget this entry pushed the day. */
  caloriesOverToday: number;
  proteinRemainingToday: number;
  localHour: number;
}

/** Scenario C fires when remaining budget drops inside this fraction. */
const APPROACHING_FRACTION = 0.15;
/** Scenario B: an entry at or under this counts as "light". */
const LIGHT_MEAL_MAX_KCAL = 300;
/** Scenario B: at least this fraction of the budget must still be open. */
const GENEROUS_REMAINING_FRACTION = 0.5;

/**
 * Picks at most one scenario, in priority order: over target (D) beats
 * approaching (C) beats protein win (E) beats light-morning reassurance (B);
 * everything else is silence (A). Two anti-nagging rules: D and E fire only
 * when THIS entry crosses their threshold — being told "you're over" or
 * "protein done" again on every subsequent snack would be noise, not a
 * nudge.
 */
export function decideNudge(input: NudgeInput): NudgeSituation | null {
  const {
    entryDescription,
    entryCalories,
    entryProtein,
    entryCarbs,
    entryFat,
    entryFiber,
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

  const base = {
    entryDescription,
    entryCalories,
    entryProtein,
    entryCarbs,
    entryFat,
    entryFiber,
    localHour,
  };

  // D — crossed the budget with this entry.
  if (caloriesAfter > calorieTarget) {
    if (caloriesBefore > calorieTarget) return null; // already over: stay quiet
    return {
      ...base,
      scenario: "over-target",
      caloriesRemainingToday: 0,
      caloriesOverToday: caloriesAfter - calorieTarget,
      proteinRemainingToday: Math.max(0, proteinTarget - proteinAfter),
    };
  }

  // C — inside the final stretch of the budget.
  if (remaining > 0 && remaining <= calorieTarget * APPROACHING_FRACTION) {
    return {
      ...base,
      scenario: "approaching-target",
      caloriesRemainingToday: remaining,
      caloriesOverToday: 0,
      proteinRemainingToday: Math.max(0, proteinTarget - proteinAfter),
    };
  }

  // E — this entry crossed the protein target.
  if (proteinTarget > 0 && proteinBefore < proteinTarget && proteinAfter >= proteinTarget) {
    return {
      ...base,
      scenario: "protein-goal",
      caloriesRemainingToday: Math.max(0, remaining),
      caloriesOverToday: 0,
      proteinRemainingToday: 0,
    };
  }

  // B — light morning entry with most of the day's budget still open. Gated
  // to mornings since a light dinner with budget left is routine (A), not
  // nudge-worthy.
  if (
    localHour >= 5 &&
    localHour < 12 &&
    entryCalories <= LIGHT_MEAL_MAX_KCAL &&
    remaining >= calorieTarget * GENEROUS_REMAINING_FRACTION
  ) {
    return {
      ...base,
      scenario: "light-meal",
      caloriesRemainingToday: remaining,
      caloriesOverToday: 0,
      proteinRemainingToday: Math.max(0, proteinTarget - proteinAfter),
    };
  }

  // A — routine. Silence.
  return null;
}
