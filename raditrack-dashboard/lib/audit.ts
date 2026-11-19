// Examination audit log and upload (import batch) log.
//
// Every write goes through the same database transaction as the change it
// describes, so a log entry can never exist without its change, or a change
// without its log entry. Server-only module: no "use server" (these helpers
// must never become public endpoints).

import { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth/roles";

export type Tx = Prisma.TransactionClient;

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "SIGN_OFF"
  | "CANCEL"
  | "DELETE"
  | "IMPORT_INSERT"
  | "IMPORT_UPDATE"
  | "AMEND"
  | "AMEND_SKIPPED"
  | "REFUSED_SIGNED_OFF"
  | "REFUSED_CANCELLED"
  | "RADIOLOGIST_ADDED";

export type AuditSource = "MANUAL" | "IMPORT" | "SIMULATOR" | "RIS_SYNC";

import { diffFields, type FieldChanges } from "@/lib/field-changes";

export { diffFields, type FieldChanges };

export interface Actor {
  userId: string;
  username: string;
}

export interface ExamChange {
  examId: string | null;
  accession: string;
  action: AuditAction;
  changes?: FieldChanges | null;
}

export const EXAMS_BACKUP_TABLE = "examinations_backup";

/** Test mode is ON exactly while the backup table exists (see app/actions/dataset.ts). */
export async function isTestModeActive(db: Tx): Promise<boolean> {
  const rows = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ${EXAMS_BACKUP_TABLE}
    ) AS "exists"`;
  return rows[0]?.exists ?? false;
}

export function actorOf(user: Pick<CurrentUser, "userId" | "username">): Actor {
  return { userId: user.userId, username: user.username };
}

/** Writes audit entries inside the caller's transaction. */
export async function recordExamChanges(
  tx: Tx,
  entries: readonly ExamChange[],
  context: { actor: Actor; source: AuditSource; batchId?: string | null; testMode: boolean },
): Promise<void> {
  if (entries.length === 0) return;
  await tx.examinationAuditLog.createMany({
    data: entries.map((entry) => ({
      examId: entry.examId,
      accession: entry.accession,
      action: entry.action,
      source: context.source,
      changes: entry.changes && Object.keys(entry.changes).length > 0
        ? (entry.changes as Prisma.InputJsonValue)
        : Prisma.DbNull,
      batchId: context.batchId ?? null,
      actorUserId: context.actor.userId,
      actorUsername: context.actor.username,
      testMode: context.testMode,
    })),
  });
}

export interface ImportBatchCounts {
  rowsInFile: number;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  amended?: number;
  refused?: number;
  errorRows?: number;
}

export interface ImportBatchInput extends ImportBatchCounts {
  batchId: string;
  fileName: string;
  mode: "append" | "test";
  actor: Actor;
  status: "SUCCESS" | "FAILED";
  message?: string | null;
  testMode: boolean;
}

/** One row per upload attempt. Use `tx` for a successful import, the plain client for a failed one. */
export async function recordImportBatch(db: Tx, input: ImportBatchInput) {
  return db.importBatch.create({
    data: {
      batchId: input.batchId,
      fileName: input.fileName.slice(0, 255) || "(no file name)",
      mode: input.mode,
      uploadedByUserId: input.actor.userId,
      uploadedByUsername: input.actor.username,
      rowsInFile: input.rowsInFile,
      inserted: input.inserted ?? 0,
      updated: input.updated ?? 0,
      unchanged: input.unchanged ?? 0,
      amended: input.amended ?? 0,
      refused: input.refused ?? 0,
      errorRows: input.errorRows ?? 0,
      status: input.status,
      message: input.message?.slice(0, 1000) ?? null,
      testMode: input.testMode,
    },
  });
}

/** Exam fields recorded in the audit log. */
export const AUDITED_EXAM_FIELDS = [
  "examinationIdentifier",
  "modalityCode",
  "triageLevel",
  "statusCode",
  "studyDate",
  "examCompletedAt",
  "notes",
] as const;

/** Report fields recorded in the audit log. */
export const AUDITED_REPORT_FIELDS = [
  "reportSignedAt",
  "tatExamToSignMinutes",
  "isSlaBreached",
  "lastAmendedAt",
] as const;
