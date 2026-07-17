# Balance

A personal health dashboard. Built vertically, feature by feature — each
sprint ships something real to use, not scaffolding.

**Live today:** a Today dashboard (calories/protein remaining, on-track
status, a rule-based "what's next" suggestion, today's meals) and AI-assisted
meal logging (describe a meal in your own words, review/edit the estimate,
save it). Apple Health and Home Assistant are still contracts, not
integrations — see their feature READMEs.

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
│   ├── layout.tsx           # Root: fonts, ThemeProvider, metadata
│   └── (dashboard)/         # Route group sharing the app shell
│       ├── layout.tsx       # Sidebar (desktop) + header/sheet nav (mobile)
│       ├── page.tsx         # Today dashboard
│       ├── health/          # Placeholder — Apple Health
│       ├── meals/           # Live — meal log + AI-assisted logging
│       └── home/            # Placeholder — Home Assistant
├── components/
│   ├── ui/                  # shadcn/ui primitives (generic, app-agnostic)
│   ├── layout/               # App shell: sidebar, header, page header, brand
│   ├── shared/                # Reusable app-level pieces (EmptyState, …)
│   ├── dashboard/              # Today dashboard's own composition — reads
│   │                              goals + meal-logging, doesn't own data
│   └── theme/                    # ThemeProvider + ThemeToggle
├── features/                      # One folder per domain capability (vertical slices)
│   ├── apple-health/              # Port: AppleHealthProvider — scaffold only
│   ├── home-assistant/            # Port: HomeAssistantClient — scaffold only
│   ├── meal-logging/              # Live: compose -> AI analysis -> review -> save
│   └── goals/                     # Minimal: today's calorie/protein target + status logic
├── lib/
│   ├── ai/                        # Provider-agnostic AI layer (AIProvider, ClaudeProvider stub)
│   ├── env.ts                     # Typed env access
│   └── utils.ts                   # cn, date/formatting helpers
├── config/                        # site.ts (metadata), nav.ts (single nav source)
├── hooks/                         # Shared React hooks (incl. useLocalStorage)
└── types/                         # Shared domain model (MetricSample, …)
```

### The rules that keep it clean

1. **Routes are thin.** Files in `app/` compose components; they don't own logic.
2. **Features are vertical slices.** Each `src/features/*` folder owns one domain end-to-end. The two integration features (`apple-health`, `home-assistant`) expose a port interface for a future adapter; vendor payloads never leak past that boundary — everything maps to the shared `MetricSample` domain type in `src/types`.
3. **The dashboard reads, it doesn't own.** `components/dashboard` composes data from `features/meal-logging` and `features/goals`; it holds no domain logic of its own.
4. **`components/ui` stays generic.** Nothing in there knows about health data. App-specific composition lives in `components/shared`, `components/dashboard`, or inside a feature.
5. **AI is provider-agnostic.** Anything that calls an LLM depends on `AIProvider` (`src/lib/ai`), never on a vendor SDK directly — see `src/lib/ai/README.md`.
6. **Secrets stay server-side.** `HOME_ASSISTANT_TOKEN` and `AI_API_KEY` are read only in server code via `src/lib/env.ts`.
7. **Infrastructure follows features, not the other way around.** No database, auth, or deployment setup gets added until a specific feature actually needs it.

### Adding a future integration

Each feature folder has a `README.md` with concrete next steps.

## Theming

Design tokens live in `src/app/globals.css` as OKLCH CSS variables (`:root` for light, `.dark` for dark), exposed to Tailwind through `@theme inline`. `next-themes` toggles the `dark` class on `<html>`; the toggle is in the header. Reduced motion is respected globally.
