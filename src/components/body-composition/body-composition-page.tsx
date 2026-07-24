"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";

import { useDailyTargets } from "@/features/goals/use-daily-targets";
import type { BodyMetricEntry } from "@/features/health/data";
import { useBodyFatHistory, useWeightHistory } from "@/features/health/use-body-metric-history";
import { BMI_CATEGORY_LABEL, classifyBmi, computeBmi, type BmiCategory } from "@/lib/bmi";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

import { MetricEntrySheet } from "./metric-entry-sheet";
import { TrendChart } from "./trend-chart";

const DANGER = "#B3453A";

type Tab = "weight" | "bodyFat" | "bmi";

const TABS: { id: Tab; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "bodyFat", label: "Body Fat" },
  { id: "bmi", label: "BMI" },
];

const BMI_BADGE_STYLE: Record<BmiCategory, { text: string; bg: string }> = {
  underweight: { text: TODAY.ink55, bg: TODAY.chip2 },
  normal: { text: TODAY.accentInk, bg: "rgba(124,155,47,0.14)" },
  overweight: { text: TODAY.clay, bg: TODAY.clayFill },
  obese: { text: DANGER, bg: "rgba(179,69,58,0.12)" },
};

/**
 * Standalone full-screen page, same shell convention as the page it
 * replaces (weight-page.tsx) — deliberately NOT nested under the legacy
 * (dashboard) route group.
 *
 * Weight and Body Fat are full CRUD tabs over the same daily_metrics rows
 * the Apple Health webhook writes to. BMI is derived-only: it's computed
 * from each weight entry + the current height (no manual input, per spec),
 * so it has no add button and its list rows aren't tappable.
 */
export function BodyCompositionPage() {
  const [tab, setTab] = React.useState<Tab>("weight");
  const [entrySheetOpen, setEntrySheetOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<BodyMetricEntry | null>(null);

  const weight = useWeightHistory();
  const bodyFat = useBodyFatHistory();
  const { targets } = useDailyTargets();

  const bmiEntries: BodyMetricEntry[] = React.useMemo(
    () =>
      weight.entries.map((entry) => ({
        date: entry.date,
        value: computeBmi(entry.value, targets.heightCm),
      })),
    [weight.entries, targets.heightCm],
  );

  const active =
    tab === "weight"
      ? { entries: weight.entries, status: weight.status, retry: weight.retry }
      : tab === "bodyFat"
        ? { entries: bodyFat.entries, status: bodyFat.status, retry: bodyFat.retry }
        : { entries: bmiEntries, status: weight.status, retry: weight.retry };

  const chronological = React.useMemo(() => [...active.entries].reverse(), [active.entries]);
  const latest = active.entries[0] ?? null;

  const tabConfig =
    tab === "weight"
      ? { unit: "kg", decimals: 1, label: "Latest weight", step: 0.1 }
      : tab === "bodyFat"
        ? { unit: "%", decimals: 1, label: "Latest body fat", step: 0.1 }
        : { unit: "", decimals: 1, label: "Current BMI", step: 0.1 };

  function openAddEntry() {
    setEditingEntry(null);
    setEntrySheetOpen(true);
  }

  function openEditEntry(entry: BodyMetricEntry) {
    setEditingEntry(entry);
    setEntrySheetOpen(true);
  }

  function handleSaveEntry(date: string, value: number, previousDate: string | null) {
    const hook = tab === "bodyFat" ? bodyFat : weight;
    hook.saveEntry(date, value, previousDate).catch((error) => {
      console.error("Failed to save entry", error);
    });
  }

  function handleDeleteEntry(date: string) {
    const hook = tab === "bodyFat" ? bodyFat : weight;
    hook.deleteEntry(date).catch((error) => {
      console.error("Failed to delete entry", error);
    });
  }

  return (
    <div
      style={{ ...TODAY_FONT, background: TODAY.bg }}
      className="min-h-dvh px-7 pt-[22px] pb-16"
    >
      <div className="mx-auto flex max-w-lg flex-col">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 py-0.5 text-[13px] font-semibold"
          style={{ color: TODAY.ink55 }}
        >
          <ArrowLeftIcon className="size-4" strokeWidth={2.5} />
          Back
        </Link>

        <h1
          className="mt-7 text-[19px] font-extrabold tracking-[-0.02em]"
          style={{ color: TODAY.ink }}
        >
          Body Composition
        </h1>

        <div className="mt-5 flex gap-1 rounded-full p-1" style={{ background: TODAY.chip2 }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="flex-1 rounded-full py-2 text-[13px] font-bold transition-colors"
              style={
                tab === item.id
                  ? { background: TODAY.ink, color: TODAY.accent }
                  : { background: "transparent", color: TODAY.ink55 }
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {active.status === "error" ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <p className="text-sm font-bold" style={{ color: TODAY.ink }}>
              Couldn&apos;t load your data
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: TODAY.ink45 }}>
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={active.retry}
              className="mt-5 h-11 rounded-full px-6 text-sm font-bold"
              style={{ background: TODAY.ink, color: TODAY.accent }}
            >
              Try again
            </button>
          </div>
        ) : active.status === "loading" ? (
          <div className="mt-6 h-[360px]" />
        ) : (
          <>
            <div
              style={{ background: TODAY.surface, borderRadius: 26 }}
              className="mt-6 px-[22px] pt-6 pb-[26px]"
            >
              <div className="flex items-center gap-[9px]">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: TODAY.clay,
                  }}
                />
                <span
                  className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase"
                  style={{ color: TODAY.ink45 }}
                >
                  {tabConfig.label}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-[11px]">
                {latest ? (
                  <>
                    <span
                      className="text-[78px] leading-[0.82] font-extrabold tracking-[-0.05em] tabular-nums"
                      style={{ color: TODAY.ink }}
                    >
                      {formatValue(latest.value, tabConfig.decimals)}
                    </span>
                    {tabConfig.unit && (
                      <span className="text-base font-semibold" style={{ color: TODAY.ink40 }}>
                        {tabConfig.unit}
                      </span>
                    )}
                    {tab === "bmi" && <BmiBadge bmi={latest.value} />}
                  </>
                ) : (
                  <span className="text-[15px] font-medium" style={{ color: TODAY.ink45 }}>
                    Nothing logged yet
                  </span>
                )}
              </div>

              {latest && (
                <p className="mt-1 text-[12px] font-medium" style={{ color: TODAY.ink40 }}>
                  {tab === "bmi" ? "As of" : "Last logged"} {formatLogDate(latest.date)}
                </p>
              )}

              <div className="mt-7">
                <TrendChart
                  entries={chronological}
                  unit={tabConfig.unit || "BMI"}
                  emptyLabel={tab === "bmi" ? "Log a weight entry to see BMI" : "No data yet"}
                />
              </div>
            </div>

            <div className="mt-8 h-px" style={{ background: TODAY.hairlineSoft }} />

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <p
                  className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: TODAY.ink45 }}
                >
                  Recent logs
                </p>
                {tab !== "bmi" && (
                  <button
                    type="button"
                    onClick={openAddEntry}
                    className="flex items-center gap-1 rounded-full py-1.5 pr-3 pl-2 text-[12.5px] font-bold"
                    style={{ background: TODAY.chip2, color: TODAY.ink }}
                  >
                    <PlusIcon className="size-3.5" strokeWidth={3} />
                    Add
                  </button>
                )}
              </div>

              {active.entries.length === 0 ? (
                <p className="mt-4 text-center text-sm" style={{ color: TODAY.ink45 }}>
                  {tab === "bmi"
                    ? "Log a weight entry to see BMI here."
                    : "Nothing logged yet — add your first entry above."}
                </p>
              ) : (
                <ul className="mt-1">
                  {active.entries.map((entry, index) => (
                    <li
                      key={entry.date}
                      style={index > 0 ? { borderTop: `1px solid ${TODAY.hairline}` } : undefined}
                    >
                      {tab === "bmi" ? (
                        <div className="flex items-center justify-between py-4">
                          <span className="text-[14.5px] font-semibold" style={{ color: TODAY.ink }}>
                            {formatLogDate(entry.date)}
                          </span>
                          <div className="flex items-center gap-2.5">
                            <span
                              className="text-[15px] font-bold tabular-nums"
                              style={{ color: TODAY.ink }}
                            >
                              {formatValue(entry.value, 1)}
                            </span>
                            <BmiBadge bmi={entry.value} />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditEntry(entry)}
                          className="flex w-full items-center justify-between py-4 text-left"
                        >
                          <span className="text-[14.5px] font-semibold" style={{ color: TODAY.ink }}>
                            {formatLogDate(entry.date)}
                          </span>
                          <span
                            className="text-[15px] font-bold tabular-nums"
                            style={{ color: TODAY.ink }}
                          >
                            {formatValue(entry.value, tabConfig.decimals)} {tabConfig.unit}
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {tab !== "bmi" && (
        <MetricEntrySheet
          key={tab}
          open={entrySheetOpen}
          onOpenChange={setEntrySheetOpen}
          title={tab === "weight" ? "Log weight" : "Log body fat"}
          unit={tab === "weight" ? "Weight (kg)" : "Body fat (%)"}
          step={0.1}
          entry={editingEntry}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
        />
      )}
    </div>
  );
}

function BmiBadge({ bmi }: { bmi: number }) {
  const category = classifyBmi(bmi);
  const style = BMI_BADGE_STYLE[category];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap"
      style={{ background: style.bg, color: style.text }}
    >
      {BMI_CATEGORY_LABEL[category]}
    </span>
  );
}

/** Apple Health syncs weight with long floating-point tails (e.g.
 *  84.562501050736) — round for display, never store the rounded value. */
function formatValue(value: number, decimals: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/** Parses "YYYY-MM-DD" as local calendar-date components — `new
 *  Date("YYYY-MM-DD")` parses as UTC midnight, which prints as the wrong
 *  day in timezones behind UTC. */
function formatLogDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
}
