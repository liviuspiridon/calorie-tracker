export interface AICompletionRequest {
  /** Sets the model's role/behavior — separate from the user-facing prompt. */
  system?: string;
  prompt: string;
  /**
   * JSON Schema the response text must conform to. Providers with
   * structured-output support enforce it server-side (Gemini via
   * `responseJsonSchema`, Claude via `output_config.format`); the concept
   * itself is provider-portable, so this stays in the vendor-neutral
   * contract.
   */
  jsonSchema?: Record<string, unknown>;
}

export interface AICompletionResponse {
  text: string;
}

/**
 * Provider-agnostic contract for a text-completion call. Any feature that
 * needs an LLM (meal analysis today, the AI coach later) depends on this,
 * never on a specific vendor SDK — that's what makes swapping or adding
 * providers a change in one file instead of a rewrite.
 */
export interface AIProvider {
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
}
