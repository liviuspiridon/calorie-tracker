import type { MetricKind, MetricSample, DateRange } from "@/types";

/**
 * Port for Apple Health data.
 *
 * Apple exposes HealthKit only on-device, so the eventual adapter will likely
 * be one of: a companion iOS app pushing to an API route, an export-file
 * importer (export.xml), or a bridge like Health Auto Export. All of them
 * implement this same interface — the rest of the app doesn't care which.
 */
export interface AppleHealthProvider {
  isConnected(): Promise<boolean>;
  getSamples(kind: MetricKind, range: DateRange): Promise<MetricSample[]>;
}

export interface AppleHealthConnection {
  status: "disconnected" | "connected" | "syncing" | "error";
  lastSyncedAt?: string;
}
