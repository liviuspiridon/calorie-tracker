import { cn } from "@/lib/utils";

/**
 * The Balance mark: two stacked bars settling into equilibrium.
 * Pure SVG so it inherits currentColor and needs no asset pipeline.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M3 6h10" />
        <path d="M5.5 10h5" />
      </svg>
    </span>
  );
}
