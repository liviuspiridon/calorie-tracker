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
    <div className="mx-auto flex max-w-lg flex-col pb-10">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm font-medium">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight">Today</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditTargetsOpen(true)}
          aria-label="Edit daily targets"
          className="text-muted-foreground mt-1 rounded-full"
        >
          <Settings2Icon className="size-[18px]" />
        </Button>
      </header>

      <CalorieHero
        status={status}
        caloriesConsumed={caloriesConsumed}
        calorieTarget={targets.calories}
      />

      <div className="mt-6">
        <ProteinProgress consumed={proteinConsumed} target={targets.protein} />
      </div>

      <div className="mt-10">
        <NextAction message={nextAction} />
      </div>

      <Button
        size="lg"
        className="mt-5 h-12 w-full rounded-full text-sm font-medium"
        onClick={() => setLogMealOpen(true)}
      >
        <PlusIcon className="size-4" />
        Log meal
      </Button>

      <div className="mt-14">
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
