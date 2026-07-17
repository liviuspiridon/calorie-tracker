import { supabase } from "@/lib/supabase";

import type { DailyTargets } from "./types";

/** Single-user app: the one targets row lives at a well-known id. */
const TARGETS_ROW_ID = 1;

/** Null when the row doesn't exist yet — caller falls back to defaults. */
export async function fetchDailyTargets(): Promise<DailyTargets | null> {
  const { data, error } = await supabase
    .from("daily_targets")
    .select("calories, protein")
    .eq("id", TARGETS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Upsert rather than plain update so the first save creates the row. */
export async function updateDailyTargets(targets: DailyTargets): Promise<void> {
  const { error } = await supabase
    .from("daily_targets")
    .upsert({ id: TARGETS_ROW_ID, ...targets });
  if (error) throw error;
}
