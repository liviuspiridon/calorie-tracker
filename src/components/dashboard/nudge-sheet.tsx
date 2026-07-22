"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Nudge } from "@/features/nudge/nudge";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

const AUTO_DISMISS_MS = 3500;
const SWIPE_DISMISS_PX = 80;

/**
 * The lightweight post-log nudge: a bottom sheet in the same chrome as the
 * app's other bottom sheets (handle pill, rounded top, cream surface), but
 * transient — it dismisses itself after AUTO_DISMISS_MS, on swipe-down, on
 * the close icon, or on backdrop tap. The auto-dismiss timer pauses while a
 * finger is on the sheet (reading or dragging) and re-arms on release.
 *
 * Swipe-down is a real touch gesture, implemented locally rather than on
 * the shared Sheet primitive: the content tracks the finger via
 * translateY, springs back under the threshold, dismisses past it. The
 * other sheets keep their tap-only dismissal.
 *
 * `nudge` stays rendered while `open` animates false so the message doesn't
 * vanish mid slide-out — same pattern as MealDetailSheet's `meal`.
 */
export function NudgeSheet({
  nudge,
  open,
  onOpenChange,
}: {
  nudge: Nudge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const startYRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const armTimer = React.useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => onOpenChange(false), AUTO_DISMISS_MS);
  }, [clearTimer, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
      clearTimer();
      return;
    }
    armTimer();
    return clearTimer;
  }, [open, armTimer, clearTimer]);

  function handleTouchStart(event: React.TouchEvent) {
    clearTimer();
    startYRef.current = event.touches[0].clientY;
    setDragging(true);
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (startYRef.current === null) return;
    setDragY(Math.max(0, event.touches[0].clientY - startYRef.current));
  }

  function handleTouchEnd() {
    startYRef.current = null;
    setDragging(false);
    if (dragY > SWIPE_DISMISS_PX) {
      onOpenChange(false);
    } else {
      setDragY(0);
      armTimer();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          ...TODAY_FONT,
          background: TODAY.bg,
          borderRadius: "30px 30px 0 0",
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          // The finger leads directly during a drag; the base sheet's own
          // transition handles the spring-back once released.
          transition: dragging ? "none" : undefined,
        }}
        className="mx-auto w-full border-none px-6 pt-3.5 pb-8 shadow-[0_-12px_40px_-12px_rgba(20,23,15,0.3)] sm:max-w-lg"
      >
        <SheetTitle className="sr-only">Notificare</SheetTitle>

        <div
          className="mx-auto h-[5px] w-[38px] rounded-full"
          style={{ background: TODAY.handleBar }}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Închide"
          className="absolute top-4 right-5 flex size-8 items-center justify-center rounded-full"
          style={{ background: TODAY.chip }}
        >
          <XIcon className="size-3.5" style={{ color: TODAY.ink }} />
        </button>

        {nudge && (
          <p
            aria-live="polite"
            className="mt-5 pr-10 text-[15px] leading-relaxed font-semibold"
            style={{ color: TODAY.ink }}
          >
            {nudge.message}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
