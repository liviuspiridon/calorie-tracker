"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { classifyDayLog, type DayLogLevel } from "@/features/goals/lib/daily-progress";
import type { MealLogEntry } from "@/features/meal-logging/types";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";
import { isSameDay } from "@/lib/utils";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LEVEL_CLASSES: Record<DayLogLevel, string> = {
  "under-target": "bg-[#EAF5EA] text-[#1E4620]",
  "at-target": "bg-[#FEF9E5] text-[#5C4010]",
  "over-target": "bg-[#FDF0ED] text-[#601D13]",
};

function isAfterDay(a: Date, b: Date): boolean {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() > b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() > b.getMonth();
  return a.getDate() > b.getDate();
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildWeeks(viewYear: number, viewMonth: number): (Date | null)[][] {
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 Sun .. 6 Sat
  const offset = (firstWeekday + 6) % 7; // Monday-start
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Picking a date updates `selectedDate` on the parent, which drives the
 * whole Today screen (meals list, calorie/protein totals) — this sheet
 * itself only owns which month is in view and closes on select.
 */
export function CalendarSheet({
  open,
  onOpenChange,
  selected,
  today,
  onSelect,
  meals,
  calorieTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Date;
  today: Date;
  onSelect: (date: Date) => void;
  meals: MealLogEntry[];
  calorieTarget: number;
}) {
  const [viewYear, setViewYear] = React.useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selected.getMonth());

  React.useEffect(() => {
    if (open) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [open, selected]);

  const weeks = React.useMemo(() => buildWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const dailyTotals = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const meal of meals) {
      const key = dayKey(new Date(meal.loggedAt));
      totals.set(key, (totals.get(key) ?? 0) + meal.analysis.calories);
    }
    return totals;
  }, [meals]);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg, borderRadius: "32px 32px 0 0" }}
        className="mx-auto w-full border-none px-[22px] pt-3.5 pb-7 shadow-[0_-14px_46px_-14px_rgba(20,23,15,0.34)] sm:max-w-lg"
      >
        <div
          className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-full"
          style={{ background: TODAY.handleBar }}
          aria-hidden="true"
        />
        <div className="mb-[18px] flex items-center justify-between">
          <span
            className="text-lg font-extrabold tracking-[-0.01em]"
            style={{ color: TODAY.ink }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label="Previous month"
              className="flex size-[38px] items-center justify-center rounded-full"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label="Next month"
              className="flex size-[38px] items-center justify-center rounded-full"
              style={{ background: TODAY.chip2, color: TODAY.ink }}
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LETTERS.map((letter, index) => (
            <div
              key={index}
              className="text-center font-mono text-[10.5px] font-semibold"
              style={{ color: "rgba(20,23,15,0.35)" }}
            >
              {letter}
            </div>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {weeks.flat().map((date, index) =>
            date ? (
              <CalendarDay
                key={index}
                date={date}
                today={today}
                selected={selected}
                onSelect={onSelect}
                caloriesConsumed={dailyTotals.get(dayKey(date))}
                calorieTarget={calorieTarget}
              />
            ) : (
              <div key={index} className="mx-auto h-10 w-10" aria-hidden="true" />
            ),
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CalendarDay({
  date,
  today,
  selected,
  onSelect,
  caloriesConsumed,
  calorieTarget,
}: {
  date: Date;
  today: Date;
  selected: Date;
  onSelect: (date: Date) => void;
  /** undefined = no meals logged that day. */
  caloriesConsumed?: number;
  calorieTarget: number;
}) {
  const isFuture = isAfterDay(date, today);
  const isPast = isAfterDay(today, date);
  const isToday = isSameDay(date, today);
  const isSelected = isSameDay(date, selected);
  const hasLog = caloriesConsumed !== undefined && caloriesConsumed > 0;

  // Future days are disabled outright. Past days with nothing logged are
  // also disabled — there's no real data to color them with, and showing
  // them as plain/selectable would imply a "nothing happened" state that
  // looks identical to "not tracked," which is misleading. Today stays
  // selectable regardless — it isn't "past" until it's over.
  const isDisabled = isFuture || (isPast && !hasLog);

  // Order matters: selected always wins outright. Today is checked next,
  // deliberately *before* the pastel classification below — today never
  // gets judged against target even if it already has a log, since the
  // day isn't over yet. Only a genuinely *past*, logged day gets colored.
  let stateClasses: string;
  if (isSelected) {
    stateClasses = "bg-neutral-900 text-white";
  } else if (isToday) {
    stateClasses = "bg-transparent text-neutral-900 hover:bg-neutral-100";
  } else if (isDisabled) {
    stateClasses = "text-neutral-300 pointer-events-none bg-transparent";
  } else {
    stateClasses = DAY_LEVEL_CLASSES[classifyDayLog(caloriesConsumed!, calorieTarget)];
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onSelect(date)}
      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${stateClasses}`}
    >
      {date.getDate()}
    </button>
  );
}
