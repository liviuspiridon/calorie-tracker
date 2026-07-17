"use client";

import * as React from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { DailyTargets } from "@/features/goals/types";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

/**
 * Not part of the approved design (its "more" button is a no-op in the
 * reference) — this wires it to Balance's existing edit-targets interaction
 * since that's the one relevant options action the app already has. Chrome
 * matches the rest of Today's sheets for consistency; the fields themselves
 * are unchanged from before.
 */
export function EditTargetsSheet({
  open,
  onOpenChange,
  targets,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: DailyTargets;
  onSave: (targets: DailyTargets) => void;
}) {
  const [calories, setCalories] = React.useState(String(targets.calories));
  const [protein, setProtein] = React.useState(String(targets.protein));

  React.useEffect(() => {
    if (open) {
      setCalories(String(targets.calories));
      setProtein(String(targets.protein));
    }
  }, [open, targets]);

  function handleSave() {
    const parsedCalories = Number(calories);
    const parsedProtein = Number(protein);
    if (!Number.isFinite(parsedCalories) || parsedCalories <= 0) return;
    if (!Number.isFinite(parsedProtein) || parsedProtein <= 0) return;

    onSave({ calories: Math.round(parsedCalories), protein: Math.round(parsedProtein) });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg, borderRadius: "30px 30px 0 0" }}
        className="mx-auto w-full border-none px-[22px] pt-5 pb-7 shadow-[0_-12px_40px_-12px_rgba(20,23,15,0.3)] sm:max-w-sm"
      >
        <SheetTitle className="text-[15px] font-bold" style={{ color: TODAY.ink }}>
          Daily targets
        </SheetTitle>
        <p className="mt-1 text-[13px]" style={{ color: TODAY.ink45 }}>
          What being on track is measured against.
        </p>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="target-calories"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Calories
            </label>
            <input
              id="target-calories"
              type="number"
              inputMode="numeric"
              min={1}
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="target-protein"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Protein (g)
            </label>
            <input
              id="target-protein"
              type="number"
              inputMode="numeric"
              min={1}
              value={protein}
              onChange={(event) => setProtein(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="mt-2 h-12 w-full rounded-full text-sm font-bold"
            style={{ background: TODAY.ink, color: TODAY.accent }}
          >
            Save
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
