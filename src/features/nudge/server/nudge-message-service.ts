import type { AIProvider } from "@/lib/ai/provider";

import type { NudgeScenario, NudgeSituation } from "../nudge";

/**
 * The persona: an empathetic, experienced clinical nutritionist, not a
 * calorie counter. Everything specific to the meal (what was eaten, the
 * scenario's framing) lives in the per-call prompt built by `buildPrompt`
 * below — this is the stable voice/rules that apply to every message.
 */
const NUDGE_PERSONA_SYSTEM_PROMPT = `You are an experienced, empathetic clinical nutritionist giving a client brief, warm feedback right after they logged a meal in a calorie-tracking app. You sound like a caring human professional, never like a calorie counter or a robot.

Rules:
- Write STRICTLY in Romanian.
- Maximum 2-3 sentences — it must fit comfortably in a small bottom sheet with no scrolling.
- Comment on the meal's quality: macro balance (protein, fiber, carbs, fat), likely satiety, or the energy it provides — not just calories.
- Give one concrete, practical suggestion for the rest of the day, grounded in what was actually eaten (e.g. if the meal was carb-heavy, suggest leaning on lean protein and green vegetables at the next meal).
- Weave in the calorie context (how much is left, or by how much the day went over) naturally, as secondary support — never as the message's headline or opening line.
- Never use transactional or robotic phrasing like "Mai ai un buget generos de X kcal" or "Atenție, ai depășit caloriile". Also avoid empty generic cheerleading ("Bravo, super masă!") with no substance behind it.
- Be warm and constructive, never moralizing or shaming — even when the day went over budget, the tone stays supportive and forward-looking.
- Reply with the message text only — no quotes, no markdown, no preamble.`;

/** Per-scenario framing appended to the meal's own macros — see decideNudge in ../nudge for what each scenario means. */
const SCENARIO_FRAMING: Record<NudgeScenario, (situation: NudgeSituation) => string> = {
  "over-target": (s) =>
    `This entry pushed today's calorie total about ${s.caloriesOverToday} kcal over budget. Stay encouraging, not critical — suggest a gentle adjustment for later today or tomorrow.`,
  "approaching-target": (s) =>
    `About ${s.caloriesRemainingToday} kcal are left in today's budget. Comment on this meal, then suggest what kind of dinner/snack would balance the day well with what's left.`,
  "protein-goal": () =>
    `This entry brought today's protein total up to the daily target. Acknowledge that briefly and naturally, then suggest what would round out the rest of the day nutritionally.`,
  "light-meal": (s) =>
    `It's morning, and this was a light meal, leaving a generous ~${s.caloriesRemainingToday} kcal for the rest of the day. Comment on the meal's quality and suggest how to use the remaining budget well through the day.`,
};

const FALLBACK_MESSAGE = "Masă înregistrată cu succes.";

/**
 * Writes the actual nudge text for a scenario `decideNudge` already chose —
 * a warm, specific take on what was eaten, from a clinical-nutritionist
 * persona, instead of picking from a fixed template. Free-form short text,
 * not structured data, so no jsonSchema — the app displays the string as-is.
 */
export class NudgeMessageService {
  constructor(private readonly aiProvider: AIProvider) {}

  async generateMessage(situation: NudgeSituation): Promise<string> {
    const response = await this.aiProvider.complete({
      system: NUDGE_PERSONA_SYSTEM_PROMPT,
      prompt: buildPrompt(situation),
    });

    const trimmed = response.text.trim();
    return trimmed || FALLBACK_MESSAGE;
  }
}

function buildPrompt(situation: NudgeSituation): string {
  const macros = `${situation.entryCalories} kcal, ${situation.entryProtein}g protein, ${situation.entryCarbs}g carbs, ${situation.entryFat}g fat, ${situation.entryFiber}g fiber`;
  return `Logged meal: "${situation.entryDescription}" — ${macros}.\n${SCENARIO_FRAMING[situation.scenario](situation)}`;
}
