/**
 * Shared meal-logging domain shapes. The analysis pipeline itself —
 * MealAnalysisService -> AIProvider -> ClaudeProvider — lives in ./server
 * and @/lib/ai; this file only holds the data shapes both ends agree on.
 */
export interface MealAnalysis {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "low" | "medium" | "high";
}

export interface MealLogEntry {
  id: string;
  loggedAt: string;
  analysis: MealAnalysis;
  photoUrl?: string;
  note?: string;
}
