/**
 * Shared domain model.
 *
 * Every integration (Apple Health, AI meal logging, Home Assistant) maps its
 * provider-specific payloads into these types at the feature boundary, so the
 * UI never depends on any vendor's schema.
 */

export type MetricKind =
  "steps" | "heart_rate" | "sleep" | "active_energy" | "weight" | "calories_in";

export interface MetricSample {
  kind: MetricKind;
  value: number;
  unit: string;
  /** ISO 8601 */
  recordedAt: string;
  source: DataSource;
}

export type DataSource = "apple_health" | "meal_log" | "home_assistant" | "manual";

export interface DateRange {
  /** ISO 8601 */
  from: string;
  /** ISO 8601 */
  to: string;
}
