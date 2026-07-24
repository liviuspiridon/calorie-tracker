/**
 * Shared meal-logging domain shapes. The analysis pipeline itself —
 * MealAnalysisService -> AIProvider -> GeminiProvider — lives in ./server
 * and @/lib/ai; this file only holds the data shapes both ends agree on.
 */
export interface MealAnalysis {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /**
   * Set on freshly-analyzed meals; the meals table has no confidence column,
   * so it doesn't survive a reload. Absent means "unknown", and the UI hides
   * the badge rather than inventing a value.
   */
  confidence?: "low" | "medium" | "high";
}

export interface MealLogEntry {
  id: string;
  loggedAt: string;
  analysis: MealAnalysis;
  /** Session-only, like confidence: no matching columns in the meals table. */
  photoUrl?: string;
  note?: string;
}
