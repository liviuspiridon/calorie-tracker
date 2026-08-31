"use client";

import * as React from "react";

import { fetchDailyMetrics, type DailyMetrics } from "./data";

/**
 * Metrics for one day, refetched when the date key changes and whenever the
 * page comes back to the foreground.
 *
 * That second trigger matters because this is the one piece of dashboard
 * state written from *outside* the app: meals change only through the UI
 * that already holds them, but active calories arrive from the iOS Shortcut
 * straight into Supabase. Fetching once on mount left a session opened
 * before the day's sync — or a phone returning to a backgrounded tab —
 * showing the stale value forever, which reads as "Burned: 0" long after
 * the shortcut has reported hundreds.
 *
 * Deliberately soft-failing: metrics are enhancement data (an activity
 * bonus on the budget), so an error — including the daily_metrics table not
 * existing yet — degrades to "no metrics" with a console warning instead of
 * taking the dashboard down. Also deliberately not part of the dashboard's
 * reveal gate: arriving a beat late just animates the meter, it doesn't
 * block.
 */
export function useDailyMetrics(date: string): DailyMetrics | null {
  const [metrics, setMetrics] = React.useState<DailyMetrics | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    function load() {
      fetchDailyMetrics(date).then(
        (result) => {
          if (!cancelled) setMetrics(result);
        },
        (error) => {
          console.warn("daily_metrics unavailable — budget uses base target only", error);
          if (!cancelled) setMetrics(null);
        },
      );
    }

    // Only the date switch clears first: a foreground refetch keeps the
    // current value on screen rather than blinking through empty.
    setMetrics(null);
    load();

    function handleVisibility() {
      if (document.visibilityState === "visible") load();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", load);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", load);
    };
  }, [date]);

  return metrics;
}
