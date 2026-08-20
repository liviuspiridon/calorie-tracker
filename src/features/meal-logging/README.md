# feature: meal-logging

AI-assisted, conversational meal logging: add ingredients one at a time
(text, voice, or photo — including reading a nutrition label), each turn
answered by the model with a confirmation + a prompt to continue or finish,
or a clarifying question when the input is too ambiguous to default. Then
review and adjust the whole meal — optionally checked against a photo of
the plate — and save it.

Status: **the full flow is live**, layered the way it'll ship:

```
MealBuilderSheet (client)
  -> resolveMealTurn() / editMealItems() / reconcileMealWithPhoto()   [actions.ts]
    -> MealItemService                  [server/meal-item-service.ts]
      -> AIProvider                     [@/lib/ai/provider.ts]
        -> GeminiProvider               [@/lib/ai/gemini-provider.ts]
```

- `components/meal-builder-sheet.tsx` — the orchestrator: a "building" step
  (a running total banner pinned above a scrollable conversation feed, then
  the composer — text/voice/photo — and a full-width "Finalizează masa")
  and a "review" step (editable meal name, per-item grams via number input +
  slider with instant client-side macro recompute, delete, an optional
  plate-photo check, a natural-language edit box, live totals, save).
  Nothing here is persisted until "Salvează masa" builds the final
  `MealLogEntry` — the conversation, in-progress photos, and draft items are
  all plain component state.
  - `components/conversation-feed.tsx` — the building step's timeline: user
    turns, assistant messages, and resolved-item cards in one chronological
    scroll (`FeedEntry[]`). Items are referenced by id rather than embedded,
    so `items` (owned by the sheet) stays the single source of truth.
  - `components/item-card.tsx` — one logged ingredient, shared by the feed
    and the review step's editable list (`onGramsChange` opts into the
    weight slider — building-step cards omit it, review-step cards pass it).
  - `components/reconciliation-panel.tsx` — plate-photo discrepancy cards,
    each with its own Apply/Dismiss. Apply calls the same grams-setter the
    slider already uses — no separate mutation path, no AI round-trip.
- `actions.ts` — the `"use server"` boundary. Thin: wires `GeminiProvider`
  into `MealItemService` and delegates, validating any attached image
  (type/size) before it reaches the model. `GEMINI_API_KEY` is read here on
  the server, so the client never sees it.
- `server/meal-item-service.ts` — the domain logic:
  - `resolveTurn({ text?, image?, mode?, context? })` — one turn of the
    conversation, resolving ONE ingredient. Returns `{ status: "resolved",
    message, item }` or `{ status: "clarify", message }` (no `item`) when
    the input is genuinely too ambiguous to default rather than guess.
    `context` (`{ originalText?, exchange }`) is passed when this call
    answers an earlier "clarify" — every question/answer round for this one
    ingredient, so the model sees the full thread, not just the latest
    fragment. `mode: "food"` identifies a dish from a photo; `mode: "label"`
    reads a printed Nutrition Facts panel.
  - `editItems(items, instruction)` — given the current item list and a
    natural-language instruction ("change white bread to sourdough"),
    returns the full updated list; the model resolves which item(s) the
    instruction refers to. Always auto-applied — a deliberate, explicit
    edit, unlike reconciliation below.
  - `reconcileWithPhoto(items, image)` — compares the logged items to a
    photo of the plate and returns a summary message plus per-item
    discrepancy suggestions (`targetIndex` — position in the array as sent,
    not description, since two items can share one). Proposals only, never
    auto-applied: the model is instructed to flag only what it can actually
    see evidence for, since counting/estimating from a photo is inherently
    imprecise.

  Every item is returned as **per-100g macros + a gram weight**, not a
  pre-multiplied total — that's what lets the review step's weight
  slider/input recompute a changed item's macros instantly on the client,
  with no AI round-trip. Only a *what-is-this-food* change (via `editItems`)
  needs the model again. Structured output (`responseJsonSchema`) is a
  backstop, not the primary contract: `status`/`item`'s relationship isn't
  expressible as a clean conditional schema across providers, so it's
  `item` being merely optional in the schema plus defensive parsing that
  enforces it — same stance as truncation/refusal handling everywhere else
  in this file. Depends only on `AIProvider`, never on Gemini specifically.
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
absent for meals logged before it existed. `MealItem.source?: "label" |
"estimated"` records how the macros were obtained, orthogonal to
`confidence` (a label reading can still be low-confidence if the photo is
blurry) — both live in the same `items` jsonb column, no migration needed.
`ConversationMessage`/`MealTurnResult`/`TurnContext`/`ReconciliationResult`/
`ReconciliationSuggestion` are the conversational-turn and reconciliation
shapes, all building-step-only and never persisted. `computeItemMacros`/
`sumItemMacros`/`lowestConfidence` are the pure helpers both the sheet and
`MealDetailSheet`'s ingredients list use.

Persistence is Supabase (`use-meal-log.ts` → `data.ts` → the `meals`
table, including its nullable `items` jsonb column; see
`supabase/schema.sql`). Mutators write to the database first and update
local state only on success. `confidence`/`note`/`photoUrl` are
session-only — the table has no columns for them, and neither is the
conversation transcript or any photo (building-step or plate) — nothing
about a photo is ever uploaded or stored, only sent inline to Gemini for
that one request.

Editing an existing meal opens straight into the review step: seeded from
`entry.items` when present, or a single synthetic item built from the
legacy aggregate `analysis` (`grams: 100`, so the old totals are directly
the per-100g rates — no scaling needed) for meals logged before the builder
existed.

Next steps, in order:

- Persist `confidence`/`note`/`photo_url` if they turn out to matter beyond
  the logging session — the ALTER TABLE lives commented in
  `supabase/schema.sql`; only `data.ts` needs to change.
- Tune `TURN_GUIDELINE` (in `server/meal-item-service.ts`) against real
  usage — a model that clarifies too eagerly on unambiguous input is as bad
  as one that never clarifies. Expect iteration here.
