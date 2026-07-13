"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DailyTargets } from "@/features/goals/types";

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
  const [calories, setCalories] = React.useState(String(targets.calories));
  const [protein, setProtein] = React.useState(String(targets.protein));

  React.useEffect(() => {
    if (open) {
      setCalories(String(targets.calories));
      setProtein(String(targets.protein));
    }
  }, [open, targets]);

  function handleSave() {
    const parsedCalories = Number(calories);
    const parsedProtein = Number(protein);
    if (!Number.isFinite(parsedCalories) || parsedCalories <= 0) return;
    if (!Number.isFinite(parsedProtein) || parsedProtein <= 0) return;

    onSave({ calories: Math.round(parsedCalories), protein: Math.round(parsedProtein) });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Daily targets</SheetTitle>
          <SheetDescription>What being on track is measured against.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <label htmlFor="target-calories" className="text-sm font-medium">
              Calories
            </label>
            <Input
              id="target-calories"
              type="number"
              inputMode="numeric"
              min={1}
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="target-protein" className="text-sm font-medium">
              Protein (g)
            </label>
            <Input
              id="target-protein"
              type="number"
              inputMode="numeric"
              min={1}
              value={protein}
              onChange={(event) => setProtein(event.target.value)}
            />
          </div>
          <SheetFooter className="px-0 pt-0">
            <Button onClick={handleSave} className="w-full">
              Save
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
