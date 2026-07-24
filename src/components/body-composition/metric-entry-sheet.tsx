"use client";

import * as React from "react";
import { Trash2Icon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { BodyMetricEntry } from "@/features/health/data";
import { formatLocalDate } from "@/lib/utils";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

const DANGER = "#B3453A";

/**
 * Add/edit sheet shared by the Weight and Body Fat tabs — `entry` null means
 * "new entry" (date defaults to today, editable for retroactive logging);
 * set means "edit", which also exposes delete via the same in-sheet
 * confirmation swap MealDetailSheet uses.
 *
 * Editing an entry's date to a day that already has a value for this metric
 * doesn't error — the caller's onSave upserts the new date and clears the
 * old one, so it behaves like moving the log rather than duplicating it.
 */
export function MetricEntrySheet({
  open,
  onOpenChange,
  title,
  unit,
  step = 0.1,
  entry,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  unit: string;
  step?: number;
  entry: BodyMetricEntry | null;
  onSave: (date: string, value: number, previousDate: string | null) => void;
  onDelete: (date: string) => void;
}) {
  const [date, setDate] = React.useState("");
  const [value, setValue] = React.useState("");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDate(entry?.date ?? formatLocalDate(new Date()));
    setValue(entry ? String(entry.value) : "");
    setConfirmingDelete(false);
  }, [open, entry]);

  const parsedValue = Number(value);
  const canSave = Boolean(date) && Number.isFinite(parsedValue) && parsedValue > 0;

  function handleSave() {
    if (!canSave) return;
    onSave(date, parsedValue, entry?.date ?? null);
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
        <div
          className="mx-auto mb-1 h-[5px] w-[38px] rounded-full"
          style={{ background: TODAY.handleBar }}
          aria-hidden="true"
        />

        {confirmingDelete && entry ? (
          <div className="mt-4">
            <p className="text-[16px] font-bold" style={{ color: TODAY.ink }}>
              Delete this entry?
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: TODAY.ink45 }}>
              {formatLogDate(entry.date)} — this can&apos;t be undone.
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
                  onDelete(entry.date);
                  onOpenChange(false);
                }}
                className="h-11 flex-1 rounded-xl text-sm font-semibold"
                style={{ background: DANGER, color: TODAY.bg }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between">
              <SheetTitle className="text-[15px] font-bold" style={{ color: TODAY.ink }}>
                {title}
              </SheetTitle>
              {entry && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete entry"
                  className="flex size-8 items-center justify-center rounded-full"
                  style={{ background: TODAY.chip2, color: DANGER }}
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="entry-date"
                  className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: TODAY.ink45 }}
                >
                  Date
                </label>
                <input
                  id="entry-date"
                  type="date"
                  max={formatLocalDate(new Date())}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
                  style={{ background: TODAY.chip2, color: TODAY.ink }}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="entry-value"
                  className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: TODAY.ink45 }}
                >
                  {unit}
                </label>
                <input
                  id="entry-value"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={step}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  autoFocus
                  className="w-full rounded-2xl px-4 py-3 text-[15px] font-semibold outline-none"
                  style={{ background: TODAY.chip2, color: TODAY.ink }}
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="mt-2 h-12 w-full rounded-full text-sm font-bold disabled:opacity-40"
                style={{ background: TODAY.ink, color: TODAY.accent }}
              >
                Save
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Parses "YYYY-MM-DD" as local calendar-date components — `new
 *  Date("YYYY-MM-DD")` parses as UTC midnight, which prints as the wrong
 *  day in timezones behind UTC. */
function formatLogDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}
