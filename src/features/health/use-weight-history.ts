"use client";

import * as React from "react";

import type { RemoteStatus } from "@/lib/supabase";

import { fetchWeightHistory, type WeightEntry } from "./data";

/**
 * Synced weight history, newest first — matches the /weight page's "recent
 * logs" list order; the chart there reverses it for chronological
 * left-to-right. Same fetch/retry contract as the other data hooks
 * (useMealLog, useDailyTargets).
 */
export function useWeightHistory(limit = 60) {
  const [entries, setEntries] = React.useState<WeightEntry[]>([]);
  const [status, setStatus] = React.useState<RemoteStatus>("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchWeightHistory(limit).then(
      (result) => {
        if (cancelled) return;
        setEntries(result);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load weight history", error);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [limit, attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  return { entries, status, retry };
}
