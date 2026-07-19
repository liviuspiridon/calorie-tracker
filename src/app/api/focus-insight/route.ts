import { NextResponse } from "next/server";

import { FocusInsightService } from "@/features/focus/server/focus-insight-service";
import type { FocusInsightRequest, FocusMealInput } from "@/features/focus/types";
import { GeminiProvider } from "@/lib/ai/gemini-provider";

const focusInsightService = new FocusInsightService(new GeminiProvider());

/**
 * Same-origin endpoint called right after a meal is logged — no bearer
 * token (that's reserved for /api/metrics, which is called by an external
 * device with no other way to prove who it is). Balance has no auth/session
 * system at all, so this gets the same posture as the meal-analysis server
 * actions: no auth, but real input validation.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  }

  const input = parseRequest(body);
  if (!input) {
    return NextResponse.json(
      {
        error:
          "Body must include caloriesConsumed, calorieTarget, localHour (0-23), newItem, and meals.",
      },
      { status: 400 },
    );
  }

  try {
    const insight = await focusInsightService.generateInsight(input);
    return NextResponse.json(insight);
  } catch (error) {
    console.error("Failed to generate focus insight", error);
    return NextResponse.json(
      { error: "Couldn't generate a reflection right now." },
      { status: 500 },
    );
  }
}

function parseRequest(body: unknown): FocusInsightRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (!isFiniteNumber(b.caloriesConsumed) || b.caloriesConsumed < 0) return null;
  if (!isFiniteNumber(b.calorieTarget) || b.calorieTarget < 0) return null;
  if (!isFiniteNumber(b.localHour) || b.localHour < 0 || b.localHour > 23) return null;

  const newItem = parseMealInput(b.newItem);
  if (!newItem) return null;

  if (!Array.isArray(b.meals)) return null;
  const meals: FocusMealInput[] = [];
  for (const raw of b.meals) {
    const meal = parseMealInput(raw);
    if (!meal) return null;
    meals.push(meal);
  }
  // A runaway client sending an unbounded list would balloon prompt size/cost.
  if (meals.length > 200) return null;

  return {
    caloriesConsumed: b.caloriesConsumed,
    calorieTarget: b.calorieTarget,
    localHour: b.localHour,
    newItem,
    meals,
  };
}

function parseMealInput(value: unknown): FocusMealInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.description !== "string" || !v.description.trim()) return null;
  if (!isFiniteNumber(v.calories) || v.calories < 0) return null;
  if (!isFiniteNumber(v.protein) || v.protein < 0) return null;
  if (!isFiniteNumber(v.carbs) || v.carbs < 0) return null;
  if (!isFiniteNumber(v.fat) || v.fat < 0) return null;
  return {
    description: v.description,
    calories: v.calories,
    protein: v.protein,
    carbs: v.carbs,
    fat: v.fat,
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
