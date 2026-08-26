import { calorieTargetFrom } from "../types";

/**
 * The ring's four slices, in the order they wrap around the circle from the
 * top. `available` and `active` are the two halves of "still eatable" —
 * split so the activity bonus stays visually distinct, exactly as the older
 * horizontal meter rendered it.
 */
export type CalorieRingSegmentKey = "consumed" | "available" | "active" | "deficit";

export interface CalorieRingSegment {
  key: CalorieRingSegmentKey;
  kcal: number;
}

export interface CalorieRing {
  /** Resting energy + active — one full turn of the ring. */
  arcTotal: number;
  /** Resting energy − target deficit + active: what may actually be eaten. */
  foodBudget: number;
  /** foodBudget − consumed. Goes negative once eating passes the budget. */
  remaining: number;
  /** Consumed past maintenance (arcTotal) — drawn outside the ring. */
  surplus: number;
  segments: CalorieRingSegment[];
  /** Eating has started into the planned deficit. */
  isOverBudget: boolean;
  /** Eating has consumed the whole deficit and passed maintenance. */
  isOverMaintenance: boolean;
}

/**
 * Segment geometry for the calorie ring, derived entirely from values the
 * app already stores: `bmr` (resting energy) and `targetDeficit` from the
 * editable daily targets, plus the day's consumed and active calories.
 *
 * The slices always sum to `arcTotal`, so the ring stays a closed circle in
 * every state. Overeating erodes them from the far end inward — the base
 * remainder first, then the activity bonus, then the planned deficit —
 * which is the same order the previous horizontal meter used. Past
 * maintenance nothing is left to erode, so the excess becomes `surplus`
 * instead of distorting the circle.
 */
export function computeCalorieRing({
  bmr,
  targetDeficit,
  activeCalories,
  caloriesConsumed,
}: {
  bmr: number;
  targetDeficit: number;
  activeCalories: number;
  caloriesConsumed: number;
}): CalorieRing {
  const baseTarget = calorieTargetFrom({ bmr, calorieDeficit: targetDeficit });
  const arcTotal = Math.max(1, bmr + activeCalories);
  const foodBudget = baseTarget + activeCalories;

  // Each overflow feeds the next slice's erosion, so the four always total arcTotal.
  const overBase = Math.max(0, caloriesConsumed - baseTarget);
  const overActive = Math.max(0, overBase - activeCalories);

  const segments: CalorieRingSegment[] = [
    { key: "consumed", kcal: Math.min(caloriesConsumed, arcTotal) },
    { key: "available", kcal: Math.max(0, baseTarget - caloriesConsumed) },
    { key: "active", kcal: Math.max(0, activeCalories - overBase) },
    { key: "deficit", kcal: Math.max(0, targetDeficit - overActive) },
  ];

  return {
    arcTotal,
    foodBudget,
    remaining: foodBudget - caloriesConsumed,
    surplus: Math.max(0, caloriesConsumed - arcTotal),
    segments,
    isOverBudget: caloriesConsumed > foodBudget,
    isOverMaintenance: caloriesConsumed > arcTotal,
  };
}
