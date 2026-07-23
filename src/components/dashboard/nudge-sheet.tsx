"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Nudge } from "@/features/nudge/nudge";
import { TODAY, TODAY_FONT } from "@/lib/today-theme";

const SWIPE_DISMISS_PX = 80;

/**
 * The lightweight post-log nudge: a bottom sheet in the same chrome as the
 * app's other bottom sheets (handle pill, rounded top, cream surface).
 * Dismisses on swipe-down, on the close icon, or on backdrop tap.
 *
 * Swipe-down is a real touch gesture, implemented locally rather than on
 * the shared Sheet primitive: the content tracks the finger via
 * translateY, springs back under the threshold, dismisses past it.
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

  React.useEffect(() => {
    if (!open) {
      setDragY(0);
      setDragging(false);
    }
  }, [open]);

  // Previne afișarea componentei și a fundalului dacă nu există niciun mesaj
  if (!nudge) {
    return null;
  }

  function handleTouchStart(event: React.TouchEvent) {
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
    }
  }

  return (
    <Sheet open={open && Boolean(nudge)} onOpenChange={onOpenChange}>
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
          transition: dragging ? "none" : undefined,
        }}
        className="relative mx-auto flex min-h-[160px] w-full flex-col justify-center border-none px-6 pt-6 pb-8 shadow-[0_-12px_40px_-12px_rgba(20,23,15,0.3)] sm:max-w-lg"
      >
        <SheetTitle className="sr-only">Notificare</SheetTitle>

        {/* Handle pill fixat în partea de sus a sheet-ului */}
        <div
          className="absolute top-3.5 left-1/2 h-[5px] w-[38px] -translate-x-1/2 rounded-full"
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

        <p
          aria-live="polite"
          className="pr-8 text-[15px] leading-relaxed font-semibold"
          style={{ color: TODAY.ink }}
        >
          {nudge.message}
        </p>
      </SheetContent>
    </Sheet>
  );
}