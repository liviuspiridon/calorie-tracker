import type { BodyMetricEntry } from "@/features/health/data";
import { monotoneCubicPath, type Point } from "@/lib/svg-path";
import { TODAY } from "@/lib/today-theme";
import { parseLocalDate } from "@/lib/utils";

const WIDTH = 300;
const HEIGHT = 130;
const PAD_X = 28;
const PAD_Y = 16;

/**
 * Period-aware chart for the Weight tab: x is date-proportional (not
 * index-proportional like the shared `TrendChart`) so a real gap between
 * weigh-ins reads as a visual gap and the Year view's curve reflects true
 * time spacing — only real entries ever get a point, missing days are
 * never fabricated. `markers` mode (week/month) draws straight segments
 * with a dot at every point; `smooth` mode (year) draws one monotone
 * cubic curve through every real value with no per-point dots. Reference
 * lines come from caller-computed `ticks`; their value labels are an HTML
 * overlay rather than SVG `<text>` because the chart's `viewBox` stretches
 * non-uniformly (`preserveAspectRatio="none"`), which would otherwise
 * horizontally distort glyph shapes.
 */
export function PeriodTrendChart({
  entries,
  windowStart,
  windowEnd,
  domain,
  ticks,
  mode,
  unit,
  color = TODAY.clay,
  emptyLabel = "No data in this window",
}: {
  entries: BodyMetricEntry[];
  windowStart: Date;
  windowEnd: Date;
  domain: [number, number];
  ticks: number[];
  mode: "markers" | "smooth";
  unit: string;
  color?: string;
  emptyLabel?: string;
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

  const [domainMin, domainMax] = domain;
  const domainRange = domainMax - domainMin || 1;
  const windowRange = windowEnd.getTime() - windowStart.getTime() || 1;

  function toY(value: number): number {
    const normalized = (value - domainMin) / domainRange;
    return HEIGHT - PAD_Y - normalized * (HEIGHT - PAD_Y * 2);
  }

  const points: Point[] = entries.map((entry) => {
    const dayOffset = parseLocalDate(entry.date).getTime() - windowStart.getTime();
    return {
      x: PAD_X + (dayOffset / windowRange) * (WIDTH - PAD_X * 2),
      y: toY(entry.value),
    };
  });

  const path =
    points.length < 2
      ? ""
      : mode === "smooth"
        ? monotoneCubicPath(points)
        : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative">
      <div
        role="img"
        aria-label={`${entries.length} logged day${entries.length === 1 ? "" : "s"} in this window, ranging from ${domainMin.toFixed(1)} to ${domainMax.toFixed(1)} ${unit}`}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[140px] w-full" aria-hidden="true">
          {ticks.map((tick) => (
            <line
              key={tick}
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke={TODAY.hairline}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
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
          {mode === "markers" &&
            points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={3} fill={color} />)}
          {mode === "smooth" && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={color} />}
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute left-0 -translate-y-1/2 font-mono text-[9px] font-semibold tabular-nums"
            style={{ top: `${(toY(tick) / HEIGHT) * 100}%`, color: TODAY.ink40 }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}
