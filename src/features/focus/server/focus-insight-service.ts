import { extractJson } from "@/lib/ai/extract-json";
import type { AIProvider } from "@/lib/ai/provider";

import type { FocusInsight, FocusInsightRequest, FocusMealInput } from "../types";

const SYSTEM_PROMPT = `You are the quiet, perceptive voice inside a personal nutrition journal called Balance. After someone logs something they ate or drank, you offer a brief private reflection on it — never advice from an app, more like a moment of calm perspective from someone who has been paying quiet attention all day.

Voice and tone: minimalist, warm, premium journaling. Plain, unhurried sentences a thoughtful person would actually write to themselves. Never use emojis. Never use bullet points, numbered lists, or headings — only flowing prose in complete sentences. Avoid clinical or dashboard-like language; numbers can appear naturally in a sentence, but don't just restate the day's stats back.

Respond with exactly three parts:
- mirror: contextual analysis, 1-2 sentences — what this entry means against today so far (pace, balance, timing), stated plainly and without judgment.
- guidance: actionable next steps, 1-2 sentences — grounded in the actual time of day given and what's realistically left of it, not generic advice.
- mindset: exactly one sentence — the emotional takeaway. Quiet and grounding, never preachy, never falsely cheerful.

Keep every part short. Never invent data you weren't given, and never mention that you are an AI or that this is generated.`;

/** Enforced server-side via structured outputs. */
const FOCUS_INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    mirror: {
      type: "string",
      description: "1-2 sentence contextual reflection on this entry within today so far",
    },
    guidance: {
      type: "string",
      description:
        "1-2 sentence actionable suggestion for the rest of the day, grounded in the given time of day",
    },
    mindset: { type: "string", description: "Exactly one sentence — the emotional takeaway" },
  },
  required: ["mirror", "guidance", "mindset"],
  additionalProperties: false,
} as const;

/**
 * Generates the post-log reflection ("Focus Insight"): a three-part warm,
 * journal-toned reaction to what was just logged, in the context of the
 * whole day so far. Depends only on AIProvider, same as MealAnalysisService
 * — same Gemini adapter, a second, unrelated prompt.
 */
export class FocusInsightService {
  constructor(private readonly aiProvider: AIProvider) {}

  async generateInsight(input: FocusInsightRequest): Promise<FocusInsight> {
    const response = await this.aiProvider.complete({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(input),
      jsonSchema: { ...FOCUS_INSIGHT_SCHEMA },
    });

    return parseInsight(response.text);
  }
}

function buildPrompt(input: FocusInsightRequest): string {
  const remaining = input.calorieTarget - input.caloriesConsumed;
  const budgetLine =
    remaining >= 0
      ? `${remaining} kcal of headroom left today`
      : `${Math.abs(remaining)} kcal over today's target`;

  const mealLines = input.meals.map((meal) => `- ${describeMeal(meal)}`).join("\n");

  return [
    `It is currently ${describeTimeOfDay(input.localHour)}, local time.`,
    `Just logged: ${describeMeal(input.newItem)}.`,
    `Today's totals so far: ${input.caloriesConsumed} kcal consumed against a ${input.calorieTarget} kcal target (${budgetLine}).`,
    input.meals.length > 0
      ? `Everything logged today:\n${mealLines}`
      : "This is the first thing logged today.",
  ].join("\n\n");
}

function describeMeal(meal: FocusMealInput): string {
  return `"${meal.description}" — ${meal.calories} kcal, ${meal.protein}g protein, ${meal.carbs}g carbs, ${meal.fat}g fat`;
}

function describeTimeOfDay(hour: number): string {
  if (hour < 5) return "late night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/**
 * LLM output is text, not a guaranteed type. Unlike MealAnalysisService's
 * parser, this one throws on anything short of three real sentences rather
 * than degrading to a fallback — an empty reflection would render as blank
 * paragraphs (visibly broken), whereas the caller can show a clean "couldn't
 * reflect right now" state instead.
 */
function parseInsight(rawText: string): FocusInsight {
  const parsed = JSON.parse(extractJson(rawText));
  const mirror = typeof parsed.mirror === "string" ? parsed.mirror.trim() : "";
  const guidance = typeof parsed.guidance === "string" ? parsed.guidance.trim() : "";
  const mindset = typeof parsed.mindset === "string" ? parsed.mindset.trim() : "";

  if (!mirror || !guidance || !mindset) {
    throw new Error("Focus insight response was missing one or more sections.");
  }

  return { mirror, guidance, mindset };
}
