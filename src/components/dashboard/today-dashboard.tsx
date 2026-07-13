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

import { CalorieHero } from "./calorie-hero";
import { EditTargetsSheet } from "./edit-targets-sheet";
import { NextAction } from "./next-action";
import { ProteinProgress } from "./protein-progress";
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
   * Staggered entrance for content below the hero. Returned as spreadable
   * props onto a plain wrapper `<div>` — never merge these classes directly
   * onto a `<Button>`, since twMerge would collapse its own
   * `transition-[...]` property list into this one and wreck its press
   * feedback timing.
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
    <div className="pb-10">
      {/* Hero zone — the one dramatic moment on the screen. */}
      <div className="bg-linear-to-b from-primary/16 via-primary/5 to-background dark:from-primary/22 dark:via-primary/8 mx-auto max-w-3xl rounded-[2rem] px-6 pt-8 pb-10 sm:px-10">
        <div className="mx-auto max-w-lg">
          <header className="mb-8 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {now.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h1 className="text-5xl leading-tight font-semibold tracking-tight">Today</h1>
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
            revealed={revealed}
          />
        </div>
      </div>

      {/* Supporting content — calm, quiet, cascades in after the hero settles. */}
      <div className="mx-auto max-w-lg px-4 sm:px-0">
        <div {...revealProps(80, "mt-10")}>
          <ProteinProgress consumed={proteinConsumed} target={targets.protein} />
        </div>

        <div {...revealProps(140, "mt-10")}>
          <NextAction message={nextAction} />
        </div>

        <div {...revealProps(180, "mt-5")}>
          <Button
            size="lg"
            className="h-12 w-full rounded-full text-sm font-medium"
            onClick={() => setLogMealOpen(true)}
          >
            <PlusIcon className="size-4" />
            Log meal
          </Button>
        </div>

        <div {...revealProps(220, "mt-14")}>
          <TodaysMeals meals={todaysMeals} />
        </div>
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
