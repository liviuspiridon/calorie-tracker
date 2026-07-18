"use client";

import * as React from "react";

import { fetchDailyMetrics, type DailyMetrics } from "./data";

/**
 * Metrics for one day, refetched when the date key changes. Deliberately
 * soft-failing: metrics are enhancement data (an activity bonus on the
 * budget), so an error — including the daily_metrics table not existing
 * yet — degrades to "no metrics" with a console warning instead of taking
 * the dashboard down. Also deliberately not part of the dashboard's reveal
 * gate: arriving a beat late just animates the meter, it doesn't block.
 */
export function useDailyMetrics(date: string): DailyMetrics | null {
  const [metrics, setMetrics] = React.useState<DailyMetrics | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setMetrics(null);
    fetchDailyMetrics(date).then(
      (result) => {
        if (!cancelled) setMetrics(result);
      },
      (error) => {
        console.warn("daily_metrics unavailable — budget uses base target only", error);
        if (!cancelled) setMetrics(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [date]);

  return metrics;
}
