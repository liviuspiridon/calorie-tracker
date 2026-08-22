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
  /**
   * How the macros were obtained — orthogonal to `confidence` (a label
   * reading can still be low-confidence if the photo is blurry). "repeated"
   * means copied verbatim from a past logging via reference matching (see
   * reference-history.ts) rather than freshly estimated or read off a
   * label. Absent means "estimated", same as every item created before
   * this field existed.
   */
  source?: "label" | "estimated" | "repeated";
}

/** What the AI returns for one item — everything but the client-generated id. */
export type MealItemDraft = Omit<MealItem, "id">;

/** One turn of the building-step conversation, building-step-only — never persisted. */
export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** `data:` URL thumbnail — present when a user turn attached a photo. */
  photoPreviewUrl?: string;
}

/**
 * What one turn of `resolveTurn` (see server/meal-item-service.ts) returns.
 * `"clarify"` means the model couldn't safely default a missing detail
 * (quantity, food identity) and is asking instead of guessing — `item` is
 * only present when `status === "resolved"`.
 */
export interface MealTurnResult {
  status: "resolved" | "clarify";
  /** Conversational reply shown to the user: a confirmation + prompt to continue/finish, or a clarifying question. */
  message: string;
  item?: MealItemDraft;
}

/**
 * Continuation context for a turn that answers an earlier "clarify"
 * response — every question/answer round for this one ingredient so far,
 * so the model sees the full thread rather than just the latest fragment.
 */
export interface TurnContext {
  originalText?: string;
  exchange: { question: string; answer: string }[];
}

/**
 * One recent ingredient occurrence, offered to `resolveTurn` as
 * reference-matching context (see reference-history.ts) — a compact
 * subset of MealItem. `id` is a short synthetic ref ("h0", "h1", ...) for
 * the model to point back at, not the real MealItem id.
 */
export interface HistoryItem {
  id: string;
  description: string;
  grams: number;
  unit?: "g" | "ml";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  confidence?: "low" | "medium" | "high";
  source?: "label" | "estimated" | "repeated";
}

/**
 * One recently-logged meal, offered as reference-matching context.
 * `time` (HH:MM local) is the only available proxy for "breakfast" vs
 * "dinner" — the meals table has no stored meal-type category.
 */
export interface HistoryMeal {
  date: string;
  time: string;
  items: HistoryItem[];
}

/**
 * One discrepancy `reconcileWithPhoto` found between the logged items and a
 * plate photo. `targetIndex` is the position in the items array as sent to
 * the model — indices, not descriptions, because two logged items can
 * legitimately share a description (e.g. eggs added in two separate
 * turns), which would make description-matching ambiguous.
 */
export interface ReconciliationSuggestion {
  targetIndex: number;
  issue: string;
  suggestedGrams: number;
}

export interface ReconciliationResult {
  message: string;
  suggestions: ReconciliationSuggestion[];
}

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
