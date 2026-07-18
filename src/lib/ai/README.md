# lib/ai

Provider-agnostic AI layer. `AIProvider` (`provider.ts`) is the only
contract any feature depends on; `GeminiProvider` (`gemini-provider.ts`) is
the concrete adapter — Google Gemini via `@google/genai`, model
`gemini-flash-lite-latest` (free tier; the `-latest` alias survives
Google's model sunsets, thinking kept minimal since extraction doesn't need
it and it dominates free-tier latency).

Requests may carry a `jsonSchema`; `GeminiProvider` enforces it server-side
(`responseJsonSchema` accepts standard JSON Schema), so the returned text is
guaranteed schema-valid JSON. The schema concept lives in the vendor-neutral
contract — a different provider maps it to its own structured-output
mechanism (Claude: `output_config.format`; see git history for the previous
`ClaudeProvider` adapter).

Auth: `GEMINI_API_KEY` (see `.env.example`, server-side only). The client
is constructed lazily so a missing key fails the request — surfaced through
the calling flow's error state — rather than crashing the server at import.

Used today by `src/features/meal-logging` (`server/meal-analysis-service.ts`).
The planned AI coach will depend on the same `AIProvider` interface — that
sharing is the reason this lives here instead of inside meal-logging.
