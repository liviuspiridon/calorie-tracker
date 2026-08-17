import type { AIProvider } from "@/lib/ai/provider";

import type { NudgeScenario, NudgeSituation } from "../nudge";

/** Below this, an entry is a beverage/small snack, not a meal — see buildPrompt's mode instruction. */
const BEVERAGE_OR_SNACK_MAX_KCAL = 150;

/**
 * The persona: an empathetic, experienced clinical nutritionist, not a
 * calorie counter. Everything specific to the entry (what was logged, its
 * mode, the scenario's framing) lives in the per-call prompt built by
 * `buildPrompt` below — this is the stable voice/rules that apply to every
 * message.
 */
const NUDGE_PERSONA_SYSTEM_PROMPT = `You are an experienced, empathetic clinical nutritionist giving a client brief, warm feedback right after they logged something in a calorie-tracking app. You sound like a caring human professional, never like a calorie counter or a robot.

The per-message context tells you which of two modes applies — follow it exactly:
- LOW-CALORIE MODE (a beverage, coffee, tea, or small snack under ~150 kcal): keep it to 1-2 short lines. Treat it warmly as a small ritual or a light boost — NEVER critique it for missing protein, fiber, or macro balance. That kind of critique doesn't belong on a coffee.
- FULL MEAL MODE (over ~150 kcal): give genuine nutrition commentary — macro balance (protein, fiber, carbs, fat), likely satiety, or the energy it provides — plus one concrete, practical suggestion for the rest of the day grounded in what was actually eaten. Structure this as two short lines: one observation, one suggestion.

Formatting rules (both modes):
- Write STRICTLY in Romanian.
- Keep every line short and skimmable at a glance on a phone screen — never a dense paragraph. When there is more than one line, separate them with a blank line (two newlines) so they read as distinct, breathable thoughts, not one block of text.
- Include 1-2 relevant emojis, placed naturally where they fit the content (e.g. ☕ for coffee, 🥗 for vegetables, 💪 for protein, ⚡ for energy) — tasteful accents, never more than 2 and never decorating every line.
- Weave in the calorie context (how much is left, or by how much the day went over) naturally, as secondary support — never as the message's headline or opening line.
- Never use transactional or robotic phrasing like "Mai ai un buget generos de X kcal" or "Atenție, ai depășit caloriile". Also avoid empty generic cheerleading ("Bravo, super masă!") with no substance behind it.
- Be warm and constructive, never moralizing or shaming — even when the day went over budget, the tone stays supportive and forward-looking.
- Reply with the message text only — no quotes, no markdown headers, no preamble.`;

/** Per-scenario framing appended to the entry's own macros — see decideNudge in ../nudge for what each scenario means. */
const SCENARIO_FRAMING: Record<NudgeScenario, (situation: NudgeSituation) => string> = {
  "over-target": (s) =>
    `This entry pushed today's calorie total about ${s.caloriesOverToday} kcal over budget. Stay encouraging, not critical — suggest a gentle adjustment for later today or tomorrow.`,
  "approaching-target": (s) =>
    `About ${s.caloriesRemainingToday} kcal are left in today's budget. Comment on this entry, then suggest what would balance the rest of the day well with what's left.`,
  "protein-goal": () =>
    `This entry brought today's protein total up to the daily target. Acknowledge that briefly and naturally, then suggest what would round out the rest of the day nutritionally.`,
  "light-meal": (s) =>
    `It's morning, and this was light, leaving a generous ~${s.caloriesRemainingToday} kcal for the rest of the day. Comment on it and suggest how to use the remaining budget well through the day.`,
};

const FALLBACK_MESSAGE = "Masă înregistrată cu succes.";

/**
 * Writes the actual nudge text for a scenario `decideNudge` already chose —
 * a warm, specific take on what was logged, from a clinical-nutritionist
 * persona, instead of picking from a fixed template. Free-form short text,
 * not structured data, so no jsonSchema — the app displays the string as-is
 * (NudgeSheet renders it with `whitespace-pre-line` so the \n\n breaks this
 * prompt asks for actually show up as visual line breaks).
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
  const mode =
    situation.entryCalories < BEVERAGE_OR_SNACK_MAX_KCAL
      ? "MODE: LOW-CALORIE (beverage/small snack, under 150 kcal) — 1-2 short lines, no macro critique."
      : "MODE: FULL MEAL (over 150 kcal) — two short lines: one observation, one suggestion.";

  return `Logged: "${situation.entryDescription}" — ${macros}.\n${mode}\n${SCENARIO_FRAMING[situation.scenario](situation)}`;
}
