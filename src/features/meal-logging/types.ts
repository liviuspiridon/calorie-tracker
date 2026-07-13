/**
 * Port for AI meal logging.
 *
 * The eventual adapter will send a photo and/or text description to a vision
 * LLM and get back a structured estimate. Keep the model/provider choice
 * behind this interface.
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

export interface MealAnalyzer {
  analyze(input: { photo?: Blob; text?: string }): Promise<MealAnalysis>;
}
