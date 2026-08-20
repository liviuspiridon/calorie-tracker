"use client";

import { XIcon } from "lucide-react";

import { TODAY } from "@/lib/today-theme";

import { computeItemMacros } from "../types";
import type { MealItem } from "../types";

/** One logged ingredient — shared by the building-step feed and the review step's editable list. */
export function ItemCard({
  item,
  onDelete,
  onGramsChange,
}: {
  item: MealItem;
  onDelete: () => void;
  /** Rendering the grams number+slider controls is opt-in — the building-step feed keeps items compact and only edits weight in review. */
  onGramsChange?: (grams: number) => void;
}) {
  const macros = computeItemMacros(item);

  return (
    <div className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ background: TODAY.chip2 }}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold" style={{ color: TODAY.ink }}>
          {item.description}
        </p>
        {onGramsChange ? (
          <div className="mt-2.5 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={1000}
              step={5}
              value={Math.min(item.grams, 1000)}
              onChange={(event) => onGramsChange(Number(event.target.value))}
              className="h-1 flex-1"
              style={{ accentColor: TODAY.ink }}
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={item.grams}
                onChange={(event) => onGramsChange(Math.max(1, Number(event.target.value) || 1))}
                className="w-14 rounded-lg px-2 py-1 text-right text-[13px] font-semibold outline-none"
                style={{ background: TODAY.bg, color: TODAY.ink }}
              />
              <span className="text-[12px] font-medium" style={{ color: TODAY.ink40 }}>
                {item.unit || "g"}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-[12px] font-medium" style={{ color: TODAY.ink45 }}>
            {item.grams}
            {item.unit || "g"}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[14px] font-bold tabular-nums" style={{ color: TODAY.ink }}>
          {macros.calories} kcal
        </p>
        <p className="mt-0.5 text-[10.5px] font-medium tabular-nums" style={{ color: TODAY.ink40 }}>
          {macros.protein}P · {macros.carbs}C · {macros.fat}F · {macros.fiber}Fi
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${item.description}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-full"
        style={{ background: TODAY.bg, color: TODAY.ink45 }}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
