# Balance

A personal health dashboard. This repository is the **project foundation**: architecture, design system, theming, and integration contracts — intentionally no business logic yet.

## Stack

- **Next.js 15** (App Router, Turbopack)
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config, OKLCH design tokens)
- **shadcn/ui** (`components.json` is configured — add components with `npx shadcn@latest add <name>`)
- **next-themes** for dark / light / system mode
- **ESLint 9 (flat config) + Prettier** (with the Tailwind class-sorting plugin)

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
├── app/                    # Routes only — thin pages that compose components
│   ├── layout.tsx          # Root: fonts, ThemeProvider, metadata
│   └── (dashboard)/        # Route group sharing the app shell
│       ├── layout.tsx      # Sidebar (desktop) + header/sheet nav (mobile)
│       ├── page.tsx        # Dashboard home
│       ├── health/         # Placeholder — Apple Health
│       ├── meals/          # Placeholder — AI meal logging
│       └── home/           # Placeholder — Home Assistant
├── components/
│   ├── ui/                 # shadcn/ui primitives (generic, app-agnostic)
│   ├── layout/             # App shell: sidebar, header, page header, brand
│   ├── shared/             # Reusable app-level pieces (EmptyState, …)
│   └── theme/              # ThemeProvider + ThemeToggle
├── features/               # One folder per domain capability (vertical slices)
│   ├── apple-health/       # Port: AppleHealthProvider
│   ├── meal-logging/       # Port: MealAnalyzer
│   └── home-assistant/     # Port: HomeAssistantClient
├── config/                 # site.ts (metadata), nav.ts (single nav source)
├── hooks/                  # Shared React hooks
├── lib/                    # utils (cn), env.ts (typed env access)
└── types/                  # Shared domain model (MetricSample, …)
```

### The rules that keep it clean

1. **Routes are thin.** Files in `app/` compose components; they don't own logic.
2. **Features are vertical slices with ports.** Each `src/features/*` folder owns one integration end-to-end and exposes a TypeScript interface (the "port"). Vendor payloads never leak past the feature boundary — everything maps to the shared `MetricSample` domain type in `src/types`.
3. **`components/ui` stays generic.** Nothing in there knows about health data. App-specific composition lives in `components/shared` or inside a feature.
4. **Secrets stay server-side.** `HOME_ASSISTANT_TOKEN` and `AI_API_KEY` are read only in server code via `src/lib/env.ts`.

### Adding a future integration

Each feature folder has a `README.md` with concrete next steps. The short version: implement the port interface in `types.ts` (as a server-side adapter), map results to `MetricSample`, and replace the route's `EmptyState`.

## Theming

Design tokens live in `src/app/globals.css` as OKLCH CSS variables (`:root` for light, `.dark` for dark), exposed to Tailwind through `@theme inline`. `next-themes` toggles the `dark` class on `<html>`; the toggle is in the header. Reduced motion is respected globally.
