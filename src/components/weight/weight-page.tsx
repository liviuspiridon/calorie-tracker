"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { useWeightHistory } from "@/features/health/use-weight-history";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

import { WeightChart } from "./weight-chart";

/**
 * Standalone full-screen page — deliberately NOT nested under the legacy
 * (dashboard) route group (its AppSidebar/SiteHeader shell was superseded
 * when the sidebar was removed from the live app and isn't wired to it).
 * Lives at the top level like src/app/page.tsx, so it only inherits the
 * root layout's fonts/theme and owns its own back button.
 */
export function WeightPage() {
  const { entries, status, retry } = useWeightHistory();

  // useWeightHistory resolves newest-first (right for the "recent logs"
  // list below); the chart reads left-to-right chronologically.
  const chronological = React.useMemo(() => [...entries].reverse(), [entries]);
  const latest = entries[0] ?? null;

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
          Weight Tracker
        </h1>

        {status === "error" ? (
          <div className="mt-24 flex flex-col items-center text-center">
            <p className="text-sm font-bold" style={{ color: TODAY.ink }}>
              Couldn&apos;t load your weight data
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: TODAY.ink45 }}>
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 h-11 rounded-full px-6 text-sm font-bold"
              style={{ background: TODAY.ink, color: TODAY.accent }}
            >
              Try again
            </button>
          </div>
        ) : status === "loading" ? (
          // Deliberately no skeleton — same "hold until real data" choice as
          // the Today screen; a brief blank beat reads better than a
          // placeholder shape that never quite matches the real content.
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
                      {formatWeight(latest.weight)}
                    </span>
                    <span className="text-base font-semibold" style={{ color: TODAY.ink40 }}>
                      kg
                    </span>
                  </>
                ) : (
                  <span className="text-[15px] font-medium" style={{ color: TODAY.ink45 }}>
                    Nothing synced yet
                  </span>
                )}
              </div>

              {latest && (
                <p className="mt-1 text-[12px] font-medium" style={{ color: TODAY.ink40 }}>
                  Last synced {formatLogDate(latest.date)}
                </p>
              )}

              <div className="mt-7">
                <WeightChart entries={chronological} />
              </div>
            </div>

            <div className="mt-8 h-px" style={{ background: TODAY.hairlineSoft }} />

            <section className="mt-6">
              <p
                className="font-mono text-[10.5px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: TODAY.ink45 }}
              >
                Recent logs
              </p>

              {entries.length === 0 ? (
                <p className="mt-4 text-center text-sm" style={{ color: TODAY.ink45 }}>
                  Nothing synced yet — the Apple Health shortcut writes here once it runs.
                </p>
              ) : (
                <ul className="mt-1">
                  {entries.map((entry, index) => (
                    <li
                      key={entry.date}
                      className="flex items-center justify-between py-4"
                      style={index > 0 ? { borderTop: `1px solid ${TODAY.hairline}` } : undefined}
                    >
                      <span className="text-[14.5px] font-semibold" style={{ color: TODAY.ink }}>
                        {formatLogDate(entry.date)}
                      </span>
                      <span
                        className="text-[15px] font-bold tabular-nums"
                        style={{ color: TODAY.ink }}
                      >
                        {formatWeight(entry.weight)} kg
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/** Apple Health syncs weight with long floating-point tails (e.g.
 *  84.562501050736) — round for display, never store the rounded value. */
function formatWeight(kg: number): string {
  return kg.toLocaleString(undefined, { maximumFractionDigits: 1 });
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
