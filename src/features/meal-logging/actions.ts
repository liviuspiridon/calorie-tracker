"use server";

import { GeminiProvider } from "@/lib/ai/gemini-provider";

import { MealAnalysisService } from "./server/meal-analysis-service";
import type { MealAnalysis } from "./types";

const mealAnalysisService = new MealAnalysisService(new GeminiProvider());

/**
 * The client calls this, gets back a `MealAnalysis` — that contract is
 * final. Everything about *how* that happens (which AI provider, prompt
 * shape, response parsing) lives behind `MealAnalysisService`; this boundary
 * exists so `GEMINI_API_KEY`, once used, never reaches the client.
 */
export async function analyzeMeal(text: string): Promise<MealAnalysis> {
  return mealAnalysisService.analyzeMeal(text);
}
