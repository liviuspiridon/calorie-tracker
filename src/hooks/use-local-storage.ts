"use client";

import { useEffect, useState } from "react";

/**
 * Persists state to localStorage. Renders with `initialValue` on the server
 * and first client paint (no hydration mismatch), then hydrates from storage
 * right after mount. The write effect is held off until hydration has run,
 * so it never clobbers stored data with the pre-hydration initial value.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // malformed or inaccessible storage — fall back to initialValue
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private browsing, quota) — fail silently
    }
  }, [hydrated, key, value]);

  return [value, setValue] as const;
}
