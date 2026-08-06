# Balance

A personal health dashboard. Built vertically, feature by feature — each
sprint ships something real to use, not scaffolding.

**Live today:** a Today dashboard (calories/protein remaining, on-track
status, a rule-based "what's next" suggestion, today's meals) and
AI-assisted, iterative meal logging (add ingredients one at a time — text,
voice, or photo, including reading a nutrition label — then review/adjust
the whole meal and save). Apple Health and Home Assistant are still
contracts, not integrations — see their feature READMEs.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config, OKLCH design tokens)
- **shadcn/ui** (`components.json` is configured — add components with `npx shadcn@latest add <name>`)
- **next-themes** for dark / light / system mode
- **ESLint 9 (flat config) + Prettier** (with the Tailwind class-sorting plugin)

Persistence is **Supabase** (Postgres, browser client + anon key, no auth
session — see `supabase/schema.sql` and `src/lib/supabase.ts`). There's
still no auth or deployment infra: infrastructure gets added when a feature
actually needs it, not ahead of time. See `src/features/*/README.md` for
what each feature still needs.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Other scripts:

| Script                            | What it does               |
| --------------------------------- | -------------------------- |
| `npm run build`                   | Production build           |
| `npm run start`                   | Serve the production build |
| `npm run lint` / `lint:fix`       | ESLint                     |
| `npm run format` / `format:check` | Prettier                   |
| `npm run typecheck`               | `tsc --noEmit`             |

Environment variables: copy `.env.example` to `.env.local` when integrations land.

## Architecture

```
src/
├── app/                     # Routes only — thin pages that compose components
│   ├── layout.tsx           # Root: fonts, ThemeProvider, metadata, viewport
│   ├── page.tsx             # Today dashboard (the app's root route)
│   ├── weight/               # Body Composition hub (weight/body fat/BMI)
│   └── api/metrics/          # Apple Health webhook (bearer-token, upserts daily_metrics)
├── components/
│   ├── ui/                  # shadcn/ui primitives (generic, app-agnostic)
│   ├── dashboard/             # Today dashboard's own composition — reads
│   │                             goals + meal-logging + health, doesn't own data
│   ├── body-composition/        # Body Composition hub's own composition
│   └── theme/                    # ThemeProvider + ThemeToggle
├── features/                      # One folder per domain capability (vertical slices)
│   ├── apple-health/               # Port: AppleHealthProvider — scaffold only
│   ├── home-assistant/             # Port: HomeAssistantClient — scaffold only
│   ├── meal-logging/                # Live: iterative item-by-item builder -> AI analysis -> review -> save
│   ├── goals/                        # Daily targets (BMR/deficit/protein/fiber/height) + status logic
│   ├── health/                        # Apple Health sync data layer (daily_metrics, weight/body-fat CRUD)
│   └── nudge/                          # Deterministic post-log feedback (no AI)
├── lib/
│   ├── ai/                        # Provider-agnostic AI layer (AIProvider, GeminiProvider)
│   ├── bmi.ts                     # BMI calculation + WHO classification
│   ├── supabase.ts                # Supabase client (anon key)
│   └── utils.ts                   # cn, date/formatting helpers
├── hooks/                         # Shared React hooks (incl. useSpeechRecognition)
└── types/                         # Shared domain model (MetricSample, …)
```

### The rules that keep it clean

1. **Routes are thin.** Files in `app/` compose components; they don't own logic.
2. **Features are vertical slices.** Each `src/features/*` folder owns one domain end-to-end. The two integration features (`apple-health`, `home-assistant`) expose a port interface for a future adapter; vendor payloads never leak past that boundary — everything maps to the shared `MetricSample` domain type in `src/types`.
3. **The dashboard reads, it doesn't own.** `components/dashboard` composes data from `features/meal-logging`, `features/goals`, and `features/health`; it holds no domain logic of its own.
4. **`components/ui` stays generic.** Nothing in there knows about health data. App-specific composition lives in `components/dashboard`, `components/body-composition`, or inside a feature.
5. **AI is provider-agnostic.** Anything that calls an LLM depends on `AIProvider` (`src/lib/ai`), never on a vendor SDK directly — see `src/lib/ai/README.md`.
6. **Secrets stay server-side.** `HOME_ASSISTANT_TOKEN` and `AI_API_KEY` are read only in server code via `src/lib/env.ts`.
7. **Infrastructure follows features, not the other way around.** No database, auth, or deployment setup gets added until a specific feature actually needs it.

### Adding a future integration

Each feature folder has a `README.md` with concrete next steps.

## Theming

Design tokens live in `src/app/globals.css` as OKLCH CSS variables (`:root` for light, `.dark` for dark), exposed to Tailwind through `@theme inline`. `next-themes` toggles the `dark` class on `<html>`; the toggle is in the header. Reduced motion is respected globally.
