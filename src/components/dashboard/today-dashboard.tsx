"use client";

import * as React from "react";
import { PlusIcon, Settings2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { computeDayStatus, getNextAction } from "@/features/goals/lib/daily-progress";
import { useDailyTargets } from "@/features/goals/use-daily-targets";
import { LogMealSheet } from "@/features/meal-logging/components/log-meal-sheet";
import type { MealLogEntry } from "@/features/meal-logging/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn, isSameDay } from "@/lib/utils";

import { EditTargetsSheet } from "./edit-targets-sheet";
import { NextAction } from "./next-action";
import { TodayStats } from "./today-stats";
import { TodaysMeals } from "./todays-meals";

const EASE = "ease-[cubic-bezier(0.23,1,0.32,1)]";

export function TodayDashboard() {
  const [targets, setTargets] = useDailyTargets();
  const [meals, setMeals] = useLocalStorage<MealLogEntry[]>("balance:meal-log", []);
  const [logMealOpen, setLogMealOpen] = React.useState(false);
  const [editTargetsOpen, setEditTargetsOpen] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const now = new Date();
  const todaysMeals = React.useMemo(
    () => meals.filter((meal) => isSameDay(new Date(meal.loggedAt), now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meals],
  );

  const caloriesConsumed = todaysMeals.reduce((sum, meal) => sum + meal.analysis.calories, 0);
  const proteinConsumed = todaysMeals.reduce((sum, meal) => sum + meal.analysis.protein, 0);

  const status = computeDayStatus({ caloriesConsumed, calorieTarget: targets.calories, now });
  const nextAction = getNextAction({
    status,
    mealsLoggedToday: todaysMeals.length,
    caloriesRemaining: Math.max(0, targets.calories - caloriesConsumed),
    proteinRemaining: Math.max(0, targets.protein - proteinConsumed),
  });

  function handleSaveMeal(entry: MealLogEntry) {
    setMeals((prev) => [entry, ...prev]);
  }

  /**
   * Staggered entrance for content below the headline/numbers. Spread onto
   * a plain wrapper `<div>`, never merged directly onto a `<Button>` — see
   * the note this cost us once already: twMerge collapses conflicting
   * `transition-[...]` property lists, which would wreck the button's own
   * press-feedback timing.
   */
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
    <div className="mx-auto max-w-lg pb-10">
      <header className="flex items-start justify-between">
        <p className="text-lg font-medium">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditTargetsOpen(true)}
          aria-label="Edit daily targets"
          className="text-muted-foreground rounded-full"
        >
          <Settings2Icon className="size-[18px]" />
        </Button>
      </header>

      <div className="mt-8">
        <TodayStats
          status={status}
          caloriesConsumed={caloriesConsumed}
          calorieTarget={targets.calories}
          proteinConsumed={proteinConsumed}
          proteinTarget={targets.protein}
        />
      </div>

      <div {...revealProps(80, "mt-10")}>
        <NextAction message={nextAction} />
      </div>

      <div {...revealProps(140, "mt-4")}>
        <Button
          size="lg"
          className="h-12 rounded-full px-6 text-sm font-medium"
          onClick={() => setLogMealOpen(true)}
        >
          <PlusIcon className="size-4" />
          Log meal
        </Button>
      </div>

      <div {...revealProps(200, "mt-16")}>
        <TodaysMeals meals={todaysMeals} />
      </div>

      <LogMealSheet open={logMealOpen} onOpenChange={setLogMealOpen} onSave={handleSaveMeal} />
      <EditTargetsSheet
        open={editTargetsOpen}
        onOpenChange={setEditTargetsOpen}
        targets={targets}
        onSave={setTargets}
      />
    </div>
  );
}
