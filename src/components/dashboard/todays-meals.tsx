import type { MealLogEntry } from "@/features/meal-logging/types";

import { TODAY } from "@/lib/today-theme";

export function TodaysMeals({
  heading,
  meals,
  onOpenMeal,
}: {
  heading: string;
  meals: MealLogEntry[];
  onOpenMeal: (meal: MealLogEntry) => void;
}) {
  return (
    <section>
      <p className="text-center text-sm font-bold" style={{ color: TODAY.ink }}>
        {heading}
      </p>
      {meals.length === 0 ? (
        <p className="mt-4 text-center text-sm" style={{ color: TODAY.ink45 }}>
          Nothing logged here yet.
        </p>
      ) : (
        <ul className="mt-1">
          {meals.map((meal, index) => (
            <li
              key={meal.id}
              className="overflow-hidden"
              style={index > 0 ? { borderTop: `1px solid ${TODAY.hairline}` } : undefined}
            >
              {/*
                The interactive element and the layout element stay
                deliberately separate. A <button> with `display: flex`
                directly on it has well-documented cross-browser bugs
                (notably Safari/WebKit) where `min-width: 0` and
                `flex-shrink` don't reliably reach its children, which
                silently breaks truncation. The button here is a plain
                block-level click target; the flex row that actually
                needs shrink-to-truncate behavior lives on a <div> inside
                it, where flex works normally. The button keeps its
                original full-bleed width (-mx-7/w-calc/px-7) so the row
                and its hover area are unchanged; the extra px-[22px]
                below is purely additional inset on the content, matching
                DailyBudgetCard's own padding, so the text sits with more
                breathing room without touching the row's outer geometry.
              */}
              <button
                type="button"
                onClick={() => onOpenMeal(meal)}
                className="-mx-7 block w-[calc(100%+3.5rem)] px-7 py-4 text-left transition-colors duration-150 hover:bg-[rgba(240,237,229,0.6)] focus-visible:-outline-offset-2 focus-visible:outline-2 active:bg-[#ECE8DE]"
              >
                <div className="flex items-baseline justify-between gap-4 px-[22px]">
                  <span
                    className="min-w-0 flex-1 overflow-hidden text-[14.5px] font-semibold text-ellipsis whitespace-nowrap"
                    style={{ color: TODAY.ink }}
                  >
                    {meal.analysis.description}
                  </span>
                  <span
                    className="shrink-0 text-[15px] font-bold whitespace-nowrap"
                    style={{ color: TODAY.ink }}
                  >
                    {meal.analysis.calories} kcal
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
