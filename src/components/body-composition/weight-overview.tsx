"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import type { BodyMetricEntry } from "@/features/health/data";
import { computeNiceTicks } from "@/lib/nice-ticks";
import { TODAY } from "@/lib/today-theme";
import { parseLocalDate } from "@/lib/utils";

import { PeriodTrendChart } from "./period-trend-chart";

type Period = "week" | "month" | "year";

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "year", label: "Year", days: 365 },
];

/** Apple-Health-style vertical breathing room around the period's data — not a hard-scaled 0-based axis. */
const DOMAIN_PAD_KG = 1;

/**
 * Weight tab's hero + period selector + chart + mini-stats. `entries` is
 * the full, already-fetched weight history (newest first) — everything
 * else (window filtering, domain, reference ticks, min/max/avg/delta) is
 * derived here per the selected period, so the page only fetches once.
 */
export function WeightOverview({ entries }: { entries: BodyMetricEntry[] }) {
  const [period, setPeriod] = React.useState<Period>("month");
  const latest = entries[0] ?? null;

  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const { windowStart, periodEntries, domain, ticks, stats } = React.useMemo(() => {
    const days = PERIODS.find((p) => p.id === period)!.days;
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));

    const inWindow = entries
      .filter((entry) => parseLocalDate(entry.date).getTime() >= start.getTime())
      .slice()
      .reverse(); // chronological (oldest first)

    const values = inWindow.map((entry) => entry.value);
    const fallback = latest?.value ?? 0;
    const min = values.length ? Math.min(...values) : fallback;
    const max = values.length ? Math.max(...values) : fallback;
    const avg = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
    const delta = values.length ? inWindow[inWindow.length - 1].value - inWindow[0].value : null;

    const periodDomain: [number, number] = [min - DOMAIN_PAD_KG, max + DOMAIN_PAD_KG];

    return {
      windowStart: start,
      periodEntries: inWindow,
      domain: periodDomain,
      ticks: computeNiceTicks(periodDomain[0], periodDomain[1]),
      stats: { min, max, avg, delta },
    };
  }, [entries, period, today, latest]);

  return (
    <>
      <div className="mt-5 flex items-center justify-end gap-4">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className="py-1 text-[12px] font-bold transition-colors"
            style={{ color: period === item.id ? TODAY.ink : TODAY.ink45 }}
          >
            <span
              className="pb-[3px]"
              style={{ borderBottom: `2px solid ${period === item.id ? TODAY.clay : "transparent"}` }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div style={{ background: TODAY.surface, borderRadius: 26 }} className="mt-4 px-[22px] pt-6 pb-[26px]">
        <div className="flex items-center gap-[9px]">
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: TODAY.clay }} />
          <span
            className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase"
            style={{ color: TODAY.ink45 }}
          >
            Latest weight
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-[11px]">
          {latest ? (
            <>
              <span
                className="text-[78px] leading-[0.82] font-extrabold tracking-[-0.05em] tabular-nums"
                style={{ color: TODAY.ink }}
              >
                {formatValue(latest.value)}
              </span>
              <span className="text-base font-semibold" style={{ color: TODAY.ink40 }}>
                kg
              </span>
            </>
          ) : (
            <span className="text-[15px] font-medium" style={{ color: TODAY.ink45 }}>
              Nothing logged yet
            </span>
          )}
        </div>

        {latest && (
          <p className="mt-1 text-[12px] font-medium" style={{ color: TODAY.ink40 }}>
            Last logged {formatLogDate(latest.date)}
          </p>
        )}

        {latest && (
          <p className="mt-3 text-[12.5px] font-semibold" style={{ color: TODAY.ink45 }}>
            {stats.avg !== null
              ? `Avg this ${period}: ${formatValue(stats.avg)} kg`
              : `No data logged this ${period}`}
          </p>
        )}

        <div className="mt-6">
          <PeriodTrendChart
            entries={periodEntries}
            windowStart={windowStart}
            windowEnd={today}
            domain={domain}
            ticks={ticks}
            mode={period === "year" ? "smooth" : "markers"}
            unit="kg"
          />
        </div>

        {stats.avg !== null && (
          <div className="mt-6 grid grid-cols-4 gap-2">
            <StatTile label="Min" value={`${formatValue(stats.min)} kg`} />
            <StatTile label="Max" value={`${formatValue(stats.max)} kg`} />
            <StatTile label="Avg" value={`${formatValue(stats.avg)} kg`} />
            <DeltaTile value={stats.delta ?? 0} />
          </div>
        )}
      </div>
    </>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl py-2.5" style={{ background: TODAY.chip2 }}>
      <span
        className="font-mono text-[9px] font-semibold tracking-[0.1em] uppercase"
        style={{ color: TODAY.ink45 }}
      >
        {label}
      </span>
      <span className="text-[13px] font-bold tabular-nums" style={{ color: TODAY.ink }}>
        {value}
      </span>
    </div>
  );
}

function DeltaTile({ value }: { value: number }) {
  const rounded = Math.round(value * 10) / 10;
  const Icon = rounded > 0 ? ArrowUpIcon : rounded < 0 ? ArrowDownIcon : null;
  const sign = rounded > 0 ? "+" : "";

  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl py-2.5" style={{ background: TODAY.chip2 }}>
      <span
        className="font-mono text-[9px] font-semibold tracking-[0.1em] uppercase"
        style={{ color: TODAY.ink45 }}
      >
        Delta
      </span>
      <span
        className="flex items-center gap-0.5 text-[13px] font-bold tabular-nums"
        style={{ color: TODAY.ink }}
      >
        {Icon && <Icon className="size-3" strokeWidth={3} />}
        {sign}
        {rounded.toFixed(1)} kg
      </span>
    </div>
  );
}

/** Apple Health syncs weight with long floating-point tails — round for display, never store the rounded value. */
function formatValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatLogDate(dateKey: string): string {
  return parseLocalDate(dateKey).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}
