import type { AIProvider } from "@/lib/ai/provider";

import type { MealAnalysis } from "../types";

const SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app. Given a short, informal meal description, estimate realistic nutrition totals for the whole meal.

Guidelines:
- Use typical portion sizes when quantities aren't given.
- description: a concise, cleaned-up restatement of the meal — keep the user's wording where it's already clear.
- calories/protein/carbs/fat: whole-meal totals (kcal and grams), rounded to integers.
- confidence: "high" when foods and quantities are specific, "medium" when portions had to be assumed, "low" when the description is vague or ambiguous.`;

/**
 * Enforced server-side via structured outputs — the model's response is
 * guaranteed to match this shape. Mirrors MealAnalysis in ../types.
 */
const MEAL_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string", description: "Concise cleaned-up name of the meal" },
    calories: { type: "integer", description: "Estimated total kcal for the whole meal" },
    protein: { type: "integer", description: "Total protein in grams" },
    carbs: { type: "integer", description: "Total carbohydrates in grams" },
    fat: { type: "integer", description: "Total fat in grams" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["description", "calories", "protein", "carbs", "fat", "confidence"],
  additionalProperties: false,
} as const;

/**
 * Meal-analysis domain logic: builds the prompt, calls the AI provider,
 * defensively parses whatever comes back into `MealAnalysis`. Depends only
 * on `AIProvider` — swapping `GeminiProvider` for a different implementation,
 * or a different vendor entirely, never touches this file.
 */
export class MealAnalysisService {
  constructor(private readonly aiProvider: AIProvider) {}

  async analyzeMeal(text: string): Promise<MealAnalysis> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("MealAnalysisService.analyzeMeal requires non-empty text.");
    }

    const response = await this.aiProvider.complete({
      system: SYSTEM_PROMPT,
      prompt: trimmed,
      jsonSchema: { ...MEAL_ANALYSIS_SCHEMA },
    });

    return parseAnalysis(response.text, trimmed);
  }
}

/**
 * LLM output is text, not a guaranteed type — even asked nicely for JSON, a
 * real model can wrap it in prose, markdown fencing, or omit a field. This
 * never throws; malformed output degrades to a low-confidence placeholder
 * instead of failing the request.
 */
function parseAnalysis(rawText: string, fallbackDescription: string): MealAnalysis {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    return {
      description:
        typeof parsed.description === "string" && parsed.description.trim()
          ? parsed.description
          : fallbackDescription,
      calories: toNonNegativeNumber(parsed.calories),
      protein: toNonNegativeNumber(parsed.protein),
      carbs: toNonNegativeNumber(parsed.carbs),
      fat: toNonNegativeNumber(parsed.fat),
      confidence: toConfidence(parsed.confidence),
    };
  } catch {
    return {
      description: fallbackDescription,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: "low",
    };
  }
}

/** Strips any stray prose/markdown fencing a model might wrap JSON in. */
function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function toNonNegativeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
}

function toConfidence(value: unknown): MealAnalysis["confidence"] {
  return value === "low" || value === "medium" || value === "high" ? value : "low";
}
