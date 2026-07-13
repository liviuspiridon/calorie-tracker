"use client";

import * as React from "react";
import { PlusIcon, UtensilsCrossed } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { formatRelativeTime } from "@/lib/utils";

import { LogMealSheet } from "./log-meal-sheet";
import type { MealLogEntry } from "../types";

export function MealLogger() {
  const [meals, setMeals] = useLocalStorage<MealLogEntry[]>("balance:meal-log", []);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  function handleSave(entry: MealLogEntry) {
    setMeals((prev) => [entry, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-sm font-medium">Meal log</h2>
        <Button onClick={() => setSheetOpen(true)}>
          <PlusIcon />
          Log meal
        </Button>
      </div>

      {meals.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meals logged yet"
          description="Describe what you ate — you'll get a nutrition estimate you can adjust before saving."
          action={
            <Button variant="outline" onClick={() => setSheetOpen(true)}>
              Log your first meal
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-sm font-medium">{meal.analysis.description}</p>
                <p className="text-muted-foreground text-xs">
                  {formatRelativeTime(meal.loggedAt)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{meal.analysis.protein}g protein</Badge>
                  <Badge variant="outline">{meal.analysis.carbs}g carbs</Badge>
                  <Badge variant="outline">{meal.analysis.fat}g fat</Badge>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {meal.analysis.calories} kcal
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <LogMealSheet open={sheetOpen} onOpenChange={setSheetOpen} onSave={handleSave} />
    </div>
  );
}
