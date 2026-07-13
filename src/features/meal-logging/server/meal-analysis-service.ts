import type { AIProvider } from "@/lib/ai/provider";

import type { MealAnalysis } from "../types";

const SYSTEM_PROMPT = `You are a nutrition analyst. Given a short, informal description of a meal, estimate its nutrition.

Respond with ONLY a JSON object — no prose, no markdown — matching exactly:
{"description": string, "calories": number, "protein": number, "carbs": number, "fat": number, "confidence": "low" | "medium" | "high"}`;

/**
 * Meal-analysis domain logic: builds the prompt, calls the AI provider,
 * defensively parses whatever comes back into `MealAnalysis`. Depends only
 * on `AIProvider` — swapping `ClaudeProvider` for a different implementation,
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
