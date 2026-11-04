import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "raditrack:persisted-boolean";

function readValue(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * A boolean kept in localStorage. Renders `fallback` on the server and during
 * hydration, then the saved value, without a setState-in-effect round trip.
 */
export function usePersistedBoolean(
  key: string,
  fallback: boolean,
): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => readValue(key, fallback),
    () => fallback,
  );

  const toggle = useCallback(() => {
    try {
      localStorage.setItem(key, String(!readValue(key, fallback)));
    } catch {
      // Ignore localStorage errors (e.g. private mode).
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [key, fallback]);

  return [value, toggle];
}
