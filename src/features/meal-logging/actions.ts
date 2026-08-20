"use server";

import { GeminiProvider } from "@/lib/ai/gemini-provider";

import { MealItemService } from "./server/meal-item-service";
import type { MealItemDraft, MealTurnResult, ReconciliationResult, TurnContext } from "./types";

const mealItemService = new MealItemService(new GeminiProvider());

/** Formats Gemini accepts for inline image data. */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Decoded-bytes ceiling. The client downscales well below this; the cap
 *  bounds cost/abuse on what is, like every server action here, an
 *  unauthenticated endpoint. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function validateImage(image: { data: string; mimeType: string }) {
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
}

/**
 * The client calls these, gets back structured results — that contract is
 * final. Everything about *how* that happens (which AI provider, prompt
 * shape, response parsing) lives behind `MealItemService`; this boundary
 * exists so `GEMINI_API_KEY`, once used, never reaches the client.
 *
 * One turn of the building-step conversation — resolves an ingredient from
 * text and/or a photo, or asks a clarifying question instead of guessing.
 * `context` is passed when this call answers an earlier "clarify" response.
 */
export async function resolveMealTurn(input: {
  text?: string;
  image?: { data: string; mimeType: string };
  mode?: "food" | "label";
  context?: TurnContext;
  forceResolve?: boolean;
}): Promise<MealTurnResult> {
  if (input.image) validateImage(input.image);
  return mealItemService.resolveTurn(input);
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

/** Compares the logged items to a plate photo — proposals only, never auto-applied. See MealItemService.reconcileWithPhoto. */
export async function reconcileMealWithPhoto(
  items: MealItemDraft[],
  image: { data: string; mimeType: string },
): Promise<ReconciliationResult> {
  validateImage(image);
  return mealItemService.reconcileWithPhoto(items, image);
}

// --- Superseded by resolveMealTurn() above, kept only pending removal in a
// follow-up commit so this one is a pure "new flow, still functional and
// side-by-side with the old" snapshot rather than an add+delete mixed
// together. Nothing in the UI calls these anymore.

/** @deprecated superseded by resolveMealTurn. */
export async function analyzeMealItem(text: string): Promise<MealItemDraft> {
  return mealItemService.analyzeItem(text);
}

/** @deprecated superseded by resolveMealTurn. */
export async function analyzeMealItemPhoto(
  image: { data: string; mimeType: string },
  mode: "food" | "label",
  quantityHint?: string,
): Promise<MealItemDraft> {
  validateImage(image);
  return mealItemService.analyzeItemPhoto(image, mode, quantityHint);
}
