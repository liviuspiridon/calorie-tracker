/**
 * Shared meal-logging domain shapes. The analysis pipeline itself —
 * MealItemService -> AIProvider -> GeminiProvider — lives in ./server and
 * @/lib/ai; this file only holds the data shapes both ends agree on.
 */
export interface MealAnalysis {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /**
   * Set on freshly-analyzed meals; the meals table has no confidence column,
   * so it doesn't survive a reload. Absent means "unknown", and the UI hides
   * the badge rather than inventing a value.
   */
  confidence?: "low" | "medium" | "high";
}

export interface MealLogEntry {
  id: string;
  loggedAt: string;
  /** Aggregate totals — always present, always equal to sumItemMacros(items) when items exists. */
  analysis: MealAnalysis;
  /** Itemized breakdown from the meal builder. Absent for meals logged in one shot (legacy) or before the builder existed. */
  items?: MealItem[];
  /** Session-only, like confidence: no matching column in the meals table. */
  photoUrl?: string;
  note?: string;
}

/**
 * One ingredient added to a meal via the builder. Nutrition is stored per
 * 100g rather than as a total for the item's actual portion, so editing
 * `grams` (a number input/slider in the review step) recomputes that
 * item's absolute macros instantly on the client — no AI round-trip for a
 * weight change, only for changing what the food *is* (see editMealItems).
 */
export interface MealItem {
  id: string;
  description: string;
  grams: number;
  /**
   * Display unit only — "ml" for liquids (milk, water, coffee, juice, oil),
   * "g" for solids. `grams` and every per-100g rate are unaffected (1ml is
   * always treated as 1g), so no calculation changes with the unit; it only
   * changes what the UI prints next to the number. Absent means "g", same
   * as every item created before this field existed.
   */
  unit?: "g" | "ml";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  confidence?: "low" | "medium" | "high";
}

/** What the AI returns for one item — everything but the client-generated id. */
export type MealItemDraft = Omit<MealItem, "id">;

type MacroTotals = Pick<MealAnalysis, "calories" | "protein" | "carbs" | "fat" | "fiber">;

/** One item's absolute macros at its current `grams`, rounded. */
export function computeItemMacros(item: MealItemDraft): MacroTotals {
  const scale = item.grams / 100;
  return {
    calories: Math.round(item.caloriesPer100g * scale),
    protein: Math.round(item.proteinPer100g * scale),
    carbs: Math.round(item.carbsPer100g * scale),
    fat: Math.round(item.fatPer100g * scale),
    fiber: Math.round(item.fiberPer100g * scale),
  };
}

/** Sums every item's macros — the meal's running (or final) totals. */
export function sumItemMacros(items: MealItemDraft[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (totals, item) => {
      const macros = computeItemMacros(item);
      return {
        calories: totals.calories + macros.calories,
        protein: totals.protein + macros.protein,
        carbs: totals.carbs + macros.carbs,
        fat: totals.fat + macros.fat,
        fiber: totals.fiber + macros.fiber,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

const CONFIDENCE_RANK: Record<NonNullable<MealAnalysis["confidence"]>, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

/** The weakest confidence across items — used as the saved meal's overall confidence. */
export function lowestConfidence(items: MealItemDraft[]): MealAnalysis["confidence"] {
  let lowest: MealAnalysis["confidence"];
  for (const item of items) {
    if (!item.confidence) continue;
    if (!lowest || CONFIDENCE_RANK[item.confidence] < CONFIDENCE_RANK[lowest]) lowest = item.confidence;
  }
  return lowest;
}
