import type { CSSProperties } from "react";

/**
 * Colors for the approved "Balance Today" design (Claude Design project
 * e4130fca-7e23-491f-a494-64c6f6ce50f7, "Balance Today.dc.html"). Scoped to
 * the Today screen's own components — the rest of the app keeps its
 * existing token palette (src/app/globals.css), since only Today was
 * designed and approved. Lives in src/lib (not components/dashboard)
 * because it's also consumed by features/meal-logging's LogMealSheet,
 * which the Today screen reuses rather than duplicates.
 *
 * Plain hex/rgba constants, not Tailwind classes or CSS custom properties:
 * Tailwind can't statically resolve a dynamic arbitrary value built from a
 * shared JS constant, and several of these components (sheets) render into
 * a portal outside this screen's own DOM subtree, so a scoped ancestor
 * class wouldn't reach them. Inline styles work identically in both places.
 */
export const TODAY = {
  bg: "#FCFCFA",
  surface: "#F4F1EA",
  ink: "#14170F",
  ink40: "rgba(20,23,15,0.4)",
  ink45: "rgba(20,23,15,0.45)",
  ink50: "rgba(20,23,15,0.5)",
  ink55: "rgba(20,23,15,0.55)",
  ink60: "rgba(20,23,15,0.6)",
  ink62: "rgba(20,23,15,0.62)",
  hairline: "rgba(20,23,15,0.07)",
  hairlineSoft: "rgba(20,23,15,0.06)",
  hairlineStrong: "rgba(20,23,15,0.08)",
  chip: "#F0EEE7",
  chip2: "#F1EFE8",
  track: "#ECEAE1",
  accent: "#C7F04A",
  accentInk: "#7C9B2F",
  todayHighlight: "#EBF3D2",
  handleBar: "rgba(20,23,15,0.14)",
  /** Soft, desaturated terracotta accent — the warm counterpoint to the
   *  lime/olive calorie palette. Solid form for strokes/dots (chart lines),
   *  fill form for translucent fills (e.g. the budget meter's deficit block). */
  clay: "#BF7A5E",
  clayFill: "rgba(191,122,94,0.35)",
} as const;

/** Applied at the root of every Today-screen surface, incl. each sheet (see header above). */
export const TODAY_FONT: CSSProperties = {
  fontFamily: "var(--font-manrope)",
};
