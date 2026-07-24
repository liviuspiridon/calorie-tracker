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
  fat integer not null,
  fiber integer not null default 0
);

create index if not exists meals_created_at_idx on meals (created_at desc);

-- Migration for an existing meals table created before fiber tracking:
-- backfilled to 0 for old rows (fiber was never estimated for them).
alter table meals
  add column if not exists fiber integer not null default 0;

create table if not exists daily_targets (
  id integer primary key,
  -- Resting Energy / BMR and the target deficit are what the app now lets
  -- the user edit; calories is derived (bmr - calorie_deficit), kept as a
  -- real column rather than a view so it stays queryable by anything that
  -- only knows the old shape (e.g. a future direct SQL query or export).
  -- The app always writes it alongside bmr/calorie_deficit — never on its
  -- own — so it can't drift out of sync.
  bmr numeric not null,
  calorie_deficit numeric not null,
  calories integer not null,
  protein integer not null,
  fiber integer not null default 28,
  -- User's height, for computing BMI on the fly from weight entries. Not
  -- date-scoped like weight/body_fat — just the one current value.
  height_cm numeric not null default 178
);

-- Single-user app: one well-known row holds the targets. Values mirror
-- DEFAULT_DAILY_TARGETS in src/features/goals/types.ts.
insert into daily_targets (id, bmr, calorie_deficit, calories, protein, fiber, height_cm)
values (1, 1750, 500, 1250, 120, 28, 178)
on conflict (id) do nothing;

-- Migration for an existing daily_targets row created before bmr /
-- calorie_deficit existed (plain `calories` only). Backfills bmr so the
-- derived target (bmr - calorie_deficit) equals the row's current calories
-- value, i.e. today's effective target is preserved exactly — nothing
-- changes for the user until they edit the new fields.
alter table daily_targets
  add column if not exists bmr numeric,
  add column if not exists calorie_deficit numeric not null default 500;

update daily_targets
  set bmr = calories + calorie_deficit
  where bmr is null;

alter table daily_targets
  alter column bmr set not null;

-- Migration for an existing daily_targets row created before fiber tracking.
alter table daily_targets
  add column if not exists fiber integer not null default 28;

-- Migration for an existing daily_targets row created before height was
-- tracked (needed for BMI).
alter table daily_targets
  add column if not exists height_cm numeric not null default 178;

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
-- .env.example), plus manually-logged weight/body_fat entries from the
-- Body Composition hub. One row per calendar day, upserted on date. user_id
-- is null for now — Balance is single-user with no auth; the column exists
-- so a future multi-user shape doesn't need a migration.
--
-- "Deleting" a weight or body_fat entry from the Body Composition hub nulls
-- that column for the date rather than deleting the row, since the row may
-- still hold the other metric (or active_calories from the Health sync).
create table if not exists daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  date date not null unique,
  active_calories numeric,
  weight numeric,
  body_fat numeric,
  updated_at timestamptz not null default now()
);

-- Migration for an existing daily_metrics table created before body fat
-- tracking.
alter table daily_metrics
  add column if not exists body_fat numeric;

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
