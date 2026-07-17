"use client";

import * as React from "react";
import { EllipsisIcon, PencilIcon, RepeatIcon, Trash2Icon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { MealLogEntry } from "@/features/meal-logging/types";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

const DANGER = "#B3453A";

/**
 * The approved design also shows an "Ingredients" list per meal.
 * MealAnalysis has no ingredients field and the AI pipeline doesn't
 * estimate them — rather than fabricate one, this sheet shows only what's
 * real: description, calories, and the protein/carbs/fat already captured.
 *
 * The overflow menu isn't part of the approved design either — it's a
 * separate, requested addition — so it's kept deliberately minimal: reuses
 * the existing DropdownMenu primitive (restyled to match) and the delete
 * confirmation swaps into this same sheet's body rather than introducing a
 * new dependency or stacking a second sheet on top.
 */
export function MealDetailSheet({
  meal,
  open,
  onOpenChange,
  onEdit,
  onLogAgain,
  onDelete,
}: {
  meal: MealLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (meal: MealLogEntry) => void;
  onLogAgain: (meal: MealLogEntry) => void;
  onDelete: (meal: MealLogEntry) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) setConfirmingDelete(false);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg, borderRadius: "32px 32px 0 0" }}
        className="mx-auto w-full border-none px-6 pt-3.5 pb-7 shadow-[0_-14px_46px_-14px_rgba(20,23,15,0.34)] sm:max-w-lg"
      >
        <div
          className="mx-auto mb-5 h-[5px] w-[38px] rounded-full"
          style={{ background: TODAY.handleBar }}
          aria-hidden="true"
        />
        {meal && confirmingDelete && (
          <div>
            <p className="text-[16px] font-bold" style={{ color: TODAY.ink }}>
              Delete this meal?
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: TODAY.ink45 }}>
              {meal.analysis.description} — this can&apos;t be undone.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
                style={{ background: TODAY.chip2, color: TODAY.ink }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(meal);
                  onOpenChange(false);
                }}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
                style={{ background: DANGER, color: TODAY.bg }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {meal && !confirmingDelete && (
          <>
            <div className="flex items-start justify-between gap-3">
              <SheetTitle
                className="block min-w-0 flex-1 text-[21px] leading-[1.25] font-extrabold tracking-[-0.02em]"
                style={{ color: TODAY.ink }}
              >
                {meal.analysis.description}
              </SheetTitle>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Meal options"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: TODAY.chip2, color: TODAY.ink }}
                  >
                    <EllipsisIcon className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{ ...TODAY_FONT, background: TODAY.bg }}
                  className="min-w-[10rem] rounded-2xl border-none p-1.5 shadow-[0_10px_30px_-10px_rgba(20,23,15,0.3)]"
                >
                  <DropdownMenuItem
                    onSelect={() => {
                      onOpenChange(false);
                      onEdit(meal);
                    }}
                    style={{ color: TODAY.ink }}
                    className="cursor-pointer gap-2.5 rounded-xl py-2.5 text-[13.5px] font-medium focus:bg-[rgba(240,237,229,0.7)]"
                  >
                    <PencilIcon className="size-4" style={{ color: TODAY.ink45 }} />
                    Edit meal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      onLogAgain(meal);
                      onOpenChange(false);
                    }}
                    style={{ color: TODAY.ink }}
                    className="cursor-pointer gap-2.5 rounded-xl py-2.5 text-[13.5px] font-medium focus:bg-[rgba(240,237,229,0.7)]"
                  >
                    <RepeatIcon className="size-4" style={{ color: TODAY.ink45 }} />
                    Log again today
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{ background: TODAY.hairlineStrong }} />
                  <DropdownMenuItem
                    onSelect={() => setConfirmingDelete(true)}
                    style={{ color: DANGER }}
                    className="cursor-pointer gap-2.5 rounded-xl py-2.5 text-[13.5px] font-medium focus:bg-[rgba(179,69,58,0.08)]"
                  >
                    <Trash2Icon className="size-4" />
                    Delete meal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums"
                style={{ color: TODAY.ink }}
              >
                {meal.analysis.calories}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: TODAY.ink40 }}>
                kcal
              </span>
            </div>

            <div
              className="mt-[22px] flex"
              style={{
                borderTop: `1px solid ${TODAY.hairlineStrong}`,
                borderBottom: `1px solid ${TODAY.hairlineStrong}`,
              }}
            >
              <MacroTile label="Protein" value={meal.analysis.protein} />
              <div className="w-px" style={{ background: TODAY.hairlineStrong }} />
              <MacroTile label="Carbs" value={meal.analysis.carbs} />
              <div className="w-px" style={{ background: TODAY.hairlineStrong }} />
              <MacroTile label="Fat" value={meal.analysis.fat} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MacroTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 py-3.5 text-center">
      <div className="text-lg font-bold tabular-nums" style={{ color: TODAY.ink }}>
        {value}g
      </div>
      <div
        className="font-mono text-[9.5px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: TODAY.ink40 }}
      >
        {label}
      </div>
    </div>
  );
}
