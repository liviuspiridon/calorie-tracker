# feature: meal-logging

AI-assisted, iterative meal logging: add ingredients one at a time (text,
voice, or photo — including reading a nutrition label), review and adjust
the whole meal, save it.

Status: **the full flow is live**, layered the way it'll ship:

```
MealBuilderSheet (client)
  -> analyzeMealItem() / analyzeMealItemPhoto() / editMealItems()   [actions.ts]
    -> MealItemService                  [server/meal-item-service.ts]
      -> AIProvider                     [@/lib/ai/provider.ts]
        -> GeminiProvider               [@/lib/ai/gemini-provider.ts]
```

- `components/meal-builder-sheet.tsx` — the whole UI: a "building" step
  (add ingredients one at a time — text/voice/photo, a running total banner,
  a growing item list, quick-reply pills to add another or finalize) and a
  "review" step (editable meal name, per-item grams via number input +
  slider with instant client-side macro recompute, delete, a natural-language
  edit box, live totals, save). Nothing here is persisted until "Salvează
  masa" builds the final `MealLogEntry` — chat history, in-progress photos,
  and draft items are all plain component state.
- `actions.ts` — the `"use server"` boundary. Thin: wires `GeminiProvider`
  into `MealItemService` and delegates. `GEMINI_API_KEY` is read here on the
  server, so the client never sees it.
- `server/meal-item-service.ts` — the domain logic, one item at a time:
  - `analyzeItem(text)` — a plain-text ingredient ("300g tomatoes").
  - `analyzeItemPhoto(image, mode, quantityHint?)` — `mode: "food"` identifies
    a dish/ingredient from a photo; `mode: "label"` reads a printed Nutrition
    Facts panel. `quantityHint` is whatever the user typed alongside the
    photo (e.g. "150g").
  - `editItems(items, instruction)` — given the current item list and a
    natural-language instruction ("change white bread to sourdough"),
    returns the full updated list; the model resolves which item(s) the
    instruction refers to.

  Every item is returned as **per-100g macros + a gram weight**, not a
  pre-multiplied total — that's what lets the review step's weight
  slider/input recompute a changed item's macros instantly on the client,
  with no AI round-trip. Only a *what-is-this-food* change (via `editItems`)
  needs the model again. The schema is enforced server-side via structured
  outputs, so defensive parsing is a backstop (truncation, refusals), not
  the primary contract. Depends only on `AIProvider`, never on Gemini
  specifically.
- `@/lib/ai/provider.ts` / `@/lib/ai/gemini-provider.ts` — not owned by this
  feature. `AIProvider` is the provider-agnostic contract; `GeminiProvider`
  is the real Google Gemini adapter (`gemini-flash-lite-latest`). Shared
  with the AI coach when that lands. See `src/lib/ai/README.md`.

**Data model** (`types.ts`): `MealAnalysis` is the aggregate totals
(calories/protein/carbs/fat/fiber) — unchanged from before this feature
became itemized, so every other consumer (dashboard budget card, nudge
engine, calendar day coloring) reads it exactly as it always has and needed
no changes. `MealLogEntry.items?: MealItem[]` is the itemized breakdown,
additive and optional — present for meals logged through the builder,
absent for meals logged before it existed. `computeItemMacros`/
`sumItemMacros`/`lowestConfidence` are the pure helpers both the sheet and
`MealDetailSheet`'s ingredients list use.

Persistence is Supabase (`use-meal-log.ts` → `data.ts` → the `meals`
table, including its nullable `items` jsonb column; see
`supabase/schema.sql`). Mutators write to the database first and update
local state only on success. `confidence`/`note`/`photoUrl` are
session-only — the table has no columns for them.

Editing an existing meal opens straight into the review step: seeded from
`entry.items` when present, or a single synthetic item built from the
legacy aggregate `analysis` (`grams: 100`, so the old totals are directly
the per-100g rates — no scaling needed) for meals logged before the builder
existed.

Next steps, in order:

- Persist `confidence`/`note`/`photo_url` if they turn out to matter beyond
  the logging session — the ALTER TABLE lives commented in
  `supabase/schema.sql`; only `data.ts` needs to change.
