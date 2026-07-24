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
 * 1. Legacy single snapshot — unchanged, still what the existing Shortcut
 *    sends: { active: number, weight: number, date?: "YYYY-MM-DD" }.
 *    `date` defaults to the server's UTC calendar day.
 *
 * 2. Batch of dated samples — additive, for backfilling a day boundary in
 *    one call (e.g. late-night activity that should finalize yesterday's
 *    row alongside today's running total):
 *    { entries: [{ date?: "YYYY-MM-DD", timestamp?: string, active?: number, weight?: number }] }
 *    Each entry resolves its own calendar day — explicit `date` wins,
 *    otherwise it's derived from `timestamp`'s UTC date — and upserts that
 *    day's row independently, so an entry dated yesterday updates yesterday
 *    while one dated today updates today, in the same request. An entry
 *    only needs whichever of active/weight it's reporting; the other metric
 *    on that day's row is left untouched. Duplicate dates within one
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
  const { active, weight, date } = (body ?? {}) as {
    active?: unknown;
    weight?: unknown;
    date?: unknown;
  };
  if (!isNonNegativeNumber(active) || !isNonNegativeNumber(weight)) {
    return NextResponse.json(
      { error: "Body must be { active: number, weight: number } with non-negative values." },
      { status: 400 },
    );
  }
  if (date !== undefined && (typeof date !== "string" || !DATE_RE.test(date))) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD when provided." }, { status: 400 });
  }

  const targetDate = (date as string | undefined) ?? new Date().toISOString().slice(0, 10);

  try {
    await upsertDailyMetrics({ date: targetDate, activeCalories: active, weight });
  } catch (error) {
    console.error("Failed to upsert daily metrics", error);
    return NextResponse.json(
      { error: "Failed to store metrics — is the daily_metrics table created?" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, date: targetDate, active, weight });
}

interface ParsedEntry {
  date: string;
  active?: number;
  weight?: number;
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
    };

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
    if (entry.active === undefined && entry.weight === undefined) {
      return NextResponse.json(
        { error: `entries[${i}] needs at least one of active/weight.` },
        { status: 400 },
      );
    }

    parsed.push({ date, active: entry.active as number | undefined, weight: entry.weight as number | undefined });
  }

  const byDate = new Map<string, ParsedEntry>();
  for (const entry of parsed) byDate.set(entry.date, entry);

  try {
    for (const entry of byDate.values()) {
      await upsertDailyMetrics({
        date: entry.date,
        activeCalories: entry.active,
        weight: entry.weight,
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

/** Constant-time comparison so token guesses can't be timed. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
