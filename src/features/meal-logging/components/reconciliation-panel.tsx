"use client";

import { XIcon } from "lucide-react";

import { TODAY } from "@/lib/today-theme";

import type { MealItem, ReconciliationSuggestion } from "../types";

/**
 * Plate-photo discrepancy suggestions — proposals only, never auto-applied.
 * Each card is resolved independently: Apply calls back to the same
 * grams-setter the review step's slider already uses (no new mutation
 * path), Dismiss just drops that one card.
 */
export function ReconciliationPanel({
  suggestions,
  items,
  onAccept,
  onDismiss,
}: {
  suggestions: ReconciliationSuggestion[];
  items: MealItem[];
  onAccept: (suggestion: ReconciliationSuggestion) => void;
  onDismiss: (suggestion: ReconciliationSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => {
        const item = items[suggestion.targetIndex];
        if (!item) return null;
        return (
          <div
            key={`${suggestion.targetIndex}-${suggestion.suggestedGrams}`}
            className="rounded-2xl px-4 py-3"
            style={{ background: TODAY.chip2 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold" style={{ color: TODAY.ink }}>
                  {item.description}
                </p>
                <p className="mt-0.5 text-[12px] font-medium" style={{ color: TODAY.ink45 }}>
                  {suggestion.issue}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(suggestion)}
                aria-label="Dismiss suggestion"
                className="flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: TODAY.bg, color: TODAY.ink45 }}
              >
                <XIcon className="size-3" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[12px] font-medium tabular-nums" style={{ color: TODAY.ink40 }}>
                {item.grams}
                {item.unit || "g"} → {suggestion.suggestedGrams}
                {item.unit || "g"}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => onAccept(suggestion)}
                className="rounded-full px-3.5 py-1.5 text-[12px] font-bold"
                style={{ background: TODAY.ink, color: TODAY.accent }}
              >
                Apply
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
