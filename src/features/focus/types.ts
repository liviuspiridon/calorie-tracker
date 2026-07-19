/** A meal's macro breakdown, as sent to the Focus Insight API. */
export interface FocusMealInput {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Request body for POST /api/focus-insight. */
export interface FocusInsightRequest {
  caloriesConsumed: number;
  calorieTarget: number;
  /**
   * The client's local hour (0-23) — the server can't infer this from its
   * own clock (Vercel runs UTC), and "actionable next steps based on the
   * time of day" needs the user's real local time.
   */
  localHour: number;
  newItem: FocusMealInput;
  meals: FocusMealInput[];
}

/** The three-part reflection returned by the API. */
export interface FocusInsight {
  mirror: string;
  guidance: string;
  mindset: string;
}
