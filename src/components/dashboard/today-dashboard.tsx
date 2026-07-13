"use client";

import * as React from "react";
import { PlusIcon, Settings2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { computeDayStatus, getNextAction } from "@/features/goals/lib/daily-progress";
import { useDailyTargets } from "@/features/goals/use-daily-targets";
import { LogMealSheet } from "@/features/meal-logging/components/log-meal-sheet";
import type { MealLogEntry } from "@/features/meal-logging/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { isSameDay } from "@/lib/utils";

import { CalorieHero } from "./calorie-hero";
import { EditTargetsSheet } from "./edit-targets-sheet";
import { NextAction } from "./next-action";
import { ProteinProgress } from "./protein-progress";
import { TodaysMeals } from "./todays-meals";

export function TodayDashboard() {
  const [targets, setTargets] = useDailyTargets();
  const [meals, setMeals] = useLocalStorage<MealLogEntry[]>("balance:meal-log", []);
  const [logMealOpen, setLogMealOpen] = React.useState(false);
  const [editTargetsOpen, setEditTargetsOpen] = React.useState(false);

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

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 pb-8">
      <header className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-muted-foreground text-sm font-medium">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Today</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditTargetsOpen(true)}
          aria-label="Edit daily targets"
          className="mt-1"
        >
          <Settings2Icon />
        </Button>
      </header>

      <CalorieHero
        status={status}
        caloriesConsumed={caloriesConsumed}
        calorieTarget={targets.calories}
      />

      <ProteinProgress consumed={proteinConsumed} target={targets.protein} />

      <NextAction message={nextAction} />

      <Button size="lg" className="w-full" onClick={() => setLogMealOpen(true)}>
        <PlusIcon />
        Log meal
      </Button>

      <TodaysMeals meals={todaysMeals} />

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
