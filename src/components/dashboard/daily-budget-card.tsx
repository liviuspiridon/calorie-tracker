"use client";

import { CheckIcon } from "lucide-react";

import { computeCalorieRing, type CalorieRingSegmentKey } from "@/features/goals/lib/calorie-ring";
import { useCountUp } from "@/hooks/use-count-up";

import { TODAY } from "@/lib/today-theme";

/**
 * Gauge geometry, in the SVG's own user units. The arc is open at the
 * bottom: it sweeps ARC_SWEEP degrees clockwise from ARC_START (measured
 * from 3 o'clock), leaving the remainder as the gap the two flanking
 * figures sit beside. The viewBox is cropped below the arc's lowest point
 * so the open bottom costs no vertical space.
 */
const ARC_SWEEP = 250;
const ARC_START = 90 + (360 - ARC_SWEEP) / 2;
const BOX_W = 208;
const BOX_H = 172;
const CX = 104;
const CY = 104;
const RING_RADIUS = 86;
const RING_WIDTH = 15;
/** Cleared between slices so neighbours read as separate. Butt caps keep every arc's length exactly proportional. */
const SEGMENT_GAP = 3.4;
/** Thin arc drawn outside the gauge once eating passes maintenance. */
const SURPLUS_RADIUS = RING_RADIUS + RING_WIDTH / 2 + 7;
const SURPLUS_WIDTH = 4;

const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/** Path length of the drawn arc — the full 100% the segments divide up. */
const SWEEP_LENGTH = (ARC_SWEEP / 360) * CIRCUMFERENCE;
const SURPLUS_CIRCUMFERENCE = 2 * Math.PI * SURPLUS_RADIUS;
const SURPLUS_SWEEP_LENGTH = (ARC_SWEEP / 360) * SURPLUS_CIRCUMFERENCE;

/** Same roles the previous horizontal meter used, so the palette reads unchanged. */
const SEGMENT_COLOR: Record<CalorieRingSegmentKey, string> = {
  consumed: TODAY.ink,
  available: TODAY.accent,
  active: TODAY.accentInk,
  deficit: TODAY.clayFill,
};

/**
 * The hero surface: an open gauge arc of the day's calorie envelope with
 * the remaining-kcal headline at its centre, consumed and burned flanking
 * it, and the two macro goals as cards below.
 *
 * The full arc is resting energy + active calories. Its four slices run end
 * to end along the arc: consumed, what's still eatable (split into the base
 * remainder and the activity bonus so the bonus stays visible), and the
 * planned deficit. Eating erodes them from the far end inward, so the
 * deficit slice only starts shrinking once the food budget is gone — see
 * computeCalorieRing, which owns that arithmetic.
 *
 * Protein and fiber are deliberately styled as goals to fill rather than
 * ceilings to stay under: they complete, and say so, instead of turning red.
 */
export function DailyBudgetCard({
  caloriesConsumed,
  bmr,
  targetDeficit,
  activeCalories,
  proteinConsumed,
  proteinTarget,
  fiberConsumed,
  fiberTarget,
}: {
  caloriesConsumed: number;
  /** Resting energy — the full arc is this plus activity. */
  bmr: number;
  /** Planned daily deficit, held back from the eatable budget. */
  targetDeficit: number;
  activeCalories: number;
  proteinConsumed: number;
  proteinTarget: number;
  fiberConsumed: number;
  fiberTarget: number;
}) {
  const ring = computeCalorieRing({ bmr, targetDeficit, activeCalories, caloriesConsumed });
  const centerValue = useCountUp(Math.round(ring.remaining));

  // Lay the slices end to end along the arc, dropping any too small to
  // survive its own gap — a sliver thinner than the gap would render as a
  // stray tick rather than a segment.
  let cursor = 0;
  const arcs = ring.segments
    .map((segment) => {
      const length = (segment.kcal / ring.arcTotal) * SWEEP_LENGTH;
      const start = cursor;
      cursor += length;
      return { key: segment.key, length, start };
    })
    .filter((arc) => arc.length > SEGMENT_GAP);

  const surplusLength = Math.min(1, ring.surplus / ring.arcTotal) * SURPLUS_SWEEP_LENGTH;

  const headline = ring.isOverMaintenance
    ? {
        dot: TODAY.clay,
        glow: "rgba(191,122,94,0.28)",
        label: `Over maintenance · +${Math.round(ring.surplus).toLocaleString()}`,
      }
    : ring.isOverBudget
      ? { dot: TODAY.clay, glow: "rgba(191,122,94,0.28)", label: "Into your deficit" }
      : { dot: TODAY.accent, glow: "rgba(199,240,74,0.3)", label: "Calories remaining" };

  return (
    <div
      style={{ background: TODAY.surface, borderRadius: 26 }}
      className="mt-[22px] px-[22px] pt-6 pb-[26px]"
    >
      <div className="flex items-center gap-[9px]">
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: headline.dot,
            boxShadow: `0 0 0 3px ${headline.glow}`,
          }}
        />
        <span
          className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: TODAY.ink45 }}
        >
          {headline.label}
        </span>
      </div>

      <div className="mt-4 flex items-center">
        <FlankStat label="Consumed" value={caloriesConsumed} dot={TODAY.ink} />

        <div className="relative min-w-0 flex-1" style={{ aspectRatio: `${BOX_W} / ${BOX_H}` }}>
          <svg viewBox={`0 0 ${BOX_W} ${BOX_H}`} className="absolute inset-0 h-full w-full">
            <g transform={`rotate(${ARC_START} ${CX} ${CY})`}>
              {/* Shortened by one stroke width and nudged forward by half of
                  it, so the round caps land exactly on the arc's ends. */}
              <circle
                cx={CX}
                cy={CY}
                r={RING_RADIUS}
                fill="none"
                stroke={TODAY.track}
                strokeWidth={RING_WIDTH}
                strokeLinecap="round"
                strokeDasharray={`${SWEEP_LENGTH - RING_WIDTH} ${CIRCUMFERENCE - SWEEP_LENGTH + RING_WIDTH}`}
                strokeDashoffset={-RING_WIDTH / 2}
              />
              {arcs.map((arc) => {
                const dash = arc.length - SEGMENT_GAP;
                return (
                  <circle
                    key={arc.key}
                    cx={CX}
                    cy={CY}
                    r={RING_RADIUS}
                    fill="none"
                    stroke={SEGMENT_COLOR[arc.key]}
                    strokeWidth={RING_WIDTH}
                    strokeLinecap="butt"
                    strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                    strokeDashoffset={-arc.start}
                    style={{
                      transition:
                        "stroke-dasharray 700ms ease-out, stroke-dashoffset 700ms ease-out",
                    }}
                  />
                );
              })}
              {ring.surplus > 0 && (
                <circle
                  cx={CX}
                  cy={CY}
                  r={SURPLUS_RADIUS}
                  fill="none"
                  stroke={TODAY.clay}
                  strokeWidth={SURPLUS_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${surplusLength} ${SURPLUS_CIRCUMFERENCE - surplusLength}`}
                  style={{ transition: "stroke-dasharray 700ms ease-out" }}
                />
              )}
            </g>
          </svg>

          {/* Centred on the arc's centre, not the cropped box's. */}
          <div
            className="absolute inset-x-0 flex flex-col items-center"
            style={{ top: `${(CY / BOX_H) * 100}%`, transform: "translateY(-50%)" }}
          >
            <span
              className="text-[40px] leading-[0.9] font-extrabold tracking-[-0.045em] tabular-nums"
              style={{ color: TODAY.ink }}
            >
              {centerValue.toLocaleString()}
            </span>
            <span className="mt-1 text-[11.5px] font-semibold" style={{ color: TODAY.ink40 }}>
              {ring.remaining < 0 ? "kcal past budget" : "kcal left"}
            </span>
          </div>
        </div>

        <FlankStat label="Burned" value={activeCalories} dot={TODAY.accentInk} />
      </div>

      <div className="mt-[18px] grid grid-cols-2 gap-[10px]">
        <GoalCard
          label="Protein"
          consumed={proteinConsumed}
          target={proteinTarget}
          fill={TODAY.ink50}
        />
        <GoalCard label="Fiber" consumed={fiberConsumed} target={fiberTarget} fill={TODAY.clay} />
      </div>
    </div>
  );
}

/** One of the two figures flanking the gauge. The dot ties it to its arc slice. */
function FlankStat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex w-[54px] shrink-0 flex-col items-center gap-[5px]">
      <div className="flex items-center gap-[5px]">
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
        <span
          className="font-mono text-[9.5px] font-semibold tracking-[0.1em] uppercase"
          style={{ color: TODAY.ink45 }}
        >
          {label}
        </span>
      </div>
      <span className="text-[16px] font-bold tabular-nums" style={{ color: TODAY.ink }}>
        {Math.round(value).toLocaleString()}
      </span>
      <span className="font-mono text-[9.5px] font-medium" style={{ color: TODAY.ink40 }}>
        kcal
      </span>
    </div>
  );
}

/**
 * A target to reach, not a limit to respect: the bar fills toward the goal
 * and locks into an explicit "reached" state, so hitting it reads as a win
 * rather than as an overshoot.
 */
function GoalCard({
  label,
  consumed,
  target,
  fill,
}: {
  label: string;
  consumed: number;
  target: number;
  fill: string;
}) {
  const reached = target > 0 && consumed >= target;
  const pct = target > 0 ? Math.min(1, consumed / target) * 100 : 0;

  return (
    <div style={{ background: TODAY.bg, borderRadius: 16 }} className="px-[14px] pt-[11px] pb-3">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold" style={{ color: TODAY.ink60 }}>
          {label}
        </span>
        {reached && (
          <span
            className="flex size-[15px] items-center justify-center rounded-full"
            style={{ background: TODAY.accent }}
          >
            <CheckIcon className="size-[10px]" strokeWidth={3.5} style={{ color: TODAY.ink }} />
          </span>
        )}
      </div>

      <div className="mt-[5px] font-mono text-[15px] tabular-nums">
        <b className="font-semibold" style={{ color: TODAY.ink }}>
          {consumed}
        </b>
        <span style={{ color: TODAY.ink45 }}>/{target}g</span>
      </div>

      <div
        className="mt-[9px] h-[5px] overflow-hidden rounded-full"
        style={{ background: TODAY.track }}
      >
        <div
          className="h-full rounded-full transition-[width,background] duration-700 ease-out"
          style={{ width: `${pct}%`, background: reached ? TODAY.accent : fill }}
        />
      </div>
    </div>
  );
}
