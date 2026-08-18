"use client";

import * as React from "react";

import type { RemoteStatus } from "@/lib/supabase";

import {
  deleteBodyFatEntry,
  deleteWeightEntry,
  fetchBodyFatHistory,
  fetchWeightHistory,
  upsertBodyFatEntry,
  upsertWeightEntry,
  type BodyMetricEntry,
} from "./data";

/**
 * Shared fetch/mutate boilerplate for a body-metric history list — newest
 * first, matching the Body Composition hub's "recent logs" order (the trend
 * chart there reverses it for chronological left-to-right). Mutators write
 * to the database first and only update local state after the request
 * succeeds — same contract as useMealLog/useDailyTargets.
 */
function useMetricHistory(
  fetcher: (limit: number) => Promise<BodyMetricEntry[]>,
  upsert: (date: string, value: number) => Promise<void>,
  del: (date: string) => Promise<void>,
  limit: number,
) {
  const [entries, setEntries] = React.useState<BodyMetricEntry[]>([]);
  const [status, setStatus] = React.useState<RemoteStatus>("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetcher(limit).then(
      (result) => {
        if (cancelled) return;
        setEntries(result);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load body metric history", error);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
    // `fetcher` is one of the module-level fetch* functions in ./data —
    // stable across renders, so it's intentionally left out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  /**
   * `previousDate` is set when editing an existing entry to a new date —
   * the old date's value is cleared so the log moves instead of duplicating.
   */
  const saveEntry = React.useCallback(
    async (date: string, value: number, previousDate: string | null) => {
      await upsert(date, value);
      if (previousDate && previousDate !== date) await del(previousDate);
      setEntries((prev) => {
        const withoutStale = prev.filter((e) => e.date !== date && e.date !== previousDate);
        return [...withoutStale, { date, value }].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
    },
    [upsert, del],
  );

  const deleteEntry = React.useCallback(
    async (date: string) => {
      await del(date);
      setEntries((prev) => prev.filter((e) => e.date !== date));
    },
    [del],
  );

  return { entries, status, retry, saveEntry, deleteEntry };
}

export function useWeightHistory(limit = 60) {
  return useMetricHistory(fetchWeightHistory, upsertWeightEntry, deleteWeightEntry, limit);
}

export function useBodyFatHistory(limit = 60) {
  return useMetricHistory(fetchBodyFatHistory, upsertBodyFatEntry, deleteBodyFatEntry, limit);
}
