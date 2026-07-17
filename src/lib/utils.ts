import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic. Used by every component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Short relative time for recently-logged items, e.g. "5m ago", "2h ago". */
export function formatRelativeTime(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

/** True if two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "Today, 14 Jul" if `selected` is `today`, else "Tue, 15 Jul". */
export function formatHeaderDate(selected: Date, today: Date): string {
  const day = selected.getDate();
  const month = SHORT_MONTHS[selected.getMonth()];
  if (isSameDay(selected, today)) return `Today, ${day} ${month}`;
  const weekday = selected.toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday}, ${day} ${month}`;
}
