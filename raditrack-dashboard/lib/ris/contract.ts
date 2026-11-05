// The read-only view RADiTrack expects the hospital to expose in its RIS
// (Microsoft SQL Server). Hospital IT maps their own tables onto these columns;
// RADiTrack never reads anything else. See docs/ris-integration.md.

import type { RawRow } from "@/lib/exam-import";

/** Default fully-qualified view name; override with RIS_VIEW. */
export const DEFAULT_RIS_VIEW = "raditrack.vw_exams";

export const RIS_COLUMNS = [
  { name: "accession_number", type: "varchar(64)", required: true, meaning: "Unique exam identifier (accession number). No patient name or ID." },
  { name: "modality_code", type: "varchar(16)", required: true, meaning: "CR/DX/XR (X-ray), MG (Mammography), US, CT, MR (MRI)." },
  { name: "patient_class", type: "varchar(16)", required: true, meaning: "O/OPD (outpatient), I/IN (inpatient), E/ER (emergency)." },
  { name: "study_datetime", type: "datetime2", required: true, meaning: "When the study took place (local hospital time)." },
  { name: "exam_completed_datetime", type: "datetime2", required: false, meaning: "When imaging finished. NULL if not yet completed." },
  { name: "report_signed_datetime", type: "datetime2", required: false, meaning: "When the final report was signed. NULL if pending." },
  { name: "exam_status", type: "varchar(32)", required: false, meaning: "Cancelled exams must say CANCELLED (or CANCELED / CA); anything else may be any value." },
  { name: "last_updated", type: "datetime2", required: true, meaning: "When the row last changed. Used to fetch only new/changed rows." },
] as const;

export type RisColumn = (typeof RIS_COLUMNS)[number]["name"];

const CANCELLED_VALUES = new Set(["CANCELLED", "CANCELED", "CA", "CANCEL", "X"]);

/** Lower-cases keys so the view can use any column-name casing. */
function normalizeKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
}

/** Missing required columns in a row from the view (used by --check). */
export function missingColumns(row: Record<string, unknown>): RisColumn[] {
  const keys = new Set(Object.keys(normalizeKeys(row)));
  return RIS_COLUMNS.filter((c) => c.required && !keys.has(c.name)).map((c) => c.name);
}

type Cell = RawRow[string];

const asCell = (value: unknown): Cell =>
  value === null || value === undefined || value instanceof Date || ["string", "number", "boolean"].includes(typeof value)
    ? (value as Cell)
    : String(value);

/**
 * Maps one view row onto the importer's column names, so it goes through the
 * same validation as spreadsheet imports (lib/exam-import.ts).
 */
export function risRowToRawRow(row: Record<string, unknown>): RawRow {
  const r = normalizeKeys(row);
  const status = String(r.exam_status ?? "").trim().toUpperCase();
  return {
    accession: asCell(r.accession_number),
    modality: asCell(r.modality_code),
    patient_category: asCell(r.patient_class),
    study_date: asCell(r.study_datetime),
    exam_completed_at: asCell(r.exam_completed_datetime),
    report_signed_at: asCell(r.report_signed_datetime),
    status: CANCELLED_VALUES.has(status) ? "CANCELLED" : undefined,
  };
}
