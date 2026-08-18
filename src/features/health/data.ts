import { supabase } from "@/lib/supabase";

/** One day's synced Apple Health metrics. */
export interface DailyMetrics {
  date: string;
  activeCalories: number;
  weight: number | null;
  bodyFat: number | null;
  muscleMass: number | null;
  leanBodyMass: number | null;
}

/** Row shape of the `daily_metrics` table — see supabase/schema.sql. */
interface DailyMetricsRow {
  date: string;
  active_calories: number | null;
  weight: number | null;
  body_fat: number | null;
  muscle_mass: number | null;
  lean_body_mass: number | null;
}

/** Null when nothing has been synced for that day. Throws on real errors —
 * callers that can live without metrics (the dashboard) soft-catch. */
export async function fetchDailyMetrics(date: string): Promise<DailyMetrics | null> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, active_calories, weight, body_fat, muscle_mass, lean_body_mass")
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
    muscleMass: row.muscle_mass,
    leanBodyMass: row.lean_body_mass,
  };
}

/**
 * Upsert keyed on the unique date column — one row per calendar day.
 * `activeCalories`/`weight`/`bodyFat`/`muscleMass`/`leanBodyMass` are each
 * optional so a partial sample (e.g. a webhook backfill that only carries
 * active calories, or a manual weight-only log) doesn't clobber the other
 * metrics already stored for that day: an omitted field is left out of the
 * upserted row entirely, so Postgres leaves the existing column alone on
 * conflict instead of overwriting it with null.
 */
export async function upsertDailyMetrics(metrics: {
  date: string;
  activeCalories?: number;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  leanBodyMass?: number;
}): Promise<void> {
  const row: {
    date: string;
    updated_at: string;
    active_calories?: number;
    weight?: number;
    body_fat?: number;
    muscle_mass?: number;
    lean_body_mass?: number;
  } = {
    date: metrics.date,
    updated_at: new Date().toISOString(),
  };
  if (metrics.activeCalories !== undefined) row.active_calories = metrics.activeCalories;
  if (metrics.weight !== undefined) row.weight = metrics.weight;
  if (metrics.bodyFat !== undefined) row.body_fat = metrics.bodyFat;
  if (metrics.muscleMass !== undefined) row.muscle_mass = metrics.muscleMass;
  if (metrics.leanBodyMass !== undefined) row.lean_body_mass = metrics.leanBodyMass;

  const { error } = await supabase.from("daily_metrics").upsert(row, { onConflict: "date" });
  if (error) throw error;
}

/** One logged body-metric entry — weight in kilograms, body fat/muscle mass as a percentage. */
export interface BodyMetricEntry {
  date: string;
  value: number;
}

type MetricColumn = "weight" | "body_fat" | "muscle_mass";

/**
 * Shared read path for weight, body-fat, and muscle-mass history: most
 * recent first, rows with no value for that column excluded rather than
 * shown as a gap or zero.
 */
async function fetchMetricHistory(column: MetricColumn, limit: number): Promise<BodyMetricEntry[]> {
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

export function fetchMuscleMassHistory(limit = 60): Promise<BodyMetricEntry[]> {
  return fetchMetricHistory("muscle_mass", limit);
}

/** Add/edit a weight entry for a given day — upserts just that column. */
export function upsertWeightEntry(date: string, weight: number): Promise<void> {
  return upsertDailyMetrics({ date, weight });
}

export function upsertBodyFatEntry(date: string, bodyFat: number): Promise<void> {
  return upsertDailyMetrics({ date, bodyFat });
}

export function upsertMuscleMassEntry(date: string, muscleMass: number): Promise<void> {
  return upsertDailyMetrics({ date, muscleMass });
}

/**
 * "Delete" clears just this metric's column for the day rather than
 * deleting the daily_metrics row, which may still hold the other metrics or
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

export async function deleteMuscleMassEntry(date: string): Promise<void> {
  const { error } = await supabase.from("daily_metrics").update({ muscle_mass: null }).eq("date", date);
  if (error) throw error;
}
