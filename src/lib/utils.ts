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
