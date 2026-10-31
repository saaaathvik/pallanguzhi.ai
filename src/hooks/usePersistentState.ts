import { useEffect, useState } from 'react';

/** useState that remembers its value in localStorage. Storage failures (private mode etc.) are ignored. */
export function usePersistentState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null && (allowed as readonly string[]).includes(stored) ? (stored as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be blocked; the value then lasts only for this visit.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
