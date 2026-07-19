"use client";

import * as React from "react";

import type { FocusInsight, FocusInsightRequest } from "./types";

export type FocusInsightStatus = "idle" | "loading" | "ready" | "error";

/**
 * Fetches the post-log reflection for a given payload. `payload` is null
 * when there's nothing to reflect on (before any meal is logged this
 * session, or once the modal has closed) — the effect resets to "idle"
 * rather than fetching.
 */
export function useFocusInsight(payload: FocusInsightRequest | null) {
  const [insight, setInsight] = React.useState<FocusInsight | null>(null);
  const [status, setStatus] = React.useState<FocusInsightStatus>("idle");

  React.useEffect(() => {
    if (!payload) {
      setInsight(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setInsight(null);

    fetch("/api/focus-insight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Focus insight request failed: ${response.status}`);
        return (await response.json()) as FocusInsight;
      })
      .then((result) => {
        if (cancelled) return;
        setInsight(result);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to load focus insight", error);
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  return { insight, status };
}
