"use server";

import { GeminiProvider } from "@/lib/ai/gemini-provider";

import type { NudgeSituation } from "./nudge";
import { NudgeMessageService } from "./server/nudge-message-service";

const nudgeMessageService = new NudgeMessageService(new GeminiProvider());

/**
 * The client calls this once `decideNudge` has already chosen a scenario
 * (see nudge.ts) — this only writes the message text. Same boundary
 * reasoning as meal-logging/actions.ts: GEMINI_API_KEY never reaches the
 * client.
 */
export async function generateNudgeMessage(situation: NudgeSituation): Promise<string> {
  return nudgeMessageService.generateMessage(situation);
}
