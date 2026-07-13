"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates numeric changes with an ease-out count rather than snapping —
 * counts up from 0 on first mount, and from the previous value on every
 * later change (e.g. right after logging a meal, so the update feels like
 * visible proof the log did something). Skips the animation under
 * prefers-reduced-motion: it's driven by rAF, not a CSS transition, so the
 * global reduced-motion override in globals.css doesn't reach it.
 */
export function useCountUp(target: number, durationMs = 800): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}
