-- Balance — Supabase schema (reference)
-- Documents the live project's tables so the app can be pointed at a fresh
-- Supabase project later. The data layer (src/features/*/data.ts) assumes
-- exactly these table/column names. Verified against the live project on
-- 2026-07-17 by column probing; types are best-effort inferences.

create table if not exists meals (
  id uuid primary key,
  created_at timestamptz not null default now(),
  -- Denormalized local calendar day (YYYY-MM-DD) of created_at, written by
  -- the app on every insert/update.
  date date not null,
  description text not null,
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null
);

create index if not exists meals_created_at_idx on meals (created_at desc);

create table if not exists daily_targets (
  id integer primary key,
  calories integer not null,
  protein integer not null
);

-- Single-user app: one well-known row holds the targets. Values mirror
-- DEFAULT_DAILY_TARGETS in src/features/goals/types.ts.
insert into daily_targets (id, calories, protein)
values (1, 2000, 120)
on conflict (id) do nothing;

-- Balance is a personal, single-user app with no Supabase Auth: the browser
-- talks to the database with the anon/publishable key, so policies must
-- grant that role full access. That means anyone holding the project URL +
-- key can read/write this data — acceptable for a personal project, but add
-- Auth before ever exposing this to other people.
alter table meals enable row level security;
alter table daily_targets enable row level security;

create policy "anon full access to meals"
  on meals for all
  to anon
  using (true)
  with check (true);

create policy "anon full access to daily_targets"
  on daily_targets for all
  to anon
  using (true)
  with check (true);

-- Daily Apple Health metrics, synced by an iOS Shortcut posting to
-- /api/metrics (bearer-token auth — see METRICS_WEBHOOK_TOKEN in
-- .env.example). One row per calendar day, upserted on date. user_id is
-- null for now — Balance is single-user with no auth; the column exists so
-- a future multi-user shape doesn't need a migration.
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  date date not null unique,
  active_calories numeric,
  weight numeric,
  updated_at timestamptz not null default now()
);

alter table daily_metrics enable row level security;

create policy "anon full access to daily_metrics"
  on daily_metrics for all
  to anon
  using (true)
  with check (true);

-- Optional: the app also captures confidence / note / photo per meal during
-- logging, but drops them on save because these columns don't exist. To
-- persist them, run this and extend toRow/toEntry in
-- src/features/meal-logging/data.ts:
--
-- alter table meals
--   add column confidence text check (confidence in ('low', 'medium', 'high')),
--   add column note text,
--   add column photo_url text;
