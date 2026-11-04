// Shared date-range logic for the staff dashboard's KPI presets.
// Used by the server KPI action and by the client (card subtitles and the
// instant local estimate) so both always agree on the same dates.

export type KpiPreset =
  | "ALL"
  | "TODAY"
  | "ROLLING_7D"
  | "WEEK"
  | "LAST_WEEK"
  | "MONTH"
  | "LAST_MONTH"
  | "YEAR"
  | "CUSTOM";

export interface KpiRange {
  start: Date;
  end: Date;
  priorStart: Date;
  priorEnd: Date;
  presetLabel: string;
  priorPeriodLabel: string;
  isAllTime: boolean;
  dateRangeFormatted: string;
  priorDateRangeFormatted: string;
}

/** Parses a "YYYY-MM-DD" string as a local date (no timezone shift). */
export function parseIsoDate(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatShortDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatMonthYear = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** Monday 00:00 of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return startOfDay(addDays(d, -(day === 0 ? 6 : day - 1)));
}

interface RawRange {
  start: Date;
  end: Date;
  priorStart: Date;
  priorEnd: Date;
  presetLabel: string;
  priorPeriodLabel: string;
  isAllTime?: boolean;
}

function computeRawRange(
  preset: KpiPreset,
  now: Date,
  startDate?: string,
  endDate?: string,
): RawRange {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "TODAY":
      return {
        start: todayStart,
        end: todayEnd,
        priorStart: addDays(todayStart, -1),
        priorEnd: addDays(todayEnd, -1),
        presetLabel: "Today",
        priorPeriodLabel: "Yesterday",
      };
    case "ROLLING_7D": {
      const start = addDays(todayStart, -6);
      return {
        start,
        end: todayEnd,
        priorStart: addDays(start, -7),
        priorEnd: new Date(start.getTime() - 1),
        presetLabel: "Rolling 7 Days",
        priorPeriodLabel: "Prior 7 Days",
      };
    }
    case "WEEK":
    case "LAST_WEEK": {
      const start = addDays(startOfWeek(now), preset === "LAST_WEEK" ? -7 : 0);
      const end = endOfDay(addDays(start, 6));
      return {
        start,
        end,
        priorStart: addDays(start, -7),
        priorEnd: addDays(end, -7),
        presetLabel: preset === "WEEK" ? "This Week (Mon–Sun)" : "Last Week (Mon–Sun)",
        priorPeriodLabel: preset === "WEEK" ? "Last Week" : "2 Weeks Ago",
      };
    }
    case "MONTH":
    case "LAST_MONTH": {
      const offset = preset === "LAST_MONTH" ? -1 : 0;
      const y = now.getFullYear();
      const m = now.getMonth() + offset;
      return {
        start: new Date(y, m, 1, 0, 0, 0, 0),
        end: new Date(y, m + 1, 0, 23, 59, 59, 999),
        priorStart: new Date(y, m - 1, 1, 0, 0, 0, 0),
        priorEnd: new Date(y, m, 0, 23, 59, 59, 999),
        presetLabel: preset === "MONTH" ? "This Month" : "Last Month",
        priorPeriodLabel: preset === "MONTH" ? "Last Month" : "2 Months Ago",
      };
    }
    case "YEAR": {
      const y = now.getFullYear();
      return {
        start: new Date(y, 0, 1, 0, 0, 0, 0),
        end: new Date(y, 11, 31, 23, 59, 59, 999),
        priorStart: new Date(y - 1, 0, 1, 0, 0, 0, 0),
        priorEnd: new Date(y - 1, 11, 31, 23, 59, 59, 999),
        presetLabel: "This Year",
        priorPeriodLabel: "Last Year",
      };
    }
    case "CUSTOM": {
      const s = startDate ? parseIsoDate(startDate) : null;
      const e = endDate ? parseIsoDate(endDate) : null;
      if (s && e) {
        const start = startOfDay(s);
        const end = endOfDay(e);
        const durationMs = end.getTime() - start.getTime() + 1;
        const priorEnd = new Date(start.getTime() - 1);
        return {
          start,
          end,
          priorStart: new Date(priorEnd.getTime() - durationMs + 1),
          priorEnd,
          presetLabel: "Custom Range",
          priorPeriodLabel: "Prior Period",
        };
      }
      break; // Incomplete custom range falls back to all time.
    }
  }

  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    start: new Date(2020, 0, 1, 0, 0, 0, 0),
    end: new Date(2035, 11, 31, 23, 59, 59, 999),
    priorStart: new Date(y, m - 1, 1, 0, 0, 0, 0),
    priorEnd: new Date(y, m, 0, 23, 59, 59, 999),
    presetLabel: "All Time",
    priorPeriodLabel: "Prev Month",
    isAllTime: true,
  };
}

function formatRange(preset: KpiPreset, start: Date, end: Date): string {
  if (preset === "TODAY") return formatShortDate(start);
  if (preset === "MONTH" || preset === "LAST_MONTH") return formatMonthYear(start);
  if (preset === "YEAR") return `${start.getFullYear()} Calendar Year`;
  if (start.getFullYear() === end.getFullYear()) {
    const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${short(start)} – ${formatShortDate(end)}`;
  }
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

export function resolveKpiRange(
  preset: KpiPreset,
  now: Date = new Date(),
  startDate?: string,
  endDate?: string,
): KpiRange {
  const raw = computeRawRange(preset, now, startDate, endDate);
  const isAllTime = Boolean(raw.isAllTime);

  return {
    ...raw,
    isAllTime,
    dateRangeFormatted: isAllTime
      ? "All Recorded Scans"
      : formatRange(preset, raw.start, raw.end),
    priorDateRangeFormatted: isAllTime
      ? formatMonthYear(raw.priorStart)
      : formatRange(preset, raw.priorStart, raw.priorEnd),
  };
}

/** Formats a date as local "YYYY-MM-DD". */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns `end`, or `now` when the window is all-time or ends in the future. */
export function capAtToday(end: Date, isAllTime: boolean, now: Date = new Date()): Date {
  return isAllTime || end.getTime() > now.getTime() ? now : end;
}
