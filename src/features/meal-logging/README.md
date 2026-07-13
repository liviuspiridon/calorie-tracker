# feature: meal-logging

AI-assisted meal logging: snap a photo or type a description, get structured
nutrition data back.

Status: **scaffold only** — `MealAnalyzer` in `types.ts` is the contract.

Implementation notes for later:

- The analyzer call belongs in a server action or API route so the AI key
  stays server-side (`AI_API_KEY` in `src/lib/env.ts`).
- Persist `MealLogEntry` records; map them to the shared `MetricSample`
  (`kind: "calories_in"`) so the dashboard can aggregate across sources.
