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

/** Formats Gemini accepts for inline image data. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Decoded-bytes ceiling. The client downscales well below this; the cap
 *  bounds cost/abuse on what is, like every server action here, an
 *  unauthenticated endpoint. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function analyzeMealPhoto(image: {
  data: string;
  mimeType: string;
}): Promise<MealAnalysis> {
  if (!image?.data) {
    throw new Error("No image data received.");
  }
  if (!ALLOWED_IMAGE_TYPES.includes(image.mimeType)) {
    throw new Error(`Unsupported image type: ${image.mimeType}`);
  }
  // base64 encodes 3 bytes per 4 chars.
  if (Math.ceil((image.data.length * 3) / 4) > MAX_IMAGE_BYTES) {
    throw new Error("That image is too large to analyze.");
  }

  return mealAnalysisService.analyzeMealPhoto(image);
}
