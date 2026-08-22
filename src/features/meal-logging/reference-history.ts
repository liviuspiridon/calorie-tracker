import { formatLocalDate, parseLocalDate } from "@/lib/utils";

import type { HistoryItem, HistoryMeal, MealLogEntry } from "./types";

/** How far back reference matching looks — see MealItemService's REFERENCE_GUIDELINE. */
const HISTORY_WINDOW_DAYS = 14;

/**
 * Best-effort, Romanian-first (this app's real usage — see
 * useSpeechRecognition's `ro-RO` lock) signal that the user is referencing
 * a previously-logged ingredient rather than describing a fresh one.
 * Deliberately not exhaustive: a missed phrasing just means no history gets
 * attached and the input is treated as a fresh description, same as today
 * — a graceful, non-broken fallback, not a hard requirement to catch every
 * possible phrasing.
 */
const REFERENCE_PATTERNS: RegExp[] = [
  /\bieri\b/i,
  /\balalt[ăa]ieri\b/i,
  /\bacum c[âa]teva zile\b/i,
  /\b(luni|mart[ei]i|miercuri|joi|vineri|s[âa]mb[ăa]t[ăa]|duminic[ăa])\b/i,
  /\bde obicei\b/i,
  /\bca de obicei\b/i,
  /\bde regul[ăa]\b/i,
  /\bca de fiecare dat[ăa]\b/i,
  /\bca data trecut[ăa]\b/i,
  /\bca ultima dat[ăa]\b/i,
  /\bca r[âa]ndul trecut\b/i,
];

export function looksLikeReference(text: string): boolean {
  return REFERENCE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Compacts the last `days` calendar days of `meals` into the shape offered
 * to `resolveTurn` as reference-matching context (see
 * server/meal-item-service.ts's REFERENCE_GUIDELINE) — grouped by meal
 * (not flattened/deduped across meals) so date/time-based disambiguation
 * ("care masă de vineri") stays answerable. Legacy meals with no itemized
 * `items` get the same single-synthetic-item treatment used elsewhere for
 * editing them, built straight from the aggregate `analysis` (grams: 100,
 * so the old totals are directly the per-100g rates).
 */
export function buildRecentHistory(meals: MealLogEntry[], days: number = HISTORY_WINDOW_DAYS): HistoryMeal[] {
  const now = new Date();
  const windowStart = parseLocalDate(formatLocalDate(now));
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const inWindow = meals
    .filter((meal) => new Date(meal.loggedAt).getTime() >= windowStart.getTime())
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  let nextId = 0;
  return inWindow.map((meal) => {
    const loggedAt = new Date(meal.loggedAt);
    const items: HistoryItem[] = (
      meal.items?.length
        ? meal.items
        : [
            {
              description: meal.analysis.description,
              grams: 100,
              unit: undefined,
              caloriesPer100g: meal.analysis.calories,
              proteinPer100g: meal.analysis.protein,
              carbsPer100g: meal.analysis.carbs,
              fatPer100g: meal.analysis.fat,
              fiberPer100g: meal.analysis.fiber,
              confidence: meal.analysis.confidence,
              source: undefined,
            },
          ]
    ).map((item) => ({
      id: `h${nextId++}`,
      description: item.description,
      grams: item.grams,
      unit: item.unit,
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      fiberPer100g: item.fiberPer100g,
      confidence: item.confidence,
      source: item.source,
    }));

    return {
      date: formatLocalDate(loggedAt),
      time: `${String(loggedAt.getHours()).padStart(2, "0")}:${String(loggedAt.getMinutes()).padStart(2, "0")}`,
      items,
    };
  });
}
