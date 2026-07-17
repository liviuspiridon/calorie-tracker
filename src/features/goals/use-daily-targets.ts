"use client";

import * as React from "react";

import type { RemoteStatus } from "@/lib/supabase";

import { fetchDailyTargets, updateDailyTargets } from "./data";
import { DEFAULT_DAILY_TARGETS, type DailyTargets } from "./types";

/**
 * Daily targets, backed by the single daily_targets row in Supabase.
 * Renders with defaults while loading; a missing row also falls back to
 * defaults (the first save creates it). Same write-then-update contract as
 * useMealLog: local state changes only after the request succeeds.
 */
export function useDailyTargets() {
  const [targets, setTargets] = React.useState<DailyTargets>(DEFAULT_DAILY_TARGETS);
  const [status, setStatus] = React.useState<RemoteStatus>("loading");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchDailyTargets().then(
      (stored) => {
        if (cancelled) return;
        if (stored) setTargets(stored);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        console.error("Failed to load daily targets", error);
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  const saveTargets = React.useCallback(async (next: DailyTargets) => {
    await updateDailyTargets(next);
    setTargets(next);
  }, []);

  return { targets, status, retry, saveTargets };
}
