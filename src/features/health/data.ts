import { supabase } from "@/lib/supabase";

/** One day's synced Apple Health metrics. */
export interface DailyMetrics {
  date: string;
  activeCalories: number;
  weight: number | null;
  bodyFat: number | null;
}

/** Row shape of the `daily_metrics` table — see supabase/schema.sql. */
interface DailyMetricsRow {
  date: string;
  active_calories: number | null;
  weight: number | null;
  body_fat: number | null;
}

/** Null when nothing has been synced for that day. Throws on real errors —
 * callers that can live without metrics (the dashboard) soft-catch. */
export async function fetchDailyMetrics(date: string): Promise<DailyMetrics | null> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, active_calories, weight, body_fat")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as DailyMetricsRow;
  return {
    date: row.date,
    activeCalories: row.active_calories ?? 0,
    weight: row.weight,
    bodyFat: row.body_fat,
  };
}

/**
 * Upsert keyed on the unique date column — one row per calendar day.
 * `activeCalories`/`weight`/`bodyFat` are each optional so a partial sample
 * (e.g. a webhook backfill that only carries active calories, or a manual
 * weight-only log) doesn't clobber the other metrics already stored for
 * that day: an omitted field is left out of the upserted row entirely, so
 * Postgres leaves the existing column alone on conflict instead of
 * overwriting it with null.
 */
export async function upsertDailyMetrics(metrics: {
  date: string;
  activeCalories?: number;
  weight?: number;
  bodyFat?: number;
}): Promise<void> {
  const row: {
    date: string;
    updated_at: string;
    active_calories?: number;
    weight?: number;
    body_fat?: number;
  } = {
    date: metrics.date,
    updated_at: new Date().toISOString(),
  };
  if (metrics.activeCalories !== undefined) row.active_calories = metrics.activeCalories;
  if (metrics.weight !== undefined) row.weight = metrics.weight;
  if (metrics.bodyFat !== undefined) row.body_fat = metrics.bodyFat;

  const { error } = await supabase.from("daily_metrics").upsert(row, { onConflict: "date" });
  if (error) throw error;
}

/** One logged body-metric entry — weight in kilograms, body fat as a percentage. */
export interface BodyMetricEntry {
  date: string;
  value: number;
}

/**
 * Shared read path for both weight and body-fat history: most recent
 * first, rows with no value for that column excluded rather than shown as
 * a gap or zero.
 */
async function fetchMetricHistory(
  column: "weight" | "body_fat",
  limit: number,
): Promise<BodyMetricEntry[]> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select(`date, ${column}`)
    .not(column, "is", null)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Record<string, string | number>[]).map((row) => ({
    date: row.date as string,
    value: row[column] as number,
  }));
}

export function fetchWeightHistory(limit = 60): Promise<BodyMetricEntry[]> {
  return fetchMetricHistory("weight", limit);
}

export function fetchBodyFatHistory(limit = 60): Promise<BodyMetricEntry[]> {
  return fetchMetricHistory("body_fat", limit);
}

/** Add/edit a weight entry for a given day — upserts just that column. */
export function upsertWeightEntry(date: string, weight: number): Promise<void> {
  return upsertDailyMetrics({ date, weight });
}

export function upsertBodyFatEntry(date: string, bodyFat: number): Promise<void> {
  return upsertDailyMetrics({ date, bodyFat });
}

/**
 * "Delete" clears just this metric's column for the day rather than
 * deleting the daily_metrics row, which may still hold the other metric or
 * an Apple Health active-calories sync for that date.
 */
export async function deleteWeightEntry(date: string): Promise<void> {
  const { error } = await supabase.from("daily_metrics").update({ weight: null }).eq("date", date);
  if (error) throw error;
}

export async function deleteBodyFatEntry(date: string): Promise<void> {
  const { error } = await supabase.from("daily_metrics").update({ body_fat: null }).eq("date", date);
  if (error) throw error;
}
