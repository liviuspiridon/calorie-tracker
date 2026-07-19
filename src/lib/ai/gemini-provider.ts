import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import type { AICompletionRequest, AICompletionResponse, AIProvider } from "./provider";

/**
 * The `-latest` alias tracks the current flash-lite generation. Deliberate:
 * Google gates sunset models for new API projects (gemini-2.5-flash already
 * 404s for this key), so a pinned id is the config most likely to break.
 * Lite tier because meal parsing is latency-sensitive — measured 1.6–9s on
 * the free tier vs up to 30s for full flash.
 */
const MODEL = "gemini-flash-lite-latest";

/**
 * Constructed lazily so a missing key fails the individual request (caught
 * by the calling flow's error path) instead of crashing the server at
 * module load. GEMINI_API_KEY is server-side only — see .env.example.
 */
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set — see .env.example.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Adapter for the Google Gemini API. When the request carries a jsonSchema,
 * the response is constrained server-side (`responseJsonSchema` — accepts
 * standard JSON Schema), so the returned text is guaranteed schema-valid
 * JSON — callers' defensive parsing remains as a backstop, not the primary
 * contract. Thinking is kept minimal: extraction doesn't need it, and on
 * the free tier it dominates latency.
 *
 * An `image` on the request becomes an inline-data part alongside the text,
 * which is how Gemini takes vision input — the same flash-lite model handles
 * it, so photo and text analysis share one code path and one model.
 */
export class GeminiProvider implements AIProvider {
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: request.image
        ? [
            { inlineData: { mimeType: request.image.mimeType, data: request.image.data } },
            { text: request.prompt },
          ]
        : request.prompt,
      config: {
        systemInstruction: request.system,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        ...(request.jsonSchema && {
          responseMimeType: "application/json",
          responseJsonSchema: request.jsonSchema,
        }),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return { text };
  }
}
