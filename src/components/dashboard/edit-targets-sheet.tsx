"use client";

import * as React from "react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { calorieTargetFrom, type DailyTargets } from "@/features/goals/types";
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
  const [bmr, setBmr] = React.useState(String(targets.bmr));
  const [calorieDeficit, setCalorieDeficit] = React.useState(String(targets.calorieDeficit));
  const [protein, setProtein] = React.useState(String(targets.protein));
  const [fiber, setFiber] = React.useState(String(targets.fiber));
  const [heightCm, setHeightCm] = React.useState(String(targets.heightCm));

  React.useEffect(() => {
    if (open) {
      setBmr(String(targets.bmr));
      setCalorieDeficit(String(targets.calorieDeficit));
      setProtein(String(targets.protein));
      setFiber(String(targets.fiber));
      setHeightCm(String(targets.heightCm));
    }
  }, [open, targets]);

  const parsedBmr = Number(bmr);
  const parsedDeficit = Number(calorieDeficit);
  const calculatedTarget =
    Number.isFinite(parsedBmr) && Number.isFinite(parsedDeficit)
      ? Math.round(calorieTargetFrom({ bmr: parsedBmr, calorieDeficit: parsedDeficit }))
      : null;

  function handleSave() {
    const parsedProtein = Number(protein);
    const parsedFiber = Number(fiber);
    const parsedHeight = Number(heightCm);
    if (!Number.isFinite(parsedBmr) || parsedBmr <= 0) return;
    if (!Number.isFinite(parsedDeficit)) return;
    if (!Number.isFinite(parsedProtein) || parsedProtein <= 0) return;
    if (!Number.isFinite(parsedFiber) || parsedFiber <= 0) return;
    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0) return;

    onSave({
      bmr: Math.round(parsedBmr),
      calorieDeficit: Math.round(parsedDeficit),
      protein: Math.round(parsedProtein),
      fiber: Math.round(parsedFiber),
      heightCm: Math.round(parsedHeight),
    });
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
              htmlFor="target-bmr"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Resting energy (BMR)
            </label>
            <input
              id="target-bmr"
              type="number"
              inputMode="numeric"
              min={1}
              value={bmr}
              onChange={(event) => setBmr(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="target-deficit"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Daily target deficit
            </label>
            <input
              id="target-deficit"
              type="number"
              inputMode="numeric"
              value={calorieDeficit}
              onChange={(event) => setCalorieDeficit(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
          </div>
          {calculatedTarget !== null && (
            <p className="px-1 text-[13px] font-medium" style={{ color: TODAY.ink45 }}>
              Calculated daily target:{" "}
              <span className="font-semibold" style={{ color: TODAY.ink }}>
                {calculatedTarget.toLocaleString()} kcal
              </span>
            </p>
          )}
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
          <div className="space-y-2">
            <label
              htmlFor="target-fiber"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Daily fiber target (g)
            </label>
            <input
              id="target-fiber"
              type="number"
              inputMode="numeric"
              min={1}
              value={fiber}
              onChange={(event) => setFiber(event.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="target-height"
              className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              Height (cm)
            </label>
            <input
              id="target-height"
              type="number"
              inputMode="numeric"
              min={1}
              value={heightCm}
              onChange={(event) => setHeightCm(event.target.value)}
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
