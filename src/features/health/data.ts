import { supabase } from "@/lib/supabase";

/** One day's synced Apple Health metrics. */
export interface DailyMetrics {
  date: string;
  activeCalories: number;
  weight: number | null;
}

/** Row shape of the `daily_metrics` table — see supabase/schema.sql. */
interface DailyMetricsRow {
  date: string;
  active_calories: number | null;
  weight: number | null;
}

/** Null when nothing has been synced for that day. Throws on real errors —
 * callers that can live without metrics (the dashboard) soft-catch. */
export async function fetchDailyMetrics(date: string): Promise<DailyMetrics | null> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, active_calories, weight")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as DailyMetricsRow;
  return {
    date: row.date,
    activeCalories: row.active_calories ?? 0,
    weight: row.weight,
  };
}

/** Upsert keyed on the unique date column — one row per calendar day. */
export async function upsertDailyMetrics(metrics: {
  date: string;
  activeCalories: number;
  weight: number;
}): Promise<void> {
  const { error } = await supabase.from("daily_metrics").upsert(
    {
      date: metrics.date,
      active_calories: metrics.activeCalories,
      weight: metrics.weight,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "date" },
  );
  if (error) throw error;
}

/** One synced weight log, in kilograms. */
export interface WeightEntry {
  date: string;
  weight: number;
}

/**
 * Weight history, most recent first — rows with no weight synced that day
 * are excluded rather than shown as a gap or zero.
 */
export async function fetchWeightHistory(limit = 60): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, weight")
    .not("weight", "is", null)
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as { date: string; weight: number }[]).map((row) => ({
    date: row.date,
    weight: row.weight,
  }));
}
