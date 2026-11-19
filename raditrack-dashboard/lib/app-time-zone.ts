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

// ---------------------------------------------------------------------------
// Browser-safe helpers (Def-CAL-02): the browser runs in the VIEWER's time zone,
// so "today" must be taken from Manila's clock, not the device's.
// ---------------------------------------------------------------------------

const manilaParts = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Manila's current wall-clock time, as a Date whose LOCAL fields (getFullYear, getDate,
 * getHours...) read Manila's values on any device. Use it for calendar maths and labels
 * ("today", this week, this month); never compare it with real timestamps.
 */
export function manilaNow(now: Date = new Date()): Date {
  const part = (type: string) => Number(manilaParts.formatToParts(now).find((p) => p.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
}

/** The Manila calendar date of a real timestamp, as "YYYY-MM-DD". */
export function manilaIsoDate(at: Date = new Date()): string {
  const d = manilaNow(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
