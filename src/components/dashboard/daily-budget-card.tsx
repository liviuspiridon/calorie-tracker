"use client";

import { useCountUp } from "@/hooks/use-count-up";

import { TODAY } from "@/lib/today-theme";

/**
 * The hero surface from the approved design. The reference shows a 3-segment
 * meter (eaten / remaining / "+420 workout bonus"), but Balance has no
 * activity-tracking data source yet (no Apple Health integration) — the
 * bonus segment would be fabricated, so this renders only the two segments
 * backed by real data. The structure is ready for a third segment whenever
 * that data genuinely exists.
 */
export function DailyBudgetCard({
  caloriesConsumed,
  calorieTarget,
  proteinConsumed,
  proteinTarget,
}: {
  caloriesConsumed: number;
  calorieTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
}) {
  const isOver = caloriesConsumed > calorieTarget;
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesConsumed);
  const caloriesOver = Math.max(0, caloriesConsumed - calorieTarget);
  const calorieDisplay = useCountUp(isOver ? caloriesOver : caloriesRemaining);

  const eatenPct = calorieTarget > 0 ? Math.min(1, caloriesConsumed / calorieTarget) * 100 : 0;
  const remainingPct = 100 - eatenPct;
  const proteinPct = proteinTarget > 0 ? Math.min(1, proteinConsumed / proteinTarget) * 100 : 0;

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

      <div className="mt-8">
        <div className="relative flex h-4 gap-[3px]">
          <div
            style={{ width: `${eatenPct}%`, background: TODAY.ink, borderRadius: "8px 2px 2px 8px" }}
            className="transition-[width] duration-700 ease-out"
          />
          <div
            style={{
              width: `${remainingPct}%`,
              background: TODAY.accent,
              borderRadius: "2px 8px 8px 2px",
            }}
            className="transition-[width] duration-700 ease-out"
          />
        </div>
        {/*
          Deliberately not positioned under the bar via a dynamic `left`
          offset — eatenPct clamps at 100, so at or past budget that offset
          collided directly with the right-aligned goal label. A plain
          justify-between row can't overlap at any value, over budget or not.
        */}
        <div className="mt-[11px] flex w-full items-center justify-between">
          <span
            className="font-mono text-[10px] font-medium tabular-nums"
            style={{ color: TODAY.ink40 }}
          >
            {caloriesConsumed.toLocaleString()} consumed
          </span>
          <span
            className="font-mono text-[10px] font-medium tabular-nums"
            style={{ color: TODAY.ink45 }}
          >
            {calorieTarget.toLocaleString()} kcal goal
          </span>
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
