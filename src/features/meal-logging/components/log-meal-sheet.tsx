"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

import { analyzeMeal } from "../actions";
import type { MealAnalysis, MealLogEntry } from "../types";

type FlowState =
  | { step: "compose" }
  | { step: "analyzing" }
  | { step: "review"; analysis: MealAnalysis }
  | { step: "error"; message: string };

const EMPTY_ANALYSIS: MealAnalysis = {
  description: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  confidence: "low",
};

export function LogMealSheet({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: MealLogEntry) => void;
}) {
  const [text, setText] = React.useState("");
  const [flow, setFlow] = React.useState<FlowState>({ step: "compose" });
  const [draft, setDraft] = React.useState<MealAnalysis>(EMPTY_ANALYSIS);

  function reset() {
    setText("");
    setFlow({ step: "compose" });
    setDraft(EMPTY_ANALYSIS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleAnalyze() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setFlow({ step: "analyzing" });
    try {
      const analysis = await analyzeMeal(trimmed);
      setDraft(analysis);
      setFlow({ step: "review", analysis });
    } catch {
      setFlow({ step: "error", message: "Couldn't analyze that meal. Try again." });
    }
  }

  function handleSave() {
    onSave({
      id: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
      analysis: draft,
      note: text.trim(),
    });
    reset();
    onOpenChange(false);
  }

  const isComposing =
    flow.step === "compose" || flow.step === "analyzing" || flow.step === "error";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[85vh] w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Log a meal</SheetTitle>
          <SheetDescription>
            {flow.step === "review"
              ? "Review the estimate and adjust anything before saving."
              : "Describe what you ate, in your own words."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {isComposing && (
            <div className="space-y-3">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="200g grilled chicken with rice and salad"
                rows={4}
                disabled={flow.step === "analyzing"}
                autoFocus
              />
              {flow.step === "error" && (
                <p className="text-destructive text-sm">{flow.message}</p>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={!text.trim() || flow.step === "analyzing"}
                className="w-full"
              >
                {flow.step === "analyzing" ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          )}

          {flow.step === "review" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="meal-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="meal-description"
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Calories"
                  value={draft.calories}
                  onChange={(value) => setDraft((prev) => ({ ...prev, calories: value }))}
                />
                <NumberField
                  label="Protein (g)"
                  value={draft.protein}
                  onChange={(value) => setDraft((prev) => ({ ...prev, protein: value }))}
                />
                <NumberField
                  label="Carbs (g)"
                  value={draft.carbs}
                  onChange={(value) => setDraft((prev) => ({ ...prev, carbs: value }))}
                />
                <NumberField
                  label="Fat (g)"
                  value={draft.fat}
                  onChange={(value) => setDraft((prev) => ({ ...prev, fat: value }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Confidence</span>
                <Badge variant="outline" className="capitalize">
                  {draft.confidence}
                </Badge>
              </div>

              <SheetFooter className="flex-row gap-2 px-0 pt-0">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setFlow({ step: "compose" })}
                >
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSave}>
                  Save meal
                </Button>
              </SheetFooter>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </div>
  );
}
