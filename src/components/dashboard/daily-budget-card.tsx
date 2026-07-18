"use client";

import { useCountUp } from "@/hooks/use-count-up";

import { TODAY } from "@/lib/today-theme";

/** Fixed daily calorie deficit visualized at the right end of the meter. */
const TARGET_DEFICIT_KCAL = 550;
/** Blocks narrower than this hide their value label entirely. */
const HIDE_LABEL_BELOW_PCT = 4;
/** Below this width, the middle block's remaining label flips above the bar. */
const FLIP_REMAINING_BELOW_PCT = 12;

/**
 * The hero surface: headline countdown, the 3-block budget meter, and the
 * protein row.
 *
 * Meter model (left to right, gap-separated): consumed (ink) | remaining
 * (one continuous hybrid block: available base budget in lime flowing into
 * the training bonus in olive via a hard-stop gradient — no internal gap) |
 * fixed target deficit (pale lime). The bar's total is base + active +
 * deficit; over-eating erodes right-to-left: available first, then the
 * training bonus, then the planned deficit.
 *
 * Labels: consumed and deficit values center below their blocks. The middle
 * block's below-label is the TOTAL remaining (base remaining + training
 * remaining) — by construction the same value as the big headline. The
 * "+N kcal" active badge sits above the bar, centered on the olive
 * sub-segment. Anti-collision: when the middle block narrows past
 * FLIP_REMAINING_BELOW_PCT its label flips above (and the active badge
 * yields — at that width the two would overlap, and the flipped total
 * already is mostly the training remainder). Near-zero blocks hide their
 * labels.
 *
 * The deficit is visualization only — the headline and pacing math still
 * treat base + active as the eatable budget.
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

  const consumedKcal = Math.min(caloriesConsumed, envelope);
  const availableKcal = Math.max(0, calorieTarget - caloriesConsumed);
  const trainingKcal = Math.max(0, activeCalories - overBase);
  // availableKcal + trainingKcal === caloriesRemaining, so the middle
  // block's label always matches the headline exactly.
  const deficitKcal = Math.max(0, TARGET_DEFICIT_KCAL - overTraining);

  const toPct = (kcal: number) => (kcal / envelope) * 100;
  const consumedPct = toPct(consumedKcal);
  const remainingPct = toPct(caloriesRemaining);
  const trainingPct = toPct(trainingKcal);
  const deficitPct = toPct(deficitKcal);

  // Where the lime available part hands over to the olive training part,
  // as a fraction of the middle block itself (drives the gradient split).
  const trainingSplitPct =
    caloriesRemaining > 0 ? (availableKcal / caloriesRemaining) * 100 : 0;

  const remainingFlipsAbove =
    remainingPct >= HIDE_LABEL_BELOW_PCT && remainingPct < FLIP_REMAINING_BELOW_PCT;

  const blocks = [
    {
      key: "consumed",
      pct: consumedPct,
      background: TODAY.ink,
    },
    {
      key: "remaining",
      pct: remainingPct,
      background: `linear-gradient(to right, ${TODAY.accent} 0%, ${TODAY.accent} ${trainingSplitPct}%, ${TODAY.accentInk} ${trainingSplitPct}%, ${TODAY.accentInk} 100%)`,
    },
    {
      key: "deficit",
      pct: deficitPct,
      background: TODAY.todayHighlight,
    },
  ];
  const bars = blocks.filter((block) => block.pct > 0.1);

  const belowLabels = [
    {
      key: "consumed",
      show: consumedPct >= HIDE_LABEL_BELOW_PCT,
      center: clampPct(consumedPct / 2),
      color: TODAY.ink40,
      text: `${Math.round(consumedKcal).toLocaleString()} kcal`,
    },
    {
      key: "remaining",
      show: remainingPct >= FLIP_REMAINING_BELOW_PCT,
      center: clampPct(consumedPct + remainingPct / 2),
      color: TODAY.ink45,
      text: `${Math.round(caloriesRemaining).toLocaleString()} kcal`,
    },
    {
      key: "deficit",
      show: deficitPct >= HIDE_LABEL_BELOW_PCT,
      center: clampPct(consumedPct + remainingPct + deficitPct / 2),
      color: TODAY.ink40,
      text: `${Math.round(deficitKcal).toLocaleString()} kcal`,
    },
  ].filter((label) => label.show);

  const aboveLabels = [
    // The active badge, centered on the olive sub-segment. It yields when
    // the remaining label flips up — at that width they'd overlap.
    {
      key: "training",
      show: trainingPct >= HIDE_LABEL_BELOW_PCT && !remainingFlipsAbove,
      center: clampPct(consumedPct + toPct(availableKcal) + trainingPct / 2),
      color: TODAY.accentInk,
      text: `+${Math.round(trainingKcal).toLocaleString()} kcal`,
    },
    {
      key: "remaining-flipped",
      show: remainingFlipsAbove,
      center: clampPct(consumedPct + remainingPct / 2),
      color: TODAY.ink45,
      text: `${Math.round(caloriesRemaining).toLocaleString()} kcal`,
    },
  ].filter((label) => label.show);

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
          {aboveLabels.map((label) => (
            <span
              key={label.key}
              className="absolute -translate-x-1/2 font-mono text-[10px] font-medium whitespace-nowrap tabular-nums transition-[left] duration-700 ease-out"
              style={{ left: `${label.center}%`, color: label.color }}
            >
              {label.text}
            </span>
          ))}
        </div>

        <div className="flex h-4 gap-[3px]">
          {bars.map((block, index) => (
            <div
              key={block.key}
              className="transition-[width] duration-700 ease-out"
              style={{
                width: `${block.pct}%`,
                background: block.background,
                borderRadius: segmentRadius(index, bars.length),
              }}
            />
          ))}
        </div>

        <div className="relative mt-[6px] h-[13px]">
          {belowLabels.map((label) => (
            <span
              key={label.key}
              className="absolute -translate-x-1/2 font-mono text-[10px] font-medium whitespace-nowrap tabular-nums transition-[left] duration-700 ease-out"
              style={{ left: `${label.center}%`, color: label.color }}
            >
              {label.text}
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
