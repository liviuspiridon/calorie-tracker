"use client";

import Link from "next/link";
import { Target, TrendingDown } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

/**
 * The hub behind the header's "..." button. Two destinations today (Daily
 * Targets, Weight Evolution) — deliberately a drawer rather than opening
 * Daily Targets directly, so future destinations have somewhere to live
 * without the header growing more buttons.
 *
 * No visible close (X), matching every other Today-screen sheet — dismiss
 * via backdrop tap only (showCloseButton={false} suppresses the shared
 * SheetContent's default). The title is screen-reader-only since there's no
 * visual header content at all.
 */
export function NavDrawer({
  open,
  onOpenChange,
  onOpenTargets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTargets: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg }}
        className="border-none px-6 pt-6 pb-8 shadow-[-14px_0_46px_-14px_rgba(20,23,15,0.25)]"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>

        <nav className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onOpenTargets();
            }}
            className="flex items-center gap-3 rounded-2xl px-5 py-5 text-left text-[15px] font-semibold transition-colors hover:bg-[rgba(20,23,15,0.04)]"
            style={{ background: TODAY.chip2, color: TODAY.ink }}
          >
            <Target className="size-[18px] opacity-70" aria-hidden="true" />
            Daily Targets
          </button>

          <Link
            href="/weight"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-2xl px-5 py-5 text-[15px] font-semibold transition-colors hover:bg-[rgba(20,23,15,0.04)]"
            style={{ background: TODAY.chip2, color: TODAY.ink }}
          >
            <TrendingDown className="size-[18px] opacity-70" aria-hidden="true" />
            Weight Evolution
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}