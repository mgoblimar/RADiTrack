"use client";

import { useEffect, useState } from "react";

/**
 * Calls a list server action whenever `args` (or `refresh`) changes, and keeps the last result
 * on screen while the next one loads. A slower, older response never replaces a newer one.
 */
export function useServerList<A, T>(
  action: (args: A) => Promise<T>,
  args: A,
  errorText: string,
  refresh = 0,
): { data: T | null; error: string | null; isLoading: boolean } {
  const key = JSON.stringify({ args, refresh });
  const [loaded, setLoaded] = useState<{ key: string; data: T | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const request = (JSON.parse(key) as { args: A }).args;
    action(request)
      .then((data) => { if (!cancelled) setLoaded({ key, data, error: null }); })
      .catch(() => { if (!cancelled) setLoaded((last) => ({ key, data: last?.data ?? null, error: errorText })); });
    return () => { cancelled = true; };
  }, [action, key, errorText]);

  return {
    data: loaded?.data ?? null,
    error: loaded?.key === key ? loaded.error : null,
    isLoading: loaded?.key !== key,
  };
}
