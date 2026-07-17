# feature: meal-logging

AI-assisted meal logging: describe a meal (or, later, snap a photo), get
structured nutrition data back, review it, adjust it, save it.

Status: **the full flow is live**, layered the way it'll ship:

```
LogMealSheet (client)
  -> analyzeMeal() server action        [actions.ts]
    -> MealAnalysisService              [server/meal-analysis-service.ts]
      -> AIProvider                     [@/lib/ai/provider.ts]
        -> ClaudeProvider (stub)        [@/lib/ai/claude-provider.ts]
```

- `components/meal-logger.tsx` / `components/log-meal-sheet.tsx` — UI, own
  the compose → analyzing → review/edit → save flow. Depend only on
  `analyzeMeal(text): Promise<MealAnalysis>` from `actions.ts`.
- `actions.ts` — the `"use server"` boundary. Thin: wires `ClaudeProvider`
  into `MealAnalysisService` and delegates. This is where `AI_API_KEY` will
  matter once it's used, so the client never sees it.
- `server/meal-analysis-service.ts` — the domain logic: builds the prompt,
  calls `AIProvider.complete()`, defensively parses the response into
  `MealAnalysis` (handles a model wrapping JSON in prose/markdown, missing
  fields, wrong types — real concerns, not hypothetical ones). Depends only
  on `AIProvider`, never on Claude specifically.
- `@/lib/ai/provider.ts` / `@/lib/ai/claude-provider.ts` — not owned by this
  feature. `AIProvider` is the provider-agnostic contract; `ClaudeProvider`
  is the concrete (currently stubbed) adapter. Shared with the AI coach when
  that lands. See `src/lib/ai/README.md`.

Persistence is Supabase (`use-meal-log.ts` → `data.ts` → the `meals`
table; see `supabase/schema.sql`). Mutators write to the database first and
update local state only on success. `confidence`/`note`/`photoUrl` are
session-only — the table has no columns for them.

Next steps, in order:

- Wire `ClaudeProvider.complete()` to a real Anthropic `messages.create()`
  call using `AI_API_KEY`. This is the *only* file that should need to
  change — `MealAnalysisService`, the server action, and the UI are already
  final-shaped.
- Photo input as a second compose mode alongside text (`AIProvider` doesn't
  care; this is a UI + prompt-construction change in `meal-analysis-service.ts`).
- Persist `confidence`/`note`/`photo_url` if they turn out to matter beyond
  the logging session — the ALTER TABLE lives commented in
  `supabase/schema.sql`; only `data.ts` needs to change.
