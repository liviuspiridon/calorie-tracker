"use client";

import * as React from "react";

import type { RemoteStatus } from "@/lib/supabase";

import { deleteMealById, fetchMeals, upsertMeal } from "./data";
import type { MealLogEntry } from "./types";

/**
 * The meal log, backed by Supabase. Fetches once on mount; mutators write to
 * the database first and only update local state after the request succeeds,
 * so the UI never shows state the database doesn't have.
 */
export function useMealLog() {
  const [meals, setMeals] = React.useState<MealLogEntry[]>([]);
  const [status, setStatus] = React.useState<RemoteStatus>("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchMeals().then(
      (rows) => {
        if (cancelled) return;
        setMeals(rows);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load meals", error);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  /** Upsert: same id updates in place (edits), new id prepends (new meals, "log again"). */
  const saveMeal = React.useCallback(async (entry: MealLogEntry) => {
    await upsertMeal(entry);
    setMeals((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      if (exists) return prev.map((m) => (m.id === entry.id ? entry : m));
      return [entry, ...prev];
    });
  }, []);

  const deleteMeal = React.useCallback(async (id: string) => {
    await deleteMealById(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { meals, status, retry, saveMeal, deleteMeal };
}
