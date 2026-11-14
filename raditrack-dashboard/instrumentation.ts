import { applyAppTimeZone } from "@/lib/app-time-zone";

/** Runs once when the server starts, before it handles any request. */
export function register(): void {
  // Edge code (proxy.ts) does no date math and has no process.env.TZ.
  if (process.env.NEXT_RUNTIME === "nodejs") applyAppTimeZone();
}
