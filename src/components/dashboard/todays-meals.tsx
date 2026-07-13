import type { MealLogEntry } from "@/features/meal-logging/types";
import { formatTime } from "@/lib/utils";

/** A small logbook, not a stat card — fixed time column reads like a timetable. */
export function TodaysMeals({ meals }: { meals: MealLogEntry[] }) {
  return (
    <section>
      <h2 className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
        Meals today
      </h2>
      {meals.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">Nothing logged yet today.</p>
      ) : (
        <ul className="divide-border/70 mt-4 divide-y">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-4"
            >
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatTime(meal.loggedAt)}
              </span>
              <span className="truncate text-sm font-medium">{meal.analysis.description}</span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {meal.analysis.calories} kcal
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
