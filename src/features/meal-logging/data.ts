import { supabase } from "@/lib/supabase";
import { formatLocalDate } from "@/lib/utils";

import type { MealLogEntry } from "./types";

/**
 * Row shape of the existing `meals` table (see supabase/schema.sql). The
 * table stores only the analysis numbers plus two time columns: `created_at`
 * (full timestamp — maps to loggedAt) and `date` (denormalized local
 * YYYY-MM-DD day string). There are no confidence/note/photo columns, so
 * those MealLogEntry fields don't survive a reload — see types.ts.
 */
interface MealRow {
  id: string;
  created_at: string;
  date: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

function toEntry(row: MealRow): MealLogEntry {
  return {
    id: row.id,
    loggedAt: row.created_at,
    analysis: {
      description: row.description,
      calories: row.calories,
      protein: row.protein,
      carbs: row.carbs,
      fat: row.fat,
      fiber: row.fiber,
    },
  };
}

function toRow(entry: MealLogEntry): MealRow {
  return {
    id: entry.id,
    created_at: entry.loggedAt,
    date: formatLocalDate(new Date(entry.loggedAt)),
    description: entry.analysis.description,
    calories: entry.analysis.calories,
    protein: entry.analysis.protein,
    carbs: entry.analysis.carbs,
    fat: entry.analysis.fat,
    fiber: entry.analysis.fiber,
  };
}

export async function fetchMeals(): Promise<MealLogEntry[]> {
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as MealRow[]).map(toEntry);
}

/** Upsert: new id inserts, existing id updates in place (edit flow). */
export async function upsertMeal(entry: MealLogEntry): Promise<void> {
  const { error } = await supabase.from("meals").upsert(toRow(entry));
  if (error) throw error;
}

export async function deleteMealById(id: string): Promise<void> {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) throw error;
}
