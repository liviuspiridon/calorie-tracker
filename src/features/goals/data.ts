import { supabase } from "@/lib/supabase";

import { calorieTargetFrom, type DailyTargets } from "./types";

/** Single-user app: the one targets row lives at a well-known id. */
const TARGETS_ROW_ID = 1;

/** Null when the row doesn't exist yet — caller falls back to defaults. */
export async function fetchDailyTargets(): Promise<DailyTargets | null> {
  const { data, error } = await supabase
    .from("daily_targets")
    .select("bmr, calorie_deficit, protein, fiber, height_cm")
    .eq("id", TARGETS_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    bmr: data.bmr,
    calorieDeficit: data.calorie_deficit,
    protein: data.protein,
    fiber: data.fiber,
    heightCm: data.height_cm,
  };
}

/**
 * Upsert rather than plain update so the first save creates the row. Also
 * writes the derived `calories` column so it never drifts out of sync with
 * bmr/calorie_deficit for anything that still reads it directly.
 */
export async function updateDailyTargets(targets: DailyTargets): Promise<void> {
  const { error } = await supabase.from("daily_targets").upsert({
    id: TARGETS_ROW_ID,
    bmr: targets.bmr,
    calorie_deficit: targets.calorieDeficit,
    calories: calorieTargetFrom(targets),
    protein: targets.protein,
    fiber: targets.fiber,
    height_cm: targets.heightCm,
  });
  if (error) throw error;
}
