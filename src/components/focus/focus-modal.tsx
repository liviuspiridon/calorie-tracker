"use client";

import { XIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { FocusInsight } from "@/features/focus/types";
import type { FocusInsightStatus } from "@/features/focus/use-focus-insight";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

/**
 * Full-screen reflection that follows a successful new log — a quiet
 * moment, not another dashboard surface, hence the true `fixed inset-0`
 * takeover (side="full" on the shared Sheet primitive) rather than a
 * partial sheet. Unlike every other Today-screen sheet, this one keeps a
 * visible close button: a full-screen overlay has no backdrop left to tap.
 */
export function FocusModal({
  open,
  onOpenChange,
  insight,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight: FocusInsight | null;
  status: FocusInsightStatus;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="full"
        showCloseButton={false}
        style={{ ...TODAY_FONT, background: TODAY.bg }}
        className="border-none px-7 pt-[22px] pb-10"
      >
        <SheetTitle className="sr-only">A moment of focus</SheetTitle>

        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="flex size-9 items-center justify-center rounded-full"
              style={{ background: TODAY.chip }}
            >
              <XIcon className="size-4" style={{ color: TODAY.ink }} />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-[9px]">
            <span
              style={{ width: 7, height: 7, borderRadius: "50%", background: TODAY.clay }}
            />
            <span
              className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: TODAY.ink45 }}
            >
              A moment of focus
            </span>
          </div>

          <div className="mt-10 flex-1" aria-live="polite">
            {(status === "idle" || status === "loading") && (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <p
                  className="animate-pulse text-[17px] font-medium"
                  style={{ color: TODAY.ink45 }}
                >
                  Reflecting…
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="flex h-full min-h-[200px] items-center justify-center text-center">
                <p className="text-[15px] font-medium" style={{ color: TODAY.ink45 }}>
                  Couldn&apos;t put this into words right now — your entry is saved either way.
                </p>
              </div>
            )}

            {status === "ready" && insight && (
              <div className="space-y-7">
                <FocusSection label="The Mirror" text={insight.mirror} />
                <FocusSection label="The Guidance" text={insight.guidance} />
                <div>
                  <p
                    className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: TODAY.ink40 }}
                  >
                    The Mindset
                  </p>
                  <p
                    className="mt-2 text-[20px] leading-snug font-bold tracking-[-0.01em]"
                    style={{ color: TODAY.ink }}
                  >
                    {insight.mindset}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FocusSection({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p
        className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase"
        style={{ color: TODAY.ink40 }}
      >
        {label}
      </p>
      <p className="mt-2 text-[17px] leading-relaxed font-medium" style={{ color: TODAY.ink }}>
        {text}
      </p>
    </div>
  );
}
