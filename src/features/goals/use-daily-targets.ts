"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

import { DEFAULT_DAILY_TARGETS, type DailyTargets } from "./types";

export function useDailyTargets() {
  return useLocalStorage<DailyTargets>("balance:daily-targets", DEFAULT_DAILY_TARGETS);
}
