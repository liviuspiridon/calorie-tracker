"use server";

import { GeminiProvider } from "@/lib/ai/gemini-provider";

import { MealItemService } from "./server/meal-item-service";
import type { MealItemDraft } from "./types";

const mealItemService = new MealItemService(new GeminiProvider());

/**
 * The client calls these, gets back `MealItemDraft`(s) — that contract is
 * final. Everything about *how* that happens (which AI provider, prompt
 * shape, response parsing) lives behind `MealItemService`; this boundary
 * exists so `GEMINI_API_KEY`, once used, never reaches the client.
 */
export async function analyzeMealItem(text: string): Promise<MealItemDraft> {
  return mealItemService.analyzeItem(text);
}

/** Formats Gemini accepts for inline image data. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Decoded-bytes ceiling. The client downscales well below this; the cap
 *  bounds cost/abuse on what is, like every server action here, an
 *  unauthenticated endpoint. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function analyzeMealItemPhoto(
  image: { data: string; mimeType: string },
  mode: "food" | "label",
  quantityHint?: string,
): Promise<MealItemDraft> {
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

  return mealItemService.analyzeItemPhoto(image, mode, quantityHint);
}

/** Natural-language edit across the whole item list — see MealItemService.editItems. */
export async function editMealItems(
  items: MealItemDraft[],
  instruction: string,
): Promise<MealItemDraft[]> {
  if (items.length === 0) {
    throw new Error("editMealItems requires at least one existing item.");
  }
  return mealItemService.editItems(items, instruction);
}
