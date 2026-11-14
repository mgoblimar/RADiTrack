/**
 * RADiTrack runs on Philippine time: a "day" is midnight to midnight in Manila.
 *
 * Servers such as Vercel run in UTC, so without this every server-side "today",
 * week, month and printed time would be 8 hours behind. Vercel reserves the TZ
 * environment variable, so it is set in code at server start (instrumentation.ts)
 * and in local scripts. Node applies a TZ change immediately.
 */
export const APP_TIME_ZONE = "Asia/Manila";

export function applyAppTimeZone(): void {
  process.env.TZ = APP_TIME_ZONE;
}
