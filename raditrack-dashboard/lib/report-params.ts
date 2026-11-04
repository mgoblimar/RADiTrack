// Configuration for the printable PDF report, shared by the builder dialog
// (which writes it into the /report URL) and the report page (which reads it).

import { ModalityCode, TriageLevel } from "@/lib/enums";
import { capAtToday, resolveKpiRange, toIsoDate, type KpiPreset } from "@/lib/kpi-range";

export const REPORT_SECTIONS = [
  { id: "kpi", label: "Executive summary (KPI cards)" },
  { id: "modality", label: "Turnaround Time by modality (chart + table)" },
  { id: "sla", label: "SLA compliance by modality" },
  { id: "daily", label: "Daily breakdown (7 days ending on the end date)" },
  { id: "trend", label: "12-month trend (with previous-month comparison)" },
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number]["id"];

export interface ReportConfig {
  title: string;
  preparedBy: string;
  notes: string;
  preset: KpiPreset;
  /** Local "YYYY-MM-DD"; used when preset is CUSTOM. */
  startDate: string;
  endDate: string;
  modality: "ALL" | ModalityCode;
  triage: "ALL" | TriageLevel;
  sections: ReportSection[];
}

export const DEFAULT_REPORT_TITLE = "Radiology Turnaround Time Summary";

const MAX_TITLE = 120;
const MAX_PREPARED_BY = 80;
const MAX_NOTES = 1500;

const PRESETS: readonly KpiPreset[] = [
  "ALL", "TODAY", "ROLLING_7D", "WEEK", "LAST_WEEK", "MONTH", "LAST_MONTH", "YEAR", "CUSTOM",
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SECTION_IDS = REPORT_SECTIONS.map((s) => s.id) as readonly string[];

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? "";

const clean = (value: string, max: number) => value.trim().slice(0, max);

function pickEnum<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Validates untrusted URL params into a safe ReportConfig with defaults. */
export function parseReportParams(raw: RawParams): ReportConfig {
  const today = toIsoDate(new Date());
  const preset = pickEnum(first(raw.preset), PRESETS, "ROLLING_7D");

  let startDate = ISO_DATE.test(first(raw.start)) ? first(raw.start) : today;
  let endDate = ISO_DATE.test(first(raw.end)) ? first(raw.end) : today;
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate];

  const requested = first(raw.sections).split(",").filter((id) => SECTION_IDS.includes(id));
  const sections = (requested.length > 0 ? requested : SECTION_IDS) as ReportSection[];

  return {
    title: clean(first(raw.title), MAX_TITLE) || DEFAULT_REPORT_TITLE,
    preparedBy: clean(first(raw.by), MAX_PREPARED_BY),
    notes: clean(first(raw.notes), MAX_NOTES),
    preset,
    startDate,
    endDate,
    modality: pickEnum(first(raw.modality), ["ALL", ...Object.values(ModalityCode)], "ALL"),
    triage: pickEnum(first(raw.triage), ["ALL", ...Object.values(TriageLevel)], "ALL"),
    sections,
  };
}

/** Builds the /report query string for a config. */
export function buildReportQuery(config: ReportConfig): string {
  const params = new URLSearchParams({
    title: config.title,
    preset: config.preset,
    modality: config.modality,
    triage: config.triage,
    sections: config.sections.join(","),
  });
  if (config.preset === "CUSTOM") {
    params.set("start", config.startDate);
    params.set("end", config.endDate);
  }
  if (config.preparedBy) params.set("by", config.preparedBy);
  if (config.notes) params.set("notes", config.notes);
  return params.toString();
}

/** Concrete date window for a report config (same rules as the dashboard). */
export function resolveReportRange(config: ReportConfig, now: Date = new Date()) {
  const range = resolveKpiRange(config.preset, now, config.startDate, config.endDate);
  return {
    ...range,
    startIso: toIsoDate(range.start),
    endIso: toIsoDate(capAtToday(range.end, range.isAllTime, now)),
  };
}
