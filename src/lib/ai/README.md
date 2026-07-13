# lib/ai

Provider-agnostic AI layer. `AIProvider` (`provider.ts`) is the only
contract any feature depends on; `ClaudeProvider` (`claude-provider.ts`) is
the concrete adapter — currently a stub that fabricates responses instead of
calling the real Anthropic API.

Used today by `src/features/meal-logging` (`server/meal-analysis-service.ts`).
The planned AI coach will depend on the same `AIProvider` interface — that
sharing is the reason this lives here instead of inside meal-logging.

Wiring up the real API: construct an Anthropic client from `AI_API_KEY`
(`src/lib/env.ts`, server-side only) inside `ClaudeProvider.complete()`.
Nothing outside that one file changes.
