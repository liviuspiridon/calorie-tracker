import { extractJson } from "@/lib/ai/extract-json";
import type { AIImageInput, AIProvider } from "@/lib/ai/provider";

import type { MealItemDraft } from "../types";

const PER_100G_GUIDELINE = `- grams: your best estimate of the total weight in grams of the portion described/shown.
- caloriesPer100g/proteinPer100g/carbsPer100g/fatPer100g/fiberPer100g: this food's nutrition density per 100g — a stable reference fact about the food itself, NOT the total for the described portion. The app multiplies by grams/100 to get the total, so get the per-100g rate right; don't pre-multiply by the portion size yourself.`;

const TEXT_ITEM_SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app. The user is adding ONE ingredient to a meal they're building, described in their own words (e.g. "300g tomatoes", "2 eggs", "a slice of sourdough").

Guidelines:
- description: a concise, cleaned-up name for this one item.
${PER_100G_GUIDELINE}
- Use typical reference weights when the quantity is given by count ("2 eggs") rather than weight.
- confidence: "high" when the food and quantity are specific and typical, "medium" when the quantity had to be assumed, "low" when the food itself is ambiguous.`;

const PHOTO_FOOD_ITEM_SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app, identifying ONE food item from a photo (not a nutrition label — the food or dish itself).

Guidelines:
- description: a concise name for what's shown, e.g. "Grilled chicken breast".
${PER_100G_GUIDELINE}
- Estimate the portion size from visual cues (plate/utensil scale, container volume, height of the pile) unless the user gave you a quantity to use instead.
- confidence: "high" when the food and portion are clearly readable, "medium" when the portion had to be assumed, "low" when the photo is unclear or may not be food at all.`;

const PHOTO_LABEL_ITEM_SYSTEM_PROMPT = `You are reading a Nutrition Facts / nutrition label photo for a personal calorie-tracking app. The printed values are exact facts, not estimates — read them precisely.

Guidelines:
- description: the product name if visible on the label/packaging, otherwise a generic description of the product.
${PER_100G_GUIDELINE}
- Read caloriesPer100g etc. directly from the label's "per 100g" row if present. If the label only gives a "per serving" row, divide those values by the serving size in grams to get the per-100g rate.
- grams: the quantity the user says they're eating (parse it to a number of grams — if they gave a non-gram quantity like "a serving" or "2 slices", convert using the label's own serving-size definition). If the user gave no quantity, default to one serving as defined on the label.
- confidence: "high" when the label's numbers are clearly legible, "low" when the label is blurry or partially unreadable — still return your best-effort reading rather than zeros unless there is truly no nutrition information visible.`;

const EDIT_ITEMS_SYSTEM_PROMPT = `You maintain the list of ingredients for a meal a user is building in a calorie-tracking app. You'll be given the current items as JSON and a natural-language instruction (e.g. "change the white bread to sourdough", "make the chicken 250g", "remove the fries"). Return the FULL updated items array reflecting that instruction.

Guidelines:
- Apply the instruction to whichever item(s) it clearly refers to; leave every other item exactly as it was.
- If the instruction describes swapping one food for a different one, update description and the per-100g macro fields to match the new food — keep the same grams unless the instruction also changes the quantity.
- If the instruction asks to remove an item, omit it from the returned array.
- If the instruction describes adding a new ingredient, append it as a new item using the same per-100g/grams shape as the others.
- Every returned item must have: description, grams, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, confidence.`;

const MEAL_ITEM_SCHEMA_FIELDS = {
  description: { type: "string", description: "Concise name for this one item" },
  grams: { type: "integer", description: "Estimated portion weight in grams" },
  caloriesPer100g: { type: "integer", description: "kcal per 100g of this food" },
  proteinPer100g: { type: "integer", description: "Protein grams per 100g of this food" },
  carbsPer100g: { type: "integer", description: "Carbohydrate grams per 100g of this food" },
  fatPer100g: { type: "integer", description: "Fat grams per 100g of this food" },
  fiberPer100g: { type: "integer", description: "Dietary fiber grams per 100g of this food" },
  confidence: { type: "string", enum: ["low", "medium", "high"] },
} as const;

const MEAL_ITEM_SCHEMA_REQUIRED = [
  "description",
  "grams",
  "caloriesPer100g",
  "proteinPer100g",
  "carbsPer100g",
  "fatPer100g",
  "fiberPer100g",
  "confidence",
];

/** Enforced server-side via structured outputs. Mirrors MealItemDraft in ../types. */
const MEAL_ITEM_SCHEMA = {
  type: "object",
  properties: MEAL_ITEM_SCHEMA_FIELDS,
  required: MEAL_ITEM_SCHEMA_REQUIRED,
  additionalProperties: false,
} as const;

const MEAL_ITEMS_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: MEAL_ITEM_SCHEMA_FIELDS,
        required: MEAL_ITEM_SCHEMA_REQUIRED,
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

/**
 * Per-item meal-building domain logic: builds the prompt, calls the AI
 * provider, defensively parses whatever comes back. Depends only on
 * `AIProvider` — swapping `GeminiProvider` for a different implementation,
 * or a different vendor entirely, never touches this file.
 */
export class MealItemService {
  constructor(private readonly aiProvider: AIProvider) {}

  async analyzeItem(text: string): Promise<MealItemDraft> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("MealItemService.analyzeItem requires non-empty text.");
    }

    const response = await this.aiProvider.complete({
      system: TEXT_ITEM_SYSTEM_PROMPT,
      prompt: trimmed,
      jsonSchema: { ...MEAL_ITEM_SCHEMA },
    });

    return parseItemDraft(response.text, trimmed);
  }

  /**
   * `mode` picks the prompt: "food" identifies a dish/ingredient from the
   * photo itself; "label" reads a printed Nutrition Facts panel. `quantityHint`
   * is whatever the user typed alongside the photo (e.g. "150g", "150g from
   * this label") — used as the eaten quantity when present, otherwise the
   * model estimates it (food mode) or falls back to one label serving
   * (label mode).
   */
  async analyzeItemPhoto(
    image: AIImageInput,
    mode: "food" | "label",
    quantityHint?: string,
  ): Promise<MealItemDraft> {
    if (!image.data) {
      throw new Error("MealItemService.analyzeItemPhoto requires image data.");
    }

    const hint = quantityHint?.trim();
    const prompt =
      mode === "label"
        ? hint
          ? `Read this nutrition label. The user is eating: ${hint}. Report the per-100g macros and the grams for that quantity.`
          : "Read this nutrition label and report its per-100g macros. No quantity was given — default to one serving as defined on the label."
        : hint
          ? `Identify this food and report its per-100g macros. The user says the portion is: ${hint}.`
          : "Identify this food, estimate the portion size from the photo, and report its per-100g macros.";

    const response = await this.aiProvider.complete({
      system: mode === "label" ? PHOTO_LABEL_ITEM_SYSTEM_PROMPT : PHOTO_FOOD_ITEM_SYSTEM_PROMPT,
      prompt,
      image,
      jsonSchema: { ...MEAL_ITEM_SCHEMA },
    });

    return parseItemDraft(response.text, hint || "Item from photo");
  }

  /** Natural-language edit over the whole item list — see EDIT_ITEMS_SYSTEM_PROMPT. */
  async editItems(items: MealItemDraft[], instruction: string): Promise<MealItemDraft[]> {
    const trimmed = instruction.trim();
    if (!trimmed) {
      throw new Error("MealItemService.editItems requires a non-empty instruction.");
    }

    const response = await this.aiProvider.complete({
      system: EDIT_ITEMS_SYSTEM_PROMPT,
      prompt: `Current items:\n${JSON.stringify(items)}\n\nInstruction: "${trimmed}"`,
      jsonSchema: { ...MEAL_ITEMS_SCHEMA },
    });

    return parseItemsArray(response.text, items);
  }
}

/**
 * LLM output is text, not a guaranteed type — even asked nicely for JSON, a
 * real model can wrap it in prose, markdown fencing, or omit a field. This
 * never throws; malformed output degrades to a low-confidence placeholder
 * instead of failing the request.
 */
function parseItemDraft(rawText: string, fallbackDescription: string): MealItemDraft {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    return draftFromParsed(parsed, fallbackDescription);
  } catch {
    return emptyDraft(fallbackDescription);
  }
}

/** Same defensiveness as parseItemDraft, for the array-returning edit call. */
function parseItemsArray(rawText: string, fallback: MealItemDraft[]): MealItemDraft[] {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (items.length === 0) return fallback;
    return items.map((item: unknown) => draftFromParsed(item, "Item"));
  } catch {
    return fallback;
  }
}

function draftFromParsed(parsed: unknown, fallbackDescription: string): MealItemDraft {
  const value = (parsed ?? {}) as Record<string, unknown>;
  return {
    description:
      typeof value.description === "string" && value.description.trim()
        ? value.description
        : fallbackDescription,
    grams: toPositiveNumber(value.grams, 100),
    caloriesPer100g: toNonNegativeNumber(value.caloriesPer100g),
    proteinPer100g: toNonNegativeNumber(value.proteinPer100g),
    carbsPer100g: toNonNegativeNumber(value.carbsPer100g),
    fatPer100g: toNonNegativeNumber(value.fatPer100g),
    fiberPer100g: toNonNegativeNumber(value.fiberPer100g),
    confidence: toConfidence(value.confidence),
  };
}

function emptyDraft(fallbackDescription: string): MealItemDraft {
  return {
    description: fallbackDescription,
    grams: 100,
    caloriesPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    fiberPer100g: 0,
    confidence: "low",
  };
}

function toNonNegativeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : fallback;
}

function toConfidence(value: unknown): MealItemDraft["confidence"] {
  return value === "low" || value === "medium" || value === "high" ? value : "low";
}
