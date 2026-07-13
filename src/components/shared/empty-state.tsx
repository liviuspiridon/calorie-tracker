import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Placeholder for sections whose data source isn't wired up yet.
 * An empty screen is an invitation to act: say what will live here
 * and what unlocks it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}
