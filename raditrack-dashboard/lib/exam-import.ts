// Parses and validates examination rows from an imported spreadsheet (XLSX/CSV).
// Pure functions only (no database) so the importer, the bundled test dataset
// and the verification script all share exactly the same rules.
//
// Each row can give its times in one of two ways:
//   Absolute: Study_Date, Exam_Completed_At, Report_Signed_At (blank = pending)
//   Relative: Anchor (+ Month_Offset) + Day_Offset + Study_Time,
//             Completed_After_Min, TAT_Min
//             (blank TAT_Min = pending). Used by the test dataset so its dates
//             always line up with "today", this week and this month.

import {
  ExaminationStatusCode,
  ModalityCode,
  TriageLevel,
} from "@/lib/enums";

export const MAX_IMPORT_ROWS = 5000;

export type DateAnchor = "TODAY" | "WEEK_START" | "MONTH_START";
const ANCHORS: readonly DateAnchor[] = ["TODAY", "WEEK_START", "MONTH_START"];

/** A validated exam ready to insert. Dates are ISO strings so it can cross the client/server boundary. */
export interface ExamImportRecord {
  rowNumber: number;
  examinationIdentifier: string;
  modalityCode: ModalityCode;
  triageLevel: TriageLevel;
  statusCode: ExaminationStatusCode;
  studyDate: string;
  examCompletedAt: string | null;
  reportSignedAt: string | null;
  notes: string | null;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ImportParseResult {
  records: ExamImportRecord[];
  errors: ImportRowError[];
}

type RawValue = string | number | boolean | Date | null | undefined;
export type RawRow = Record<string, RawValue>;

/** "Exam Completed At" / "exam_completed_at" -> "exam_completed_at" */
export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const COLUMN_ALIASES: Record<string, string[]> = {
  accession: ["accession", "examination_identifier", "accession_identifier", "exam_identifier"],
  modality: ["modality", "modality_code"],
  category: ["patient_category", "triage_level", "category"],
  status: ["status", "status_code"],
  notes: ["notes", "clinical_indication"],
  studyDate: ["study_date", "study_datetime"],
  completedAt: ["exam_completed_at", "completed_at"],
  signedAt: ["report_signed_at", "signed_at"],
  anchor: ["anchor"],
  monthOffset: ["month_offset"],
  dayOffset: ["day_offset", "days_offset"],
  studyTime: ["study_time"],
  completedAfterMin: ["completed_after_min"],
  tatMin: ["tat_min", "tat_minutes"],
};

function pick(row: RawRow, key: keyof typeof COLUMN_ALIASES): RawValue {
  for (const alias of COLUMN_ALIASES[key]) {
    const value = row[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

const text = (value: RawValue) => (value === undefined || value === null ? "" : String(value).trim());

// Includes standard DICOM modality codes (CR/DX/XR, MG, US, CT, MR) used by RIS/PACS.
const MODALITY_ALIASES: Record<string, ModalityCode> = {
  XRAY: ModalityCode.XRAY, XR: ModalityCode.XRAY, "X-RAY": ModalityCode.XRAY, CR: ModalityCode.XRAY, DX: ModalityCode.XRAY,
  MAMMO: ModalityCode.MAMMO, MAMMOGRAPHY: ModalityCode.MAMMO, MAMMOGRAM: ModalityCode.MAMMO, MG: ModalityCode.MAMMO,
  US: ModalityCode.US, ULTRASOUND: ModalityCode.US,
  CT: ModalityCode.CT, "CT-SCAN": ModalityCode.CT,
  MRI: ModalityCode.MRI, MR: ModalityCode.MRI,
};

// Includes HL7 patient classes (O = outpatient, I = inpatient, E = emergency).
const CATEGORY_ALIASES: Record<string, TriageLevel> = {
  OPD: TriageLevel.OPD, OUTPATIENT: TriageLevel.OPD, O: TriageLevel.OPD,
  IN: TriageLevel.IN, INPATIENT: TriageLevel.IN, I: TriageLevel.IN, IPD: TriageLevel.IN,
  ER: TriageLevel.ER, EMERGENCY: TriageLevel.ER, E: TriageLevel.ER,
};

/** Start of the anchor day in local time. `monthOffset` shifts MONTH_START by whole months. */
export function anchorDate(anchor: DateAnchor, now: Date, monthOffset = 0): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (anchor === "WEEK_START") {
    const day = today.getDay();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - (day === 0 ? 6 : day - 1));
  }
  if (anchor === "MONTH_START") return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  return today;
}

/** Parses "HH:MM" or an Excel time fraction into minutes after midnight. */
function parseTimeOfDay(value: RawValue): number | null {
  if (value instanceof Date) return value.getUTCHours() * 60 + value.getUTCMinutes();
  if (typeof value === "number" && value >= 0 && value < 1) return Math.round(value * 24 * 60);
  const match = /^(\d{1,2}):(\d{2})$/.exec(text(value));
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[1]) < 24 && Number(match[2]) < 60 ? minutes : null;
}

/** Parses a date/datetime cell as local time. Accepts Date, "YYYY-MM-DD[ HH:MM[:SS]]" and ISO strings. */
function parseDateTime(value: RawValue): Date | null {
  if (value instanceof Date) {
    // Spreadsheet dates carry no timezone: read their wall-clock fields as local time.
    return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(),
      value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds());
  }
  const raw = text(value);
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(raw);
  if (local) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = local;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
  }
  const parsed = raw ? new Date(raw) : null;
  return parsed && !isNaN(parsed.getTime()) ? parsed : null;
}

function parseNumber(value: RawValue): number | null {
  if (value === undefined || value === null || text(value) === "") return null;
  const n = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(n) ? n : null;
}

interface ResolvedTimes {
  studyDate: Date;
  examCompletedAt: Date | null;
  reportSignedAt: Date | null;
}

function resolveRelativeTimes(row: RawRow, now: Date): ResolvedTimes | string {
  const anchor = (text(pick(row, "anchor")).toUpperCase() || "TODAY") as DateAnchor;
  if (!ANCHORS.includes(anchor)) return `Anchor must be one of ${ANCHORS.join(", ")}.`;
  const monthOffset = parseNumber(pick(row, "monthOffset")) ?? 0;
  if (!Number.isInteger(monthOffset)) return "Month_Offset must be a whole number of months.";
  if (monthOffset !== 0 && anchor !== "MONTH_START") return "Month_Offset only works with Anchor MONTH_START.";
  const offset = parseNumber(pick(row, "dayOffset"));
  if (offset === null || !Number.isInteger(offset)) return "Day_Offset must be a whole number of days.";
  const minuteOfDay = parseTimeOfDay(pick(row, "studyTime"));
  if (minuteOfDay === null) return "Study_Time must be HH:MM (24-hour).";

  const base = anchorDate(anchor, now, monthOffset);
  const studyDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 0, minuteOfDay);
  const completedAfter = parseNumber(pick(row, "completedAfterMin")) ?? 0;
  if (completedAfter < 0) return "Completed_After_Min cannot be negative.";
  const examCompletedAt = new Date(studyDate.getTime() + completedAfter * 60_000);
  const tat = parseNumber(pick(row, "tatMin"));
  if (tat !== null && tat <= 0) return "TAT_Min must be greater than 0 (leave blank for pending).";
  const reportSignedAt = tat === null ? null : new Date(examCompletedAt.getTime() + tat * 60_000);
  return { studyDate, examCompletedAt, reportSignedAt };
}

function resolveAbsoluteTimes(row: RawRow): ResolvedTimes | string {
  const studyDate = parseDateTime(pick(row, "studyDate"));
  if (!studyDate) return "Study_Date is missing or not a valid date (use YYYY-MM-DD HH:MM).";
  const completedRaw = pick(row, "completedAt");
  const signedRaw = pick(row, "signedAt");
  const examCompletedAt = completedRaw === undefined ? null : parseDateTime(completedRaw);
  if (completedRaw !== undefined && !examCompletedAt) return "Exam_Completed_At is not a valid date.";
  const reportSignedAt = signedRaw === undefined ? null : parseDateTime(signedRaw);
  if (signedRaw !== undefined && !reportSignedAt) return "Report_Signed_At is not a valid date.";
  return { studyDate, examCompletedAt, reportSignedAt };
}

function parseRow(row: RawRow, rowNumber: number, now: Date): ExamImportRecord | string {
  const examinationIdentifier = text(pick(row, "accession"));
  if (!examinationIdentifier) return "Accession is required.";
  if (examinationIdentifier.length > 64) return "Accession must be 64 characters or fewer.";

  const modalityCode = MODALITY_ALIASES[text(pick(row, "modality")).toUpperCase()];
  if (!modalityCode) return `Unknown modality "${text(pick(row, "modality"))}" (use XRAY, MAMMO, US, CT or MRI).`;

  const triageLevel = CATEGORY_ALIASES[text(pick(row, "category")).toUpperCase()];
  if (!triageLevel) return `Unknown patient category "${text(pick(row, "category"))}" (use OPD, IN or ER).`;

  const usesRelative = pick(row, "dayOffset") !== undefined || pick(row, "anchor") !== undefined;
  const times = usesRelative ? resolveRelativeTimes(row, now) : resolveAbsoluteTimes(row);
  if (typeof times === "string") return times;

  if (times.reportSignedAt && !times.examCompletedAt) return "A signed report needs Exam_Completed_At.";
  if (times.examCompletedAt && times.examCompletedAt < times.studyDate) return "Exam_Completed_At is before Study_Date.";
  if (times.reportSignedAt && times.examCompletedAt && times.reportSignedAt <= times.examCompletedAt) {
    return "Report_Signed_At must be after Exam_Completed_At.";
  }
  if (times.examCompletedAt && times.examCompletedAt > now) return "Exam_Completed_At is in the future.";
  if (times.reportSignedAt && times.reportSignedAt > now) return "Report_Signed_At is in the future.";

  const statusText = text(pick(row, "status")).toUpperCase();
  let statusCode: ExaminationStatusCode;
  if (statusText) {
    if (!(Object.values(ExaminationStatusCode) as string[]).includes(statusText)) return `Unknown status "${statusText}".`;
    statusCode = statusText as ExaminationStatusCode;
  } else {
    statusCode = times.reportSignedAt
      ? ExaminationStatusCode.COMPLETED_SIGNED_OFF
      : times.examCompletedAt
        ? ExaminationStatusCode.EXAM_COMPLETED
        : ExaminationStatusCode.IN_PROGRESS;
  }

  return {
    rowNumber,
    examinationIdentifier,
    modalityCode,
    triageLevel,
    statusCode,
    studyDate: times.studyDate.toISOString(),
    examCompletedAt: times.examCompletedAt?.toISOString() ?? null,
    reportSignedAt: times.reportSignedAt?.toISOString() ?? null,
    notes: text(pick(row, "notes")).slice(0, 500) || null,
  };
}

/**
 * Validates spreadsheet rows. `rows` use normalized header keys; row numbers
 * start at 2 (row 1 is the header) to match what users see in Excel.
 */
export function parseExamRows(rows: RawRow[], now: Date = new Date()): ImportParseResult {
  if (rows.length > MAX_IMPORT_ROWS) {
    return { records: [], errors: [{ rowNumber: 0, message: `Too many rows (${rows.length}); the limit is ${MAX_IMPORT_ROWS}.` }] };
  }

  const records: ExamImportRecord[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = parseRow(row, rowNumber, now);
    if (typeof result === "string") {
      errors.push({ rowNumber, message: result });
      return;
    }
    if (seen.has(result.examinationIdentifier)) {
      errors.push({ rowNumber, message: `Duplicate accession "${result.examinationIdentifier}" in this file.` });
      return;
    }
    seen.add(result.examinationIdentifier);
    records.push(result);
  });

  return { records, errors };
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(content: string): RawRow[] {
  const table: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && content[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((cell) => cell.trim() !== "")) table.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) table.push(row);

  const [header, ...body] = table;
  if (!header) return [];
  const keys = header.map((h) => normalizeHeader(h.replace(/^﻿/, "")));
  return body.map((cells) => Object.fromEntries(keys.map((key, i) => [key, cells[i] ?? ""])));
}
