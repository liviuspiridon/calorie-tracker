# feature: meal-logging

AI-assisted meal logging: describe a meal (or, later, snap a photo), get
structured nutrition data back, review it, adjust it, save it.

Status: **the full flow is live**, layered the way it'll ship:

```
LogMealSheet (client)
  -> analyzeMeal() server action        [actions.ts]
    -> MealAnalysisService              [server/meal-analysis-service.ts]
      -> AIProvider                     [@/lib/ai/provider.ts]
        -> GeminiProvider               [@/lib/ai/gemini-provider.ts]
```

- `components/meal-logger.tsx` / `components/log-meal-sheet.tsx` — UI, own
  the compose → analyzing → review/edit → save flow. Depend only on
  `analyzeMeal(text): Promise<MealAnalysis>` from `actions.ts`.
- `actions.ts` — the `"use server"` boundary. Thin: wires `GeminiProvider`
  into `MealAnalysisService` and delegates. `GEMINI_API_KEY` is read here on
  the server, so the client never sees it.
- `server/meal-analysis-service.ts` — the domain logic: owns the system
  prompt and the meal JSON schema, calls `AIProvider.complete()`, and
  defensively parses the response into `MealAnalysis`. The schema is
  enforced server-side via structured outputs, so the parsing is a backstop
  (truncation, refusals), not the primary contract. Depends only on
  `AIProvider`, never on Gemini specifically.
- `@/lib/ai/provider.ts` / `@/lib/ai/gemini-provider.ts` — not owned by this
  feature. `AIProvider` is the provider-agnostic contract; `GeminiProvider`
  is the real Google Gemini adapter (`gemini-flash-lite-latest`). Shared
  with the AI coach when that lands. See `src/lib/ai/README.md`.

Persistence is Supabase (`use-meal-log.ts` → `data.ts` → the `meals`
table; see `supabase/schema.sql`). Mutators write to the database first and
update local state only on success. `confidence`/`note`/`photoUrl` are
session-only — the table has no columns for them.

Next steps, in order:

- Photo input as a second compose mode alongside text (`AIProvider` doesn't
  care; this is a UI + prompt-construction change in `meal-analysis-service.ts`).
- Persist `confidence`/`note`/`photo_url` if they turn out to matter beyond
  the logging session — the ALTER TABLE lives commented in
  `supabase/schema.sql`; only `data.ts` needs to change.
