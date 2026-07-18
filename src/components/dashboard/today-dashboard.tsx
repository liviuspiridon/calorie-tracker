"use client";

import * as React from "react";
import { ChevronDownIcon, EllipsisIcon } from "lucide-react";

import { computeDayStatus, getNextAction } from "@/features/goals/lib/daily-progress";
import type { DailyTargets } from "@/features/goals/types";
import { useDailyTargets } from "@/features/goals/use-daily-targets";
import { useDailyMetrics } from "@/features/health/use-daily-metrics";
import { LogMealSheet } from "@/features/meal-logging/components/log-meal-sheet";
import type { MealLogEntry } from "@/features/meal-logging/types";
import { useMealLog } from "@/features/meal-logging/use-meal-log";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";
import { cn, formatHeaderDate, formatLocalDate, isSameDay } from "@/lib/utils";

import { CalendarSheet } from "./calendar-sheet";
import { DailyBudgetCard } from "./daily-budget-card";
import { EditTargetsSheet } from "./edit-targets-sheet";
import { MealComposerBar } from "./meal-composer-bar";
import { MealDetailSheet } from "./meal-detail-sheet";
import { NextAction } from "./next-action";
import { TodaysMeals } from "./todays-meals";

const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export function TodayDashboard() {
  const { targets, status: targetsStatus, retry: retryTargets, saveTargets } = useDailyTargets();
  const { meals, status: mealsStatus, retry: retryMeals, saveMeal, deleteMeal } = useMealLog();
  const [logMealOpen, setLogMealOpen] = React.useState(false);
  const [editTargetsOpen, setEditTargetsOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [mealDetailOpen, setMealDetailOpen] = React.useState(false);
  const [activeMeal, setActiveMeal] = React.useState<MealLogEntry | null>(null);
  const [editingMeal, setEditingMeal] = React.useState<MealLogEntry | null>(null);
  const [revealed, setRevealed] = React.useState(false);

  const now = new Date();
  const [selectedDate, setSelectedDate] = React.useState(now);
  const isViewingToday = isSameDay(selectedDate, now);

  const isLoading = targetsStatus === "loading" || mealsStatus === "loading";
  const loadFailed = targetsStatus === "error" || mealsStatus === "error";

  // The staggered entrance doubles as the loading state: content stays held
  // (opacity-0) until real data has arrived, then reveals in one pass — no
  // skeletons, and no "Nothing logged" flash before the fetch resolves.
  React.useEffect(() => {
    if (isLoading || loadFailed) return;
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, loadFailed]);

  const selectedDateMeals = React.useMemo(
    () => meals.filter((meal) => isSameDay(new Date(meal.loggedAt), selectedDate)),
    [meals, selectedDate],
  );

  const mealsHeading = isViewingToday
    ? "Today's meals"
    : `Meals on ${selectedDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;

  const caloriesConsumed = selectedDateMeals.reduce((sum, meal) => sum + meal.analysis.calories, 0);
  const proteinConsumed = selectedDateMeals.reduce((sum, meal) => sum + meal.analysis.protein, 0);

  // Apple Health metrics for the viewed day (synced via /api/metrics).
  // Activity raises the day's calorie budget: base + active - consumed.
  const metrics = useDailyMetrics(formatLocalDate(selectedDate));
  const activeCalories = Math.round(metrics?.activeCalories ?? 0);
  const effectiveCalorieTarget = targets.calories + activeCalories;

  // computeDayStatus/getNextAction reason about pacing through a day still
  // in progress (time-of-day fraction) — not meaningful for a past,
  // completed date, so they only run while viewing today.
  const nextAction = isViewingToday
    ? getNextAction({
        status: computeDayStatus({ caloriesConsumed, calorieTarget: effectiveCalorieTarget, now }),
        mealsLoggedToday: selectedDateMeals.length,
        caloriesRemaining: Math.max(0, effectiveCalorieTarget - caloriesConsumed),
        proteinRemaining: Math.max(0, targets.protein - proteinConsumed),
      })
    : null;

  // Mutators write to Supabase first and update local state on success (see
  // useMealLog). A failed write currently only logs — the sheet has already
  // closed by then and there's no toast surface yet.
  function handleSaveMeal(entry: MealLogEntry) {
    saveMeal(entry).catch((error) => console.error("Failed to save meal", error));
  }

  function handleSaveTargets(next: DailyTargets) {
    saveTargets(next).catch((error) => console.error("Failed to save targets", error));
  }

  function handleOpenMeal(meal: MealLogEntry) {
    setActiveMeal(meal);
    setMealDetailOpen(true);
  }

  function handleLogMealOpenChange(open: boolean) {
    setLogMealOpen(open);
    if (!open) setEditingMeal(null);
  }

  function handleEditMeal(meal: MealLogEntry) {
    setEditingMeal(meal);
    setLogMealOpen(true);
  }

  function handleLogAgain(meal: MealLogEntry) {
    handleSaveMeal({
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      analysis: meal.analysis,
      note: meal.note,
    });
    setSelectedDate(now);
  }

  function handleDeleteMeal(meal: MealLogEntry) {
    deleteMeal(meal.id).catch((error) => console.error("Failed to delete meal", error));
  }

  function handleRetryLoad() {
    if (mealsStatus === "error") retryMeals();
    if (targetsStatus === "error") retryTargets();
  }

  /** See today-dashboard's earlier note in the previous design pass re: not merging onto <Button>. */
  function revealProps(delayMs: number, extraClassName?: string) {
    return {
      className: cn(
        "transition-[opacity,transform] duration-500",
        EASE,
        revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        extraClassName,
      ),
      style: { transitionDelay: revealed ? `${delayMs}ms` : "0ms" } as React.CSSProperties,
    };
  }

  return (
    <div
      style={{ ...TODAY_FONT, background: TODAY.bg }}
      className="min-h-dvh px-7 pt-[22px] pb-[104px]"
    >
      <div className="mx-auto flex max-w-lg flex-col">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="flex items-center gap-2 py-0.5"
          >
            <span
              className="text-[19px] font-extrabold tracking-[-0.02em]"
              style={{ color: TODAY.ink }}
            >
              {formatHeaderDate(selectedDate, now)}
            </span>
            <span
              className="flex size-[22px] items-center justify-center rounded-full"
              style={{ background: TODAY.chip, color: TODAY.ink55 }}
            >
              <ChevronDownIcon className="size-3" strokeWidth={3} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setEditTargetsOpen(true)}
            aria-label="More options"
            className="flex size-[38px] items-center justify-center rounded-full"
            style={{ background: TODAY.chip }}
          >
            <EllipsisIcon className="size-[18px]" style={{ color: TODAY.ink }} />
          </button>
        </header>

        {loadFailed ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <p className="text-sm font-bold" style={{ color: TODAY.ink }}>
              Couldn&apos;t load your data
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: TODAY.ink45 }}>
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="mt-5 h-11 rounded-full px-6 text-sm font-bold"
              style={{ background: TODAY.ink, color: TODAY.accent }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div {...revealProps(0)}>
              <DailyBudgetCard
                caloriesConsumed={caloriesConsumed}
                calorieTarget={targets.calories}
                activeCalories={activeCalories}
                proteinConsumed={proteinConsumed}
                proteinTarget={targets.protein}
              />
            </div>

            {nextAction && (
              <div {...revealProps(80, "mt-6 px-0.5")}>
                <NextAction message={nextAction} />
              </div>
            )}

            <div {...revealProps(110, "my-6")}>
              <div className="h-px" style={{ background: TODAY.hairlineSoft }} />
            </div>

            <div {...revealProps(140)}>
              <TodaysMeals
                heading={mealsHeading}
                meals={selectedDateMeals}
                onOpenMeal={handleOpenMeal}
              />
            </div>
          </>
        )}
      </div>

      <MealComposerBar onOpen={() => setLogMealOpen(true)} />

      <LogMealSheet
        open={logMealOpen}
        onOpenChange={handleLogMealOpenChange}
        onSave={handleSaveMeal}
        editingMeal={editingMeal}
      />
      <EditTargetsSheet
        open={editTargetsOpen}
        onOpenChange={setEditTargetsOpen}
        targets={targets}
        onSave={handleSaveTargets}
      />
      <CalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selected={selectedDate}
        today={now}
        onSelect={(date) => {
          setSelectedDate(date);
          setCalendarOpen(false);
        }}
        meals={meals}
        calorieTarget={targets.calories}
      />
      <MealDetailSheet
        meal={activeMeal}
        open={mealDetailOpen}
        onOpenChange={setMealDetailOpen}
        onEdit={handleEditMeal}
        onLogAgain={handleLogAgain}
        onDelete={handleDeleteMeal}
      />
    </div>
  );
}
