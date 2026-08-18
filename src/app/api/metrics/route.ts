import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { upsertDailyMetrics } from "@/features/health/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Webhook for the iOS Shortcut that syncs daily Apple Health metrics.
 * Auth is a static bearer token (METRICS_WEBHOOK_TOKEN) — Balance has no
 * user sessions, so this is the single-user fallback: the token IS the
 * identity, and rows are written without a user_id.
 *
 * Two body shapes are accepted, both upserting into daily_metrics keyed on
 * `date`:
 *
 * 1. Legacy single snapshot — still what the existing Shortcut sends, now
 *    with optional body-fat, muscle-mass, and lean-body-mass readings (a
 *    Withings smart scale syncs these into Health alongside weight):
 *    { active: number, weight: number, body_fat?: number | string, muscle_mass?: number | string, lean_body_mass?: number | string, date?: "YYYY-MM-DD" }.
 *    `date` defaults to the server's UTC calendar day. `bodyFat`/`muscleMass`/
 *    `leanBodyMass` are also accepted as aliases for `body_fat`/`muscle_mass`/
 *    `lean_body_mass`, since any of them could plausibly come from a
 *    hand-edited Shortcut JSON dictionary. All three accept a numeric string
 *    too (e.g. "18.5") — Shortcuts can serialize a Text field holding a
 *    single magic variable as a JSON string rather than a bare number,
 *    depending on exactly how the field was built. All three are entirely
 *    optional — an existing Shortcut payload that only ever sends
 *    { active, weight } keeps working unchanged.
 *
 * 2. Batch of dated samples — additive, for backfilling a day boundary in
 *    one call (e.g. late-night activity that should finalize yesterday's
 *    row alongside today's running total):
 *    { entries: [{ date?: "YYYY-MM-DD", timestamp?: string, active?: number, weight?: number, body_fat?: number | string, muscle_mass?: number | string, lean_body_mass?: number | string }] }
 *    Each entry resolves its own calendar day — explicit `date` wins,
 *    otherwise it's derived from `timestamp`'s UTC date — and upserts that
 *    day's row independently, so an entry dated yesterday updates yesterday
 *    while one dated today updates today, in the same request. An entry
 *    only needs whichever metrics it's reporting; the others already on
 *    that day's row are left untouched. Duplicate dates within one
 *    payload: the last entry for a date wins, since Health reports a
 *    cumulative running total per day, not a delta.
 */
export async function POST(request: Request) {
  const expected = process.env.METRICS_WEBHOOK_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "METRICS_WEBHOOK_TOKEN is not configured on the server." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!safeEqual(token, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const { entries } = (body ?? {}) as { entries?: unknown };
  return entries !== undefined ? handleEntries(entries) : handleLegacySnapshot(body);
}

async function handleLegacySnapshot(body: unknown) {
  const { active, weight, date, ...rest } = (body ?? {}) as {
    active?: unknown;
    weight?: unknown;
    date?: unknown;
    body_fat?: unknown;
    bodyFat?: unknown;
    muscle_mass?: unknown;
    muscleMass?: unknown;
    lean_body_mass?: unknown;
    leanBodyMass?: unknown;
  };
  const rawBodyFat = rest.body_fat ?? rest.bodyFat;
  const bodyFat = toNonNegativeNumber(rawBodyFat);
  const rawMuscleMass = rest.muscle_mass ?? rest.muscleMass;
  const muscleMass = toNonNegativeNumber(rawMuscleMass);
  const rawLeanBodyMass = rest.lean_body_mass ?? rest.leanBodyMass;
  const leanBodyMass = toNonNegativeNumber(rawLeanBodyMass);

  if (!isNonNegativeNumber(active) || !isNonNegativeNumber(weight)) {
    return NextResponse.json(
      { error: "Body must be { active: number, weight: number } with non-negative values." },
      { status: 400 },
    );
  }
  if (rawBodyFat !== undefined && bodyFat === undefined) {
    return NextResponse.json(
      { error: "body_fat must be a non-negative number (or numeric string) when provided." },
      { status: 400 },
    );
  }
  if (rawMuscleMass !== undefined && muscleMass === undefined) {
    return NextResponse.json(
      { error: "muscle_mass must be a non-negative number (or numeric string) when provided." },
      { status: 400 },
    );
  }
  if (rawLeanBodyMass !== undefined && leanBodyMass === undefined) {
    return NextResponse.json(
      { error: "lean_body_mass must be a non-negative number (or numeric string) when provided." },
      { status: 400 },
    );
  }
  if (date !== undefined && (typeof date !== "string" || !DATE_RE.test(date))) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD when provided." }, { status: 400 });
  }

  const targetDate = (date as string | undefined) ?? new Date().toISOString().slice(0, 10);

  try {
    await upsertDailyMetrics({
      date: targetDate,
      activeCalories: active,
      weight,
      bodyFat,
      muscleMass,
      leanBodyMass,
    });
  } catch (error) {
    console.error("Failed to upsert daily metrics", error);
    return NextResponse.json(
      { error: "Failed to store metrics — is the daily_metrics table created?" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, date: targetDate, active, weight, bodyFat, muscleMass, leanBodyMass });
}

interface ParsedEntry {
  date: string;
  active?: number;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  leanBodyMass?: number;
}

async function handleEntries(rawEntries: unknown) {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return NextResponse.json({ error: "entries must be a non-empty array." }, { status: 400 });
  }

  const parsed: ParsedEntry[] = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const entry = (rawEntries[i] ?? {}) as {
      date?: unknown;
      timestamp?: unknown;
      active?: unknown;
      weight?: unknown;
      body_fat?: unknown;
      bodyFat?: unknown;
      muscle_mass?: unknown;
      muscleMass?: unknown;
      lean_body_mass?: unknown;
      leanBodyMass?: unknown;
    };
    const rawBodyFat = entry.body_fat ?? entry.bodyFat;
    const bodyFat = toNonNegativeNumber(rawBodyFat);
    const rawMuscleMass = entry.muscle_mass ?? entry.muscleMass;
    const muscleMass = toNonNegativeNumber(rawMuscleMass);
    const rawLeanBodyMass = entry.lean_body_mass ?? entry.leanBodyMass;
    const leanBodyMass = toNonNegativeNumber(rawLeanBodyMass);

    const date = resolveEntryDate(entry.date, entry.timestamp);
    if (!date) {
      return NextResponse.json(
        { error: `entries[${i}] needs a valid "date" (YYYY-MM-DD) or "timestamp".` },
        { status: 400 },
      );
    }
    if (entry.active !== undefined && !isNonNegativeNumber(entry.active)) {
      return NextResponse.json(
        { error: `entries[${i}].active must be a non-negative number when provided.` },
        { status: 400 },
      );
    }
    if (entry.weight !== undefined && !isNonNegativeNumber(entry.weight)) {
      return NextResponse.json(
        { error: `entries[${i}].weight must be a non-negative number when provided.` },
        { status: 400 },
      );
    }
    if (rawBodyFat !== undefined && bodyFat === undefined) {
      return NextResponse.json(
        { error: `entries[${i}].body_fat must be a non-negative number (or numeric string) when provided.` },
        { status: 400 },
      );
    }
    if (rawMuscleMass !== undefined && muscleMass === undefined) {
      return NextResponse.json(
        { error: `entries[${i}].muscle_mass must be a non-negative number (or numeric string) when provided.` },
        { status: 400 },
      );
    }
    if (rawLeanBodyMass !== undefined && leanBodyMass === undefined) {
      return NextResponse.json(
        {
          error: `entries[${i}].lean_body_mass must be a non-negative number (or numeric string) when provided.`,
        },
        { status: 400 },
      );
    }
    if (
      entry.active === undefined &&
      entry.weight === undefined &&
      bodyFat === undefined &&
      muscleMass === undefined &&
      leanBodyMass === undefined
    ) {
      return NextResponse.json(
        { error: `entries[${i}] needs at least one of active/weight/body_fat/muscle_mass/lean_body_mass.` },
        { status: 400 },
      );
    }

    parsed.push({
      date,
      active: entry.active as number | undefined,
      weight: entry.weight as number | undefined,
      bodyFat,
      muscleMass,
      leanBodyMass,
    });
  }

  const byDate = new Map<string, ParsedEntry>();
  for (const entry of parsed) byDate.set(entry.date, entry);

  try {
    for (const entry of byDate.values()) {
      await upsertDailyMetrics({
        date: entry.date,
        activeCalories: entry.active,
        weight: entry.weight,
        bodyFat: entry.bodyFat,
        muscleMass: entry.muscleMass,
        leanBodyMass: entry.leanBodyMass,
      });
    }
  } catch (error) {
    console.error("Failed to upsert daily metrics", error);
    return NextResponse.json(
      { error: "Failed to store metrics — is the daily_metrics table created?" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    updated: [...byDate.values()],
  });
}

/** Explicit `date` wins; otherwise derives the UTC calendar day from `timestamp`. */
function resolveEntryDate(date: unknown, timestamp: unknown): string | null {
  if (typeof date === "string") {
    return DATE_RE.test(date) ? date : null;
  }
  if (typeof timestamp === "string") {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Same acceptance as isNonNegativeNumber, but also coerces a numeric
 * string — Shortcuts can serialize a Text field holding a single magic
 * variable as a JSON string (e.g. "18.5") rather than a bare number,
 * depending on exactly how the field was built. Returns undefined for
 * anything else (including `undefined` itself), so `rawValue !== undefined
 * && coerced === undefined` reliably means "present but invalid".
 */
function toNonNegativeNumber(value: unknown): number | undefined {
  if (isNonNegativeNumber(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (isNonNegativeNumber(parsed)) return parsed;
  }
  return undefined;
}

/** Constant-time comparison so token guesses can't be timed. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
