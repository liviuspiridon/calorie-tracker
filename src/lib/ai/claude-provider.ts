import type { AICompletionRequest, AICompletionResponse, AIProvider } from "./provider";

const SIMULATED_LATENCY_MS = 700;

/**
 * Stub adapter for the Anthropic Messages API — implements `AIProvider` but
 * fabricates a response instead of calling any real model.
 *
 * When ready: construct an Anthropic client from `AI_API_KEY`
 * (`src/lib/env.ts`, server-side only) and call `messages.create()` inside
 * `complete()`. `AIProvider` is the only contract anything upstream depends
 * on, so this is the one file that changes — everything below `complete()`
 * is throwaway stub logic, not part of the shape callers rely on.
 */
export class ClaudeProvider implements AIProvider {
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
    return { text: fabricateResponse(request.prompt) };
  }
}

// ---------------------------------------------------------------------------
// Stub only — a keyword/weight heuristic standing in for a real model call.
// Assumes the meal-analysis JSON shape since that's the only caller today;
// delete this whole section once `complete()` calls the real API.
// ---------------------------------------------------------------------------

interface FoodProfile {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

const FOOD_PROFILES: Record<string, FoodProfile> = {
  chicken: { caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  beef: { caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 17 },
  salmon: { caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  egg: { caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  eggs: { caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  rice: { caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  pasta: { caloriesPer100g: 158, proteinPer100g: 5.8, carbsPer100g: 31, fatPer100g: 0.9 },
  bread: { caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
  potato: { caloriesPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1 },
  oats: { caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66, fatPer100g: 6.9 },
  salad: { caloriesPer100g: 20, proteinPer100g: 1.5, carbsPer100g: 4, fatPer100g: 0.2 },
  avocado: { caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15 },
  cheese: { caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33 },
  yogurt: { caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4 },
  banana: { caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  pizza: { caloriesPer100g: 266, proteinPer100g: 11, carbsPer100g: 33, fatPer100g: 10 },
};

const FALLBACK_ESTIMATE = { calories: 350, protein: 15, carbs: 35, fat: 12 };

function fabricateResponse(prompt: string): string {
  const normalized = prompt.toLowerCase();
  const grams = [...normalized.matchAll(/(\d+)\s?(?:g|grams?)\b/g)].map((match) =>
    Number(match[1]),
  );
  const matchedFoods = Object.keys(FOOD_PROFILES).filter((food) =>
    new RegExp(`\\b${food}\\b`).test(normalized),
  );

  if (matchedFoods.length === 0) {
    return JSON.stringify({
      description: prompt.trim(),
      ...FALLBACK_ESTIMATE,
      confidence: "low",
    });
  }

  const totals = matchedFoods.reduce(
    (acc, food, index) => {
      const profile = FOOD_PROFILES[food];
      const factor = (grams[index] ?? 100) / 100;
      return {
        calories: acc.calories + profile.caloriesPer100g * factor,
        protein: acc.protein + profile.proteinPer100g * factor,
        carbs: acc.carbs + profile.carbsPer100g * factor,
        fat: acc.fat + profile.fatPer100g * factor,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return JSON.stringify({
    description: prompt.trim(),
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    confidence: "medium",
  });
}
