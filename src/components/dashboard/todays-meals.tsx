import type { MealLogEntry } from "@/features/meal-logging/types";
import { formatRelativeTime } from "@/lib/utils";

export function TodaysMeals({ meals }: { meals: MealLogEntry[] }) {
  return (
    <section className="space-y-5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
        Meals today
      </h2>
      {meals.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nothing logged yet today.</p>
      ) : (
        <ul className="divide-border/70 divide-y">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="flex items-center justify-between gap-4 py-4 first:pt-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{meal.analysis.description}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatRelativeTime(meal.loggedAt)}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                {meal.analysis.calories} kcal
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
