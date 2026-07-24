import type { BodyMetricEntry } from "@/features/health/data";
import { smoothLinePath, type Point } from "@/lib/svg-path";
import { TODAY } from "@/lib/today-theme";

const WIDTH = 300;
const HEIGHT = 120;
const PAD_X = 24;
const PAD_Y = 16;

/**
 * A single smooth line, no axes or gridlines — the trend is the point, not
 * precise value-reading. `entries` must be chronological (oldest first).
 * Shared by all three Body Composition tabs (weight, body fat, BMI) —
 * `unit`/`color` are the only per-tab variation.
 *
 * `preserveAspectRatio="none"` lets the fixed viewBox stretch to fill
 * whatever width the container gives it, so the chart stays fluid across
 * viewports without measuring the container in JS; `vectorEffect=
 * "non-scaling-stroke"` keeps the line's stroke width from being distorted
 * by that same non-uniform stretch.
 */
export function TrendChart({
  entries,
  color = TODAY.clay,
  emptyLabel = "No data yet",
  unit,
}: {
  entries: BodyMetricEntry[];
  color?: string;
  emptyLabel?: string;
  unit: string;
}) {
  if (entries.length === 0) {
    return (
      <div
        className="flex h-[140px] items-center justify-center rounded-2xl text-[13px] font-medium"
        style={{ background: TODAY.chip2, color: TODAY.ink45 }}
      >
        {emptyLabel}
      </div>
    );
  }

  const values = entries.map((entry) => entry.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points: Point[] = entries.map((entry, index) => {
    const x =
      entries.length === 1
        ? WIDTH / 2
        : PAD_X + (index / (entries.length - 1)) * (WIDTH - PAD_X * 2);
    const normalized = (entry.value - min) / range;
    const y = HEIGHT - PAD_Y - normalized * (HEIGHT - PAD_Y * 2);
    return { x, y };
  });

  const path = points.length >= 2 ? smoothLinePath(points) : "";
  const last = points[points.length - 1];

  return (
    <div
      role="img"
      aria-label={`Trend across ${entries.length} logged day${
        entries.length === 1 ? "" : "s"
      }, ranging from ${min.toFixed(1)} to ${max.toFixed(1)} ${unit}`}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[140px] w-full"
        aria-hidden="true"
      >
        {path && (
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <circle cx={last.x} cy={last.y} r={4} fill={color} />
      </svg>
    </div>
  );
}
