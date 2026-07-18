"use client";

import { useCountUp } from "@/hooks/use-count-up";

import { TODAY } from "@/lib/today-theme";

/** Fixed daily calorie deficit visualized at the right end of the meter. */
const TARGET_DEFICIT_KCAL = 550;
/** Segments narrower than this hide their value label entirely. */
const HIDE_LABEL_BELOW_PCT = 4;
/** Below this width, the available segment's label flips above the bar. */
const FLIP_AVAILABLE_BELOW_PCT = 12;

/**
 * The hero surface: headline countdown, the 4-segment budget meter, and the
 * protein row.
 *
 * Meter model (left to right): consumed (ink) | available base budget
 * (accent lime) | training bonus from Apple Health (olive) | fixed target
 * deficit (pale lime). The bar's total is base + active + deficit, and
 * over-eating erodes segments right-to-left semantics-first: available
 * shrinks first, then the training bonus, then the planned deficit.
 *
 * Value labels sit below the bar, centered on their segment. Two
 * anti-collision rules: the training value always renders above the bar so
 * it never competes for space below, and the available value flips above
 * once its segment narrows past FLIP_AVAILABLE_BELOW_PCT. Any label whose
 * segment is near zero-width hides. (This replaces the old static
 * justify-between meta row — per-segment centering needs dynamic `left`
 * offsets, and the flip/hide rules are what keep them collision-free.)
 *
 * The deficit is visualization only — the headline "kcal left" number and
 * all pacing math still treat base + active as the eatable budget.
 */
export function DailyBudgetCard({
  caloriesConsumed,
  calorieTarget,
  activeCalories,
  proteinConsumed,
  proteinTarget,
}: {
  caloriesConsumed: number;
  /** Base daily target — activity raises the effective budget on top of it. */
  calorieTarget: number;
  activeCalories: number;
  proteinConsumed: number;
  proteinTarget: number;
}) {
  const effectiveTarget = calorieTarget + activeCalories;
  const isOver = caloriesConsumed > effectiveTarget;
  const caloriesRemaining = Math.max(0, effectiveTarget - caloriesConsumed);
  const caloriesOver = Math.max(0, caloriesConsumed - effectiveTarget);
  const calorieDisplay = useCountUp(isOver ? caloriesOver : caloriesRemaining);

  const proteinPct = proteinTarget > 0 ? Math.min(1, proteinConsumed / proteinTarget) * 100 : 0;

  const envelope = calorieTarget + activeCalories + TARGET_DEFICIT_KCAL;
  const overBase = Math.max(0, caloriesConsumed - calorieTarget);
  const overTraining = Math.max(0, overBase - activeCalories);

  const segments = [
    {
      key: "consumed",
      kcal: Math.min(caloriesConsumed, envelope),
      color: TODAY.ink,
      labelColor: TODAY.ink40,
      prefix: "",
    },
    {
      key: "available",
      kcal: Math.max(0, calorieTarget - caloriesConsumed),
      color: TODAY.accent,
      labelColor: TODAY.ink45,
      prefix: "",
    },
    {
      key: "training",
      kcal: Math.max(0, activeCalories - overBase),
      color: TODAY.accentInk,
      labelColor: TODAY.accentInk,
      prefix: "+",
    },
    {
      key: "deficit",
      kcal: Math.max(0, TARGET_DEFICIT_KCAL - overTraining),
      color: TODAY.todayHighlight,
      labelColor: TODAY.ink40,
      prefix: "",
    },
  ];

  let offset = 0;
  const meter = segments.map((segment) => {
    const pct = (segment.kcal / envelope) * 100;
    const center = clampPct(offset + pct / 2);
    offset += pct;
    return {
      ...segment,
      pct,
      center,
      placement: labelPlacement(segment.key, pct),
      label: `${segment.prefix}${Math.round(segment.kcal).toLocaleString()} kcal`,
    };
  });
  const bars = meter.filter((segment) => segment.pct > 0.1);

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
            background: TODAY.accent,
            boxShadow: "0 0 0 3px rgba(199,240,74,0.3)",
          }}
        />
        <span
          className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: TODAY.ink45 }}
        >
          {isOver ? "Calories over" : "Calories remaining"}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-[11px]">
        <span
          className="text-[78px] leading-[0.82] font-extrabold tracking-[-0.05em] tabular-nums"
          style={{ color: TODAY.ink }}
        >
          {calorieDisplay.toLocaleString()}
        </span>
        <span className="text-base font-semibold" style={{ color: TODAY.ink40 }}>
          {isOver ? "kcal over" : "kcal left"}
        </span>
      </div>

      <div className="mt-4">
        {/* Both label rails keep a fixed height even when empty, so a flip
            never shifts the card's vertical rhythm. */}
        <div className="relative mb-[6px] h-[13px]">
          {meter
            .filter((segment) => segment.placement === "above")
            .map((segment) => (
              <span
                key={segment.key}
                className="absolute -translate-x-1/2 font-mono text-[10px] font-medium whitespace-nowrap tabular-nums transition-[left] duration-700 ease-out"
                style={{ left: `${segment.center}%`, color: segment.labelColor }}
              >
                {segment.label}
              </span>
            ))}
        </div>

        <div className="flex h-4 gap-[3px]">
          {bars.map((segment, index) => (
            <div
              key={segment.key}
              className="transition-[width] duration-700 ease-out"
              style={{
                width: `${segment.pct}%`,
                background: segment.color,
                borderRadius: segmentRadius(index, bars.length),
              }}
            />
          ))}
        </div>

        <div className="relative mt-[6px] h-[13px]">
          {meter
            .filter((segment) => segment.placement === "below")
            .map((segment) => (
              <span
                key={segment.key}
                className="absolute -translate-x-1/2 font-mono text-[10px] font-medium whitespace-nowrap tabular-nums transition-[left] duration-700 ease-out"
                style={{ left: `${segment.center}%`, color: segment.labelColor }}
              >
                {segment.label}
              </span>
            ))}
        </div>
      </div>

      <div className="my-[22px] h-px" style={{ background: TODAY.hairline }} />

      <div className="flex items-center gap-[14px]">
        <span
          className="text-[12.5px] font-semibold whitespace-nowrap"
          style={{ color: TODAY.ink60 }}
        >
          Protein
        </span>
        <div
          className="h-[5px] flex-1 overflow-hidden rounded-full"
          style={{ background: TODAY.track }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${proteinPct}%`, background: TODAY.ink50 }}
          />
        </div>
        <span className="font-mono text-xs whitespace-nowrap tabular-nums" style={{ color: TODAY.ink50 }}>
          <b className="font-medium" style={{ color: TODAY.ink }}>
            {proteinConsumed}
          </b>
          /{proteinTarget}g
        </span>
      </div>
    </div>
  );
}

function labelPlacement(key: string, pct: number): "above" | "below" | "hidden" {
  if (pct < HIDE_LABEL_BELOW_PCT) return "hidden";
  if (key === "training") return "above";
  if (key === "available" && pct < FLIP_AVAILABLE_BELOW_PCT) return "above";
  return "below";
}

/** Keeps centered labels from hanging off the card's edges. */
function clampPct(value: number): number {
  return Math.min(95, Math.max(5, value));
}

function segmentRadius(index: number, count: number): string {
  if (count === 1) return "8px";
  if (index === 0) return "8px 2px 2px 8px";
  if (index === count - 1) return "2px 8px 8px 2px";
  return "2px";
}
