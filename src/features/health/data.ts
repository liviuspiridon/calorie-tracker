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
