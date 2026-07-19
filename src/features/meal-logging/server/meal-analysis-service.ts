import { extractJson } from "@/lib/ai/extract-json";
import type { AIImageInput, AIProvider } from "@/lib/ai/provider";

import type { MealAnalysis } from "../types";

const SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app. Given a short, informal meal description, estimate realistic nutrition totals for the whole meal.

Guidelines:
- Use typical portion sizes when quantities aren't given.
- description: a concise, cleaned-up restatement of the meal — keep the user's wording where it's already clear.
- calories/protein/carbs/fat: whole-meal totals (kcal and grams), rounded to integers.
- confidence: "high" when foods and quantities are specific, "medium" when portions had to be assumed, "low" when the description is vague or ambiguous.`;

const PHOTO_SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app, estimating a meal from a photo.

Guidelines:
- Identify every food and drink visible, and estimate portion sizes/weights from visual cues (plate and utensil size, container volume, height of the pile).
- description: a concise list of what's on the plate, with your estimated portions — e.g. "Grilled chicken breast (~180g), rice (~150g), mixed salad".
- calories/protein/carbs/fat: totals for everything visible, rounded to integers.
- confidence: "high" when foods and portions are clearly readable, "medium" when portions had to be assumed, "low" when the photo is unclear, partially hidden, or may not be food at all.
- If the image contains no food, return zeros with "low" confidence and say so in the description.`;

const PHOTO_PROMPT =
  "Analyze this meal photo. Identify the foods, estimate the portion sizes/weights, and report the calories and macros for the whole meal.";

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

  /**
   * Same contract as analyzeMeal, but the meal is described by a photo
   * instead of words — the returned MealAnalysis feeds the identical review
   * step, so the user still confirms/edits before anything is saved.
   */
  async analyzeMealPhoto(image: AIImageInput): Promise<MealAnalysis> {
    if (!image.data) {
      throw new Error("MealAnalysisService.analyzeMealPhoto requires image data.");
    }

    const response = await this.aiProvider.complete({
      system: PHOTO_SYSTEM_PROMPT,
      prompt: PHOTO_PROMPT,
      image,
      jsonSchema: { ...MEAL_ANALYSIS_SCHEMA },
    });

    return parseAnalysis(response.text, "Meal from photo");
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

function toNonNegativeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
}

function toConfidence(value: unknown): MealAnalysis["confidence"] {
  return value === "low" || value === "medium" || value === "high" ? value : "low";
}
