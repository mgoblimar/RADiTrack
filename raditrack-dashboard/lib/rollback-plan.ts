// Decides whether an upload can be undone, and what undoing it changes (UPL-34).
// Pure: no database, so the rules can be checked on their own.
//
// Rules (agreed 21 Nov 2026):
// - A whole upload is undone, never part of one.
// - Only an "Add or update" upload that succeeded, within the amendment window.
// - Only while the same data is loaded (real or test) as when it was uploaded.
// - If any exam from the upload was changed again afterwards (or deleted), nothing is undone.
//   "Changed" means a later data-changing audit entry, OR its current values no longer being the
//   values the upload wrote (this also catches a change that committed while the undo was starting).

import type { FieldChanges } from "@/lib/field-changes";

export type Scalar = string | number | boolean | null;

/** Audit actions that changed data. Skipped or refused rows changed nothing, so they never block an undo. */
export const DATA_CHANGING_ACTIONS = [
  "CREATE", "UPDATE", "SIGN_OFF", "CANCEL", "DELETE",
  "IMPORT_INSERT", "IMPORT_UPDATE", "AMEND",
  "ROLLBACK_REMOVE", "ROLLBACK_RESTORE",
] as const;

/** Upload changes an undo reverses. */
const UNDOABLE = ["IMPORT_INSERT", "IMPORT_UPDATE", "AMEND"] as const;

export const EXAM_RESTORE_FIELDS = ["modalityCode", "triageLevel", "statusCode", "studyDate", "examCompletedAt", "notes"] as const;
export const REPORT_RESTORE_FIELDS = ["tatExamToSignMinutes", "isSlaBreached", "lastAmendedAt", "radiologistId", "reportStatus"] as const;
const DATE_FIELDS = new Set(["studyDate", "examCompletedAt", "lastAmendedAt", "reportSignedAt"]);
/** Audit fields that describe the change rather than a stored value. */
const NOT_STORED = new Set(["reason", "attempted"]);

export interface RollbackBatch {
  batchId: string;
  mode: string;
  status: string;
  uploadedAt: Date;
  testMode: boolean;
}

export interface RollbackEntry {
  examId: string | null;
  accession: string;
  action: string;
  changes: FieldChanges | null;
}

/** A data-changing audit entry made after the upload, by anyone, outside this upload. */
export interface LaterChange {
  examId: string | null;
  accession: string;
  action: string;
}

/**
 * An exam's stored values now, keyed like audit fields. `reportSignedAt` is the effective
 * sign-off (lastAmendedAt ?? reportSignedAt), as the import records it; dates as ISO strings.
 */
export type CurrentValues = Record<string, Scalar>;

/** One exam to put back the way it was before the upload. */
export interface ExamRestore {
  examId: string;
  accession: string;
  action: "IMPORT_UPDATE" | "AMEND";
  /** Exam columns and their values before the upload (dates as Date). */
  exam: Record<string, Scalar | Date>;
  /** Report columns and their values before the upload. */
  report: Record<string, Scalar | Date>;
  /** The upload signed off an exam that was pending: remove the sign-off again. */
  removeSignOff: boolean;
  /** Values now (what the upload wrote), for the undo's own audit entry. */
  current: CurrentValues;
}

export interface ExamRemove {
  examId: string;
  accession: string;
  current: CurrentValues;
}

export type RollbackPlan =
  | { ok: false; reason: string; blockedBy?: string[] }
  | { ok: true; remove: ExamRemove[]; restore: ExamRestore[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function toValue(field: string, value: Scalar): Scalar | Date {
  if (value !== null && DATE_FIELDS.has(field)) return new Date(String(value));
  return value;
}

/** The before-values of `fields` that the entry changed. */
function beforeValues(changes: FieldChanges, fields: readonly string[]): Record<string, Scalar | Date> {
  const values: Record<string, Scalar | Date> = {};
  for (const field of fields) {
    if (field in changes) values[field] = toValue(field, changes[field][0]);
  }
  return values;
}

const same = (a: Scalar, b: Scalar) => a === b || (a !== null && b !== null && String(a) === String(b));

/** True when every value the upload wrote is still what is stored. */
function stillAsUploaded(changes: FieldChanges, current: CurrentValues | undefined): boolean {
  if (!current) return false;
  return Object.entries(changes).every(([field, [, after]]) => NOT_STORED.has(field) || !(field in current) || same(current[field], after));
}

export function planRollback(input: {
  batch: RollbackBatch | null;
  entries: readonly RollbackEntry[];
  laterChanges: readonly LaterChange[];
  /** Current values of the exams the upload touched; an exam missing here was deleted. */
  current: ReadonlyMap<string, CurrentValues>;
  now: Date;
  windowDays: number;
  testModeNow: boolean;
}): RollbackPlan {
  const { batch, entries, laterChanges, current, now, windowDays, testModeNow } = input;
  if (!batch) return { ok: false, reason: "This upload was not found." };
  if (batch.status === "ROLLED_BACK") return { ok: false, reason: "This upload has already been undone." };
  if (batch.status !== "SUCCESS") return { ok: false, reason: "This upload failed, so it changed nothing to undo." };
  if (batch.mode !== "append") {
    return { ok: false, reason: "A test-data load is undone with Restore real data on the RIS Simulator page, not here." };
  }
  if (batch.testMode !== testModeNow) {
    return {
      ok: false,
      reason: batch.testMode
        ? "This upload was made while test data was loaded, and the real data is loaded now."
        : "This upload was made on the real data, and test data is loaded now. Restore the real data first.",
    };
  }
  const ageDays = (now.getTime() - batch.uploadedAt.getTime()) / DAY_MS;
  if (ageDays > windowDays) {
    return { ok: false, reason: `Uploads can be undone for ${windowDays} day(s) (the amendment window); this one is ${Math.floor(ageDays)} day(s) old.` };
  }

  const undoable = entries.filter((e) => (UNDOABLE as readonly string[]).includes(e.action));
  if (undoable.length === 0) return { ok: false, reason: "This upload added or changed no exams, so there is nothing to undo." };

  // An upload touches each exam once; anything else means the log is not what this undo expects.
  const seen = new Set<string>();
  const twice = undoable.filter((e) => e.examId && (seen.has(e.examId) || !seen.add(e.examId))).map((e) => e.accession);
  if (twice.length > 0) {
    return { ok: false, reason: "This upload changed some exams more than once, so it cannot be undone automatically.", blockedBy: [...new Set(twice)].sort() };
  }

  const touched = new Set(undoable.map((e) => e.examId).filter((id): id is string => Boolean(id)));
  const changedSince = laterChanges
    .filter((c) => c.examId && touched.has(c.examId) && (DATA_CHANGING_ACTIONS as readonly string[]).includes(c.action))
    .map((c) => c.accession);
  const differs = undoable
    .filter((e) => !e.examId || !stillAsUploaded(e.changes ?? {}, current.get(e.examId)))
    .map((e) => e.accession);
  const blockedBy = [...new Set([...changedSince, ...differs])].sort();
  if (blockedBy.length > 0) {
    return {
      ok: false,
      reason: `${blockedBy.length} exam(s) from this upload were changed or deleted afterwards, so this upload cannot be undone. Nothing was changed.`,
      blockedBy,
    };
  }

  const remove: ExamRemove[] = [];
  const restore: ExamRestore[] = [];
  for (const entry of undoable) {
    const changes = entry.changes ?? {};
    const now = current.get(entry.examId!)!;
    if (entry.action === "IMPORT_INSERT") {
      remove.push({ examId: entry.examId!, accession: entry.accession, current: now });
      continue;
    }
    const signedBefore = changes.reportSignedAt?.[0] ?? null;
    const signedAfter = changes.reportSignedAt?.[1] ?? null;
    restore.push({
      examId: entry.examId!,
      accession: entry.accession,
      action: entry.action as "IMPORT_UPDATE" | "AMEND",
      exam: beforeValues(changes, EXAM_RESTORE_FIELDS),
      report: beforeValues(changes, REPORT_RESTORE_FIELDS),
      // Only an update can sign off a pending exam; an amendment never touches the first sign-off.
      removeSignOff: entry.action === "IMPORT_UPDATE" && signedBefore === null && signedAfter !== null,
      current: now,
    });
  }
  return { ok: true, remove, restore };
}
