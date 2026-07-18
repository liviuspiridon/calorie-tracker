import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { upsertDailyMetrics } from "@/features/health/data";

/**
 * Webhook for the iOS Shortcut that syncs daily Apple Health metrics.
 * Auth is a static bearer token (METRICS_WEBHOOK_TOKEN) — Balance has no
 * user sessions, so this is the single-user fallback: the token IS the
 * identity, and rows are written without a user_id.
 *
 * Body: { active: number, weight: number, date?: "YYYY-MM-DD" }
 * `date` defaults to the server's UTC calendar day. Shortcuts that might
 * fire in the 00:00–03:00 local window (when Bucharest is already on the
 * next UTC-lagged day) should pass the device-local date explicitly.
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
  if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
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
