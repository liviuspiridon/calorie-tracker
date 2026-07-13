"use client";

import { useEffect, useState } from "react";

/**
 * Returns true after the first client render.
 * Useful for anything that must not run during SSR (e.g. reading the theme).
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
