import { extractJson } from "@/lib/ai/extract-json";
import type { AIImageInput, AIProvider } from "@/lib/ai/provider";

import type {
  HistoryMeal,
  MealItemDraft,
  MealTurnResult,
  ReconciliationResult,
  ReconciliationSuggestion,
  TurnContext,
} from "../types";

const PER_100G_GUIDELINE = `- grams: your best estimate of the total weight in grams of the portion described/shown.
- unit: "ml" when the item is a liquid you'd naturally measure by volume (milk, water, coffee, juice, oil, sauces, etc.), "g" for solids. This only changes how the amount is displayed — \`grams\` is always the same number either way (1ml treated as 1g).
- caloriesPer100g/proteinPer100g/carbsPer100g/fatPer100g/fiberPer100g: this food's nutrition density per 100g — a stable reference fact about the food itself, NOT the total for the described portion. The app multiplies by grams/100 to get the total, so get the per-100g rate right; don't pre-multiply by the portion size yourself.`;

/**
 * Without this, "coffee with 100ml milk" got extracted as one blended item
 * (e.g. "Coffee with milk", 200g, 48kcal) — a per-100g rate diluted across
 * the whole cup. That rate is meaningless once the weight slider touches
 * it: scaling to 600g assumes 600g of *that diluted mixture*, tripling
 * both the (near-zero-calorie) coffee and the milk together, wildly
 * inflating calories for what the user meant as "more milk". The fix is to
 * never let the item's grams include a zero-calorie liquid's volume at
 * all — the item is just the calorie-bearing part, at its own real
 * density, so the slider only ever scales something that actually should
 * scale linearly with calories.
 */
const ZERO_CALORIE_BASE_GUIDELINE = `- Zero- or negligible-calorie liquids (water, black coffee, espresso, unsweetened tea, diet soda, etc.) never get an item of their own, and must never be blended into another item's weight or macros. If the description mixes one of these with a calorie-bearing ingredient — e.g. "coffee with 100ml milk", "tea with a spoon of honey" — return ONLY the calorie-bearing ingredient as the item: its own real per-100g nutrition density and its own actual quantity as grams. Example: "coffee with 100ml milk" -> description "Lapte 1.5%" (or similar, named after the ingredient itself, not the drink), grams: 100, using milk's real per-100g values (not diluted across the coffee's volume). Never combine the two into one blended item, and never let the zero-calorie liquid's volume inflate the item's grams.`;

/**
 * Shared across all three turn prompts (text/photo-food/photo-label): when
 * to ask instead of guess, and what the conversational `message` should
 * say either way. A turn is one exchange in the building-step conversation
 * — see MealBuilderSheet's `messages`/`pendingClarification` state.
 */
const TURN_GUIDELINE = `- If this input is genuinely too ambiguous to give a reasonable estimate (the food itself is unclear, or there's no quantity and no sensible typical default applies), set status to "clarify", ask ONE short specific question in \`message\`, and omit \`item\` entirely. Reserve this for real ambiguity — when a sensible default exists (e.g. "2 eggs" -> typical egg size, "a slice of bread" -> typical slice), resolve it with your best estimate and reflect the uncertainty in \`confidence\` instead of asking. Most turns should resolve without asking.
- Once resolved (whether on the first try or after the user answered a clarifying question), set status to "resolved", fill in \`item\`, and write \`message\` as a brief confirmation of what was added (its name and calories) followed by asking whether to add another ingredient or finish the meal.
- If a previous exchange is given below, it's this same ingredient still being resolved — use all of it as context, don't treat the latest reply as a brand new unrelated ingredient.`;

/**
 * Appended when the caller has hit MAX_CLARIFY_ROUNDS (see
 * MealBuilderSheet) — the conversation has already asked enough questions
 * about this one ingredient without fully resolving it, so no more are
 * allowed. `parseTurnResult` also hard-enforces this: if the model ignores
 * the instruction and returns "clarify" anyway, the caller coerces it to a
 * low-confidence resolved item rather than letting the round cap be a
 * suggestion instead of a guarantee.
 */
const FORCE_RESOLVE_GUIDELINE = `- IMPORTANT: This ingredient has already been through multiple rounds of clarification without fully resolving. Do NOT ask another question. Set status to "resolved" now, using your best-effort guess for whatever is still uncertain, and set confidence to "low" to reflect that. In \`message\`, briefly say this is a rough estimate the user can edit.`;

/**
 * Appended only when the caller attaches recent-history context (see
 * reference-history.ts's looksLikeReference — a cheap client-side gate, so
 * this never runs on the common case of a fresh description). Recent
 * meals are given below as JSON, grouped by meal: each has a date, a local
 * time (the only available proxy for "breakfast" vs "dinner" — there's no
 * stored meal-type category), and its items.
 */
const REFERENCE_GUIDELINE = `- The user may be referencing a previously-logged ingredient instead of describing a fresh one (e.g. "like yesterday", "the usual hummus", "same as Friday's dinner"). Recent meals are given below as JSON for exactly this. If the input doesn't actually reference past food, ignore this entirely and proceed normally.
- Match semantically, not by exact text — "humus", "hummus", and "pastă de năut" are the same food. Prefer more recent occurrences as a tie-breaker when several equally plausible matches exist for a vague/frequent reference (e.g. "the usual").
- An explicit date/day reference ("like yesterday", "like Friday's dinner"): look only at that date's meal(s). Exactly one meal that date with one plausible matching item -> resolved directly. More than one meal that date -> "clarify", distinguishing them by their time (e.g. "the morning one or the evening one?"). When naming the date in \`message\`, use the literal date (e.g. "on the 20th") rather than re-deriving a relative day-word like "yesterday"/"the day before yesterday" — you're given today's date and the meal's date as two separate facts, and restating one as a word phrased relative to the other is an easy place to get the direction backwards.
- A vague/frequent reference ("the usual X", "same as always"): search the whole window. One dominant, unambiguous match (or several occurrences that all share the same values) -> resolved directly, even if it occurred more than once — repetition of the SAME item is confirmation, not ambiguity, and must never by itself trigger "clarify". Only genuinely distinct items — different \`description\` strings in the data, or the same one logged with different grams/macros — count as separate options. Multiple such distinct plausible matches -> "clarify", naming only options that literally appear in the given history (their real \`description\` values) — never invent variants, flavors, or types that aren't present in the data.
- When resolving from a match: copy grams, unit, and all four per-100g macro fields VERBATIM from the matched history item — this is reuse, not re-estimation, so don't recompute or round them differently. If the user's input also gives an explicit adjustment (e.g. "like yesterday but 2 slices"), apply it to grams only; the per-100g rates stay identical. Set confidence to the SAME value the matched history item had — reusing a rough guess doesn't make it more certain. Set source to "repeated". In \`message\`, name what was reused (e.g. "same as yesterday", "same as your usual").
- If nothing in the given history plausibly matches, don't force it — proceed exactly as if no history had been given, estimating fresh with source "estimated".`;

const TEXT_TURN_SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app, having a short back-and-forth with the user as they build a meal one ingredient at a time. They just described ONE ingredient in their own words (e.g. "300g tomatoes", "2 eggs", "a slice of sourdough").

Guidelines:
- description: a concise, cleaned-up name for this one item.
${PER_100G_GUIDELINE}
${ZERO_CALORIE_BASE_GUIDELINE}
- Use typical reference weights when the quantity is given by count ("2 eggs") rather than weight.
- confidence: "high" when the food and quantity are specific and typical, "medium" when the quantity had to be assumed, "low" when the food itself is ambiguous.
- Always set source to "estimated".
${TURN_GUIDELINE}`;

const PHOTO_FOOD_TURN_SYSTEM_PROMPT = `You are a nutrition analyst for a personal calorie-tracking app, having a short back-and-forth with the user as they build a meal one ingredient at a time. They just attached a photo of ONE food item (not a nutrition label — the food or dish itself).

Guidelines:
- description: a concise name for what's shown, e.g. "Grilled chicken breast".
${PER_100G_GUIDELINE}
${ZERO_CALORIE_BASE_GUIDELINE}
- Estimate the portion size from visual cues (plate/utensil scale, container volume, height of the pile) unless the user gave you a quantity to use instead.
- confidence: "high" when the food and portion are clearly readable, "medium" when the portion had to be assumed, "low" when the photo is unclear or may not be food at all.
- Always set source to "estimated".
${TURN_GUIDELINE}`;

const PHOTO_LABEL_TURN_SYSTEM_PROMPT = `You are reading a Nutrition Facts / nutrition label photo for a personal calorie-tracking app, as the user builds a meal one ingredient at a time. The printed values are exact facts, not estimates — read them precisely.

Guidelines:
- description: the product name if visible on the label/packaging, otherwise a generic description of the product.
${PER_100G_GUIDELINE}
- Read caloriesPer100g etc. directly from the label's "per 100g" row if present. If the label only gives a "per serving" row, divide those values by the serving size in grams to get the per-100g rate.
- grams: the quantity the user says they're eating (parse it to a number of grams — if they gave a non-gram quantity like "a serving" or "2 slices", convert using the label's own serving-size definition). If the user gave no quantity, default to one serving as defined on the label.
- confidence: "high" when the label's numbers are clearly legible, "low" when the label is blurry or partially unreadable — still return your best-effort reading rather than zeros unless there is truly no nutrition information visible.
- Always set source to "label".
${TURN_GUIDELINE}`;

const EDIT_ITEMS_SYSTEM_PROMPT = `You maintain the list of ingredients for a meal a user is building in a calorie-tracking app. You'll be given the current items as JSON and a natural-language instruction (e.g. "change the white bread to sourdough", "make the chicken 250g", "remove the fries"). Return the FULL updated items array reflecting that instruction.

Guidelines:
- Apply the instruction to whichever item(s) it clearly refers to; leave every other item exactly as it was.
- If the instruction describes swapping one food for a different one, update description and the per-100g macro fields to match the new food — keep the same grams unless the instruction also changes the quantity. Reset source to "estimated" for the new food unless the instruction says otherwise.
- If the instruction asks to remove an item, omit it from the returned array.
- If the instruction describes adding a new ingredient, append it as a new item using the same per-100g/grams shape as the others, with source "estimated".
${ZERO_CALORIE_BASE_GUIDELINE}
- unit is "ml" for liquids, "g" for solids — keep an item's existing unit unless the instruction changes what the food is, in which case set unit to match the new food.
- Every returned item must have: description, grams, unit, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, confidence, source.`;

const RECONCILE_SYSTEM_PROMPT = `You are checking a logged meal against a photo of the actual plate, for a personal calorie-tracking app. You'll be given the currently logged items as a JSON array (in order) and a photo of the plate. Compare what's visibly on the plate to what's logged, and flag any clear discrepancies in quantity or count — e.g. 3 eggs logged but only 2 visible, or a portion that looks noticeably smaller/larger than the logged weight suggests.

Guidelines:
- Only flag discrepancies you can actually see evidence for in the photo — err toward NOT flagging when the photo is ambiguous, poorly lit, or the item isn't clearly identifiable on the plate. These are proposals a human reviews individually, not corrections that get auto-applied, but a wrong or overconfident suggestion is worse than no suggestion.
- For each discrepancy, reference the item by its position in the given array (targetIndex, 0-based) — never by name alone, since two logged items can share a description.
- suggestedGrams is your best estimate of what the actual weight should be based on the photo, not just a token adjustment.
- issue is a short, specific, non-judgmental explanation a user will read, e.g. "Only 2 eggs visible on the plate, but 3 are logged."
- message is a one-sentence overall summary, e.g. "Found 1 possible mismatch." or "Everything on the plate matches what's logged." — write it even when suggestions is empty.
- If nothing looks off, return an empty suggestions array — do not invent a discrepancy to have something to say.`;

const MEAL_ITEM_SCHEMA_FIELDS = {
  description: { type: "string", description: "Concise name for this one item" },
  grams: { type: "integer", description: "Estimated portion weight in grams" },
  unit: {
    type: "string",
    enum: ["g", "ml"],
    description: "Display unit — \"ml\" for liquids, \"g\" for solids. Doesn't change the `grams` number.",
  },
  caloriesPer100g: { type: "integer", description: "kcal per 100g of this food" },
  proteinPer100g: { type: "integer", description: "Protein grams per 100g of this food" },
  carbsPer100g: { type: "integer", description: "Carbohydrate grams per 100g of this food" },
  fatPer100g: { type: "integer", description: "Fat grams per 100g of this food" },
  fiberPer100g: { type: "integer", description: "Dietary fiber grams per 100g of this food" },
  confidence: { type: "string", enum: ["low", "medium", "high"] },
  source: {
    type: "string",
    enum: ["label", "estimated", "repeated"],
    description:
      "\"label\" when read from a nutrition label photo, \"repeated\" when copied from a past logging via reference matching, \"estimated\" otherwise.",
  },
} as const;

const MEAL_ITEM_SCHEMA_REQUIRED = [
  "description",
  "grams",
  "unit",
  "caloriesPer100g",
  "proteinPer100g",
  "carbsPer100g",
  "fatPer100g",
  "fiberPer100g",
  "confidence",
  "source",
];

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
 * `item` is deliberately NOT in `required` — a "clarify" turn omits it
 * entirely. Structured-output support for conditional/oneOf schemas is
 * inconsistent across providers, so the status/item relationship is
 * enforced by `parseTurnResult` below, not by the schema itself; the schema
 * is a backstop here, same as everywhere else in this file.
 */
const MEAL_TURN_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["resolved", "clarify"] },
    message: {
      type: "string",
      description: "Conversational reply shown to the user — a confirmation + prompt to continue/finish, or a clarifying question.",
    },
    item: {
      type: "object",
      properties: MEAL_ITEM_SCHEMA_FIELDS,
      required: MEAL_ITEM_SCHEMA_REQUIRED,
      additionalProperties: false,
    },
  },
  required: ["status", "message"],
  additionalProperties: false,
} as const;

const RECONCILE_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          targetIndex: { type: "integer", description: "0-based index into the given items array" },
          issue: { type: "string" },
          suggestedGrams: { type: "integer" },
        },
        required: ["targetIndex", "issue", "suggestedGrams"],
        additionalProperties: false,
      },
    },
  },
  required: ["message", "suggestions"],
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

  /**
   * One turn of the building-step conversation: resolves one ingredient
   * from text and/or a photo, or asks a clarifying question instead when
   * the input is genuinely too ambiguous to default — see TURN_GUIDELINE.
   * `context` is passed when this call answers an earlier "clarify"
   * response, so the model sees the full thread for this one ingredient.
   */
  async resolveTurn(input: {
    text?: string;
    image?: AIImageInput;
    mode?: "food" | "label";
    context?: TurnContext;
    /** Set once MAX_CLARIFY_ROUNDS is hit — forbids another "clarify" and hard-coerces one if it happens anyway. */
    forceResolve?: boolean;
    /** Recent meals for reference matching ("like yesterday", "the usual X") — see reference-history.ts. Only ever attached when looksLikeReference fires client-side, so the common fresh-description turn never pays this cost. */
    history?: HistoryMeal[];
    /** Client's local YYYY-MM-DD "today" — the only anchor the model has for relative words like "yesterday"; without it, "date" values in `history` are just floating strings it has to guess an origin for. Required whenever `history` is given. */
    historyDate?: string;
  }): Promise<MealTurnResult> {
    const trimmed = input.text?.trim();
    if (!trimmed && !input.image) {
      throw new Error("MealItemService.resolveTurn requires text or an image.");
    }

    const baseSystem = input.image
      ? input.mode === "label"
        ? PHOTO_LABEL_TURN_SYSTEM_PROMPT
        : PHOTO_FOOD_TURN_SYSTEM_PROMPT
      : TEXT_TURN_SYSTEM_PROMPT;
    const system = [baseSystem, input.forceResolve && FORCE_RESOLVE_GUIDELINE, input.history?.length && REFERENCE_GUIDELINE]
      .filter(Boolean)
      .join("\n");
    const promptMode = input.image ? (input.mode === "label" ? "photo-label" : "photo-food") : "text";

    const response = await this.aiProvider.complete({
      system,
      prompt: buildTurnPrompt(promptMode, trimmed, input.context, input.history, input.historyDate),
      image: input.image,
      jsonSchema: { ...MEAL_TURN_SCHEMA },
    });

    const result = parseTurnResult(response.text, trimmed || "Item");
    if (input.forceResolve && result.status === "clarify") {
      // The model didn't comply — the round cap must be a guarantee, not a suggestion.
      return {
        status: "resolved",
        message: "Couldn't fully pin this down after a few tries, so I've logged a rough estimate — feel free to edit it.",
        item: emptyDraft(trimmed || "Item"),
      };
    }
    return result;
  }

  /** Natural-language edit across the whole item list — see EDIT_ITEMS_SYSTEM_PROMPT. */
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

  /**
   * Compares the logged items against a photo of the plate — proposals
   * only, never auto-applied (see RECONCILE_SYSTEM_PROMPT). Items are sent
   * stripped to description/grams/unit; the model references them back by
   * array index (see ReconciliationSuggestion).
   */
  async reconcileWithPhoto(items: MealItemDraft[], image: AIImageInput): Promise<ReconciliationResult> {
    if (items.length === 0) {
      throw new Error("MealItemService.reconcileWithPhoto requires at least one existing item.");
    }
    if (!image.data) {
      throw new Error("MealItemService.reconcileWithPhoto requires image data.");
    }

    const itemsForPrompt = items.map(({ description, grams, unit }) => ({
      description,
      grams,
      unit: unit ?? "g",
    }));

    const response = await this.aiProvider.complete({
      system: RECONCILE_SYSTEM_PROMPT,
      prompt: `Logged items:\n${JSON.stringify(itemsForPrompt)}`,
      image,
      jsonSchema: { ...RECONCILE_SCHEMA },
    });

    return parseReconciliation(response.text, items.length);
  }
}

/**
 * No prior context: preserves the exact prompt phrasing the single-shot
 * flow used. With context, renders the full exchange for this same
 * ingredient — the caller's `context.exchange` already includes the just-
 * submitted answer as its final entry, so `text` isn't re-rendered here
 * (it would otherwise appear twice). `history`, when given, is appended
 * regardless of context/mode — reference matching can apply to a fresh
 * turn or a clarify continuation alike.
 */
function buildTurnPrompt(
  mode: "text" | "photo-food" | "photo-label",
  text: string | undefined,
  context: TurnContext | undefined,
  history: HistoryMeal[] | undefined,
  historyDate: string | undefined,
): string {
  const base = buildBaseTurnPrompt(mode, text, context);
  if (!history?.length) return base;
  return `${base}\n\nToday's date is ${historyDate} (YYYY-MM-DD) — use it to resolve relative dates below.\nRecent meals (for reference matching):\n${JSON.stringify(history)}`;
}

function buildBaseTurnPrompt(
  mode: "text" | "photo-food" | "photo-label",
  text: string | undefined,
  context: TurnContext | undefined,
): string {
  if (context) {
    const lines: string[] = [];
    if (context.originalText) lines.push(`Original input: "${context.originalText}"`);
    for (const { question, answer } of context.exchange) {
      lines.push(`You asked: "${question}"`);
      lines.push(`User answered: "${answer}"`);
    }
    lines.push("", "This is the same ingredient as above, still being resolved — use all of the exchange as context.");
    return lines.join("\n");
  }

  if (mode === "text") return text ?? "";

  if (mode === "photo-label") {
    return text
      ? `Read this nutrition label. The user is eating: ${text}. Report the per-100g macros and the grams for that quantity.`
      : "Read this nutrition label and report its per-100g macros. No quantity was given — default to one serving as defined on the label.";
  }

  return text
    ? `Identify this food and report its per-100g macros. The user says the portion is: ${text}.`
    : "Identify this food, estimate the portion size from the photo, and report its per-100g macros.";
}

/**
 * LLM output is text, not a guaranteed type — even asked nicely for JSON, a
 * real model can wrap it in prose, markdown fencing, or omit a field. This
 * never throws; malformed output degrades to a resolved, low-confidence
 * placeholder rather than leaving the conversation stuck unable to
 * progress on a "clarify" it can't recover from.
 */
function parseTurnResult(rawText: string, fallbackDescription: string): MealTurnResult {
  try {
    const parsed = JSON.parse(extractJson(rawText)) as Record<string, unknown>;
    if (parsed.status === "clarify" && typeof parsed.message === "string" && parsed.message.trim()) {
      return { status: "clarify", message: parsed.message };
    }
    const message = typeof parsed.message === "string" && parsed.message.trim() ? parsed.message : "Added.";
    return { status: "resolved", message, item: draftFromParsed(parsed.item, fallbackDescription) };
  } catch {
    return { status: "resolved", message: "Added.", item: emptyDraft(fallbackDescription) };
  }
}

/** Same defensiveness as parseTurnResult, for the array-returning edit call. */
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

/** Malformed/out-of-range suggestions are dropped rather than surfaced — see RECONCILE_SYSTEM_PROMPT's "wrong is worse than none". */
function parseReconciliation(rawText: string, itemCount: number): ReconciliationResult {
  try {
    const parsed = JSON.parse(extractJson(rawText)) as Record<string, unknown>;
    const message = typeof parsed.message === "string" ? parsed.message : "";
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = rawSuggestions
      .map(suggestionFromParsed)
      .filter((s): s is ReconciliationSuggestion => s !== null && s.targetIndex >= 0 && s.targetIndex < itemCount);
    return { message, suggestions };
  } catch {
    return { message: "", suggestions: [] };
  }
}

function suggestionFromParsed(parsed: unknown): ReconciliationSuggestion | null {
  const value = (parsed ?? {}) as Record<string, unknown>;
  const targetIndex = Number(value.targetIndex);
  const suggestedGrams = Number(value.suggestedGrams);
  if (!Number.isInteger(targetIndex) || !Number.isFinite(suggestedGrams) || suggestedGrams <= 0) return null;
  if (typeof value.issue !== "string" || !value.issue.trim()) return null;
  return { targetIndex, issue: value.issue, suggestedGrams: Math.round(suggestedGrams) };
}

function draftFromParsed(parsed: unknown, fallbackDescription: string): MealItemDraft {
  const value = (parsed ?? {}) as Record<string, unknown>;
  return {
    description:
      typeof value.description === "string" && value.description.trim()
        ? value.description
        : fallbackDescription,
    grams: toPositiveNumber(value.grams, 100),
    unit: toUnit(value.unit),
    caloriesPer100g: toNonNegativeNumber(value.caloriesPer100g),
    proteinPer100g: toNonNegativeNumber(value.proteinPer100g),
    carbsPer100g: toNonNegativeNumber(value.carbsPer100g),
    fatPer100g: toNonNegativeNumber(value.fatPer100g),
    fiberPer100g: toNonNegativeNumber(value.fiberPer100g),
    confidence: toConfidence(value.confidence),
    source: toSource(value.source),
  };
}

function emptyDraft(fallbackDescription: string): MealItemDraft {
  return {
    description: fallbackDescription,
    grams: 100,
    unit: "g",
    caloriesPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    fiberPer100g: 0,
    confidence: "low",
    source: "estimated",
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

function toUnit(value: unknown): MealItemDraft["unit"] {
  return value === "ml" ? "ml" : "g";
}

function toSource(value: unknown): MealItemDraft["source"] {
  return value === "label" || value === "repeated" ? value : "estimated";
}
