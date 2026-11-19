// Decides what a re-upload does to each exam (UAT Phase 2, decisions of 19 Nov 2026).
// Pure: no database. The preview and the commit both call it, the commit again
// inside its transaction because the database may have changed since the preview.
//
//   new accession                                   -> insert
//   not signed off, file changes something          -> update (any field)
//   same values                                     -> unchanged
//   signed off <= window days ago, file differs     -> amend (only if the admin confirms)
//   signed off  > window days ago, file differs     -> refused
//   cancelled in RADiTrack, file differs            -> refused
//
// TAT always stays on the FIRST sign-off: an amended sign-off time is kept apart.

import type { ExamImportRecord } from "@/lib/exam-import";
import { diffFields, type FieldChanges } from "@/lib/field-changes";

export const DEFAULT_AMENDMENT_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

/** The parts of a stored exam the planner compares. */
export interface ExistingExam {
  examId: string;
  examinationIdentifier: string;
  modalityCode: string;
  triageLevel: string;
  statusCode: string;
  studyDate: Date;
  examCompletedAt: Date | null;
  notes: string | null;
  report: { reportSignedAt: Date | null; lastAmendedAt: Date | null } | null;
}

export type PlanKind = "insert" | "update" | "unchanged" | "amend" | "refused";

export interface PlanRow {
  kind: PlanKind;
  rowNumber: number;
  accession: string;
  examId: string | null;
  /** What the file would change, `{ field: [now, in file] }`. */
  changes: FieldChanges;
  /** Why a row is refused. */
  reason?: string;
  /** Whole days since the first sign-off (signed-off exams only). */
  signedDaysAgo?: number;
}

export interface ImportPlan {
  rows: PlanRow[];
  counts: Record<PlanKind, number>;
}

const UNSIGNED_FIELDS = ["modalityCode", "triageLevel", "statusCode", "studyDate", "examCompletedAt", "reportSignedAt", "notes"] as const;
const SIGNED_FIELDS = ["modalityCode", "triageLevel", "studyDate", "examCompletedAt", "reportSignedAt", "notes"] as const;

const time = (value: string | Date | null | undefined) => (value ? new Date(value).getTime() : null);

/** The stored values in the same shape as a file record, for comparison. */
function storedValues(exam: ExistingExam) {
  const signed = exam.report?.lastAmendedAt ?? exam.report?.reportSignedAt ?? null;
  return {
    modalityCode: exam.modalityCode,
    triageLevel: exam.triageLevel,
    statusCode: exam.statusCode,
    studyDate: exam.studyDate,
    examCompletedAt: exam.examCompletedAt,
    reportSignedAt: signed,
    notes: exam.notes,
  };
}

/** File values; a blank optional field (notes) never erases a stored value. */
function fileValues(record: ExamImportRecord, exam: ExistingExam) {
  return {
    modalityCode: record.modalityCode,
    triageLevel: record.triageLevel,
    statusCode: record.statusCode,
    studyDate: new Date(record.studyDate),
    examCompletedAt: record.examCompletedAt ? new Date(record.examCompletedAt) : null,
    reportSignedAt: record.reportSignedAt ? new Date(record.reportSignedAt) : null,
    notes: record.notes ?? exam.notes,
  };
}

function planSignedOff(row: PlanRow, record: ExamImportRecord, exam: ExistingExam, now: Date, windowDays: number): PlanRow {
  const firstSigned = exam.report!.reportSignedAt!;
  const signedDaysAgo = Math.floor((now.getTime() - firstSigned.getTime()) / DAY_MS);
  const base = { ...row, signedDaysAgo };
  if (Object.keys(row.changes).length === 0) return { ...base, kind: "unchanged" };

  const refuse = (reason: string): PlanRow => ({ ...base, kind: "refused", reason });
  if (!record.reportSignedAt) return refuse("Already signed off; a file cannot remove a sign-off.");
  if (now.getTime() - firstSigned.getTime() > windowDays * DAY_MS) {
    return refuse(`Signed off ${signedDaysAgo} days ago; changes are allowed only within ${windowDays} days of sign-off.`);
  }
  const completed = time(record.examCompletedAt) ?? time(exam.examCompletedAt);
  if (completed !== null && completed >= firstSigned.getTime()) {
    return refuse("The completion time would be after the first sign-off.");
  }
  if (time(record.reportSignedAt)! < firstSigned.getTime()) {
    return refuse("The new sign-off time is earlier than the first sign-off.");
  }
  return { ...base, kind: "amend" };
}

/** Plans every record against the exams already stored (keyed by accession). */
export function planImport(
  records: readonly ExamImportRecord[],
  existing: ReadonlyMap<string, ExistingExam>,
  now: Date,
  windowDays: number = DEFAULT_AMENDMENT_WINDOW_DAYS,
): ImportPlan {
  const counts: Record<PlanKind, number> = { insert: 0, update: 0, unchanged: 0, amend: 0, refused: 0 };
  const rows = records.map((record): PlanRow => {
    const exam = existing.get(record.examinationIdentifier);
    const base: PlanRow = { kind: "insert", rowNumber: record.rowNumber, accession: record.examinationIdentifier, examId: null, changes: {} };
    if (!exam) return base;

    const isSigned = Boolean(exam.report?.reportSignedAt);
    const isCancelled = exam.statusCode === "CANCELLED";
    // Signed-off and cancelled exams: the status a file implies is not compared.
    const fields = isSigned || isCancelled ? SIGNED_FIELDS : UNSIGNED_FIELDS;
    const row: PlanRow = { ...base, examId: exam.examId, changes: diffFields(storedValues(exam), fileValues(record, exam), fields) };

    if (isSigned) return planSignedOff(row, record, exam, now, windowDays);
    if (Object.keys(row.changes).length === 0) return { ...row, kind: "unchanged" };
    if (isCancelled) {
      return { ...row, kind: "refused", reason: "Cancelled in RADiTrack; changes from a file are not applied." };
    }
    return { ...row, kind: "update" };
  });
  for (const row of rows) counts[row.kind]++;
  return { rows, counts };
}
