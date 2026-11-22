// Applies a re-upload plan (lib/import-plan.ts) inside the import transaction.
// Server-only module: no "use server". Every function returns the audit entry
// for what it did; the caller records them in the same transaction.

import type { Prisma } from "@/generated/prisma/client";
import type { ExamImportRecord } from "@/lib/exam-import";
import type { ExistingExam, PlanRow } from "@/lib/import-plan";
import { diffFields, type FieldChanges } from "@/lib/field-changes";
import type { ExamChange } from "@/lib/audit";
import { ExaminationStatusCode, ReportStatusCode } from "@/lib/enums";

type Tx = Prisma.TransactionClient;

/** A stored exam with the report values an update or amendment may change. */
export interface StoredExam extends ExistingExam {
  report: {
    reportSignedAt: Date | null;
    lastAmendedAt: Date | null;
    tatExamToSignMinutes: number | null;
    isSlaBreached: boolean;
    radiologistId: string | null;
    reportStatus: string;
  } | null;
}

export type SlaTargetFor = (modality: string, triage: string) => number | undefined;

/** Lock key that makes imports run one at a time (released when the transaction ends). */
const IMPORT_LOCK_KEY = 42001;

export async function lockImports(tx: Tx): Promise<void> {
  // pg_advisory_xact_lock returns void, which Prisma cannot read: cast the result to text.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${IMPORT_LOCK_KEY}::bigint)::text AS locked`;
}

export async function loadExistingExams(db: Tx, accessions: readonly string[]): Promise<Map<string, StoredExam>> {
  if (accessions.length === 0) return new Map();
  const exams = await db.examination.findMany({
    where: { examinationIdentifier: { in: [...accessions] } },
    select: {
      examId: true, examinationIdentifier: true, modalityCode: true, triageLevel: true, statusCode: true,
      studyDate: true, examCompletedAt: true, notes: true,
      report: { select: { reportSignedAt: true, lastAmendedAt: true, tatExamToSignMinutes: true, isSlaBreached: true, radiologistId: true, reportStatus: true } },
    },
  });
  return new Map(exams.map((e) => [e.examinationIdentifier, e]));
}

export async function slaTargets(db: Tx): Promise<SlaTargetFor> {
  const configs = await db.slaConfiguration.findMany();
  return (modality, triage) => configs.find((s) => s.modalityCode === modality && s.triageLevel === triage)?.targetTatMinutes;
}

/** TAT in minutes, rounded like sign-off does. */
export function tatMinutes(completed: Date, signed: Date): number {
  return Number(((signed.getTime() - completed.getTime()) / 60_000).toFixed(2));
}

const isBreached = (tat: number, target: number | undefined) => (target !== undefined ? tat > target : false);

/** Re-upload of an exam that is not signed off: every field may change; a new sign-off gets its TAT. */
export async function applyUpdate(
  tx: Tx, row: PlanRow, record: ExamImportRecord, exam: StoredExam, targetFor: SlaTargetFor,
): Promise<ExamChange> {
  const completed = record.examCompletedAt ? new Date(record.examCompletedAt) : null;
  await tx.examination.update({
    where: { examId: exam.examId },
    data: {
      modalityCode: record.modalityCode,
      triageLevel: record.triageLevel,
      statusCode: record.statusCode,
      studyDate: new Date(record.studyDate),
      examCompletedAt: completed,
      notes: record.notes ?? exam.notes,
    },
  });

  let reportChanges: FieldChanges = {};
  if (record.reportSignedAt && completed) {
    const signed = new Date(record.reportSignedAt);
    const tat = tatMinutes(completed, signed);
    const report = {
      reportSignedAt: signed,
      tatExamToSignMinutes: tat,
      isSlaBreached: isBreached(tat, targetFor(record.modalityCode, record.triageLevel)),
      reportStatus: ReportStatusCode.FINALIZED,
      radiologistId: record.radiologistId ?? exam.report?.radiologistId ?? null,
    };
    await tx.radiologyReport.upsert({ where: { examId: exam.examId }, update: report, create: { examId: exam.examId, ...report } });
    // reportStatus is recorded too: "null before" tells an undo that this sign-off created the report row.
    reportChanges = diffFields(exam.report, report, ["tatExamToSignMinutes", "isSlaBreached", "reportStatus"]);
  }
  return { examId: exam.examId, accession: exam.examinationIdentifier, action: "IMPORT_UPDATE", changes: { ...row.changes, ...reportChanges } };
}

/**
 * Amendment of a signed-off exam (confirmed by the admin, within the window).
 * TAT stays on the FIRST sign-off; a different sign-off time is stored as last_amended_at.
 * The SLA result is re-checked because modality or category may have changed.
 */
export async function applyAmendment(
  tx: Tx, row: PlanRow, record: ExamImportRecord, exam: StoredExam, targetFor: SlaTargetFor,
): Promise<ExamChange> {
  const firstSigned = exam.report!.reportSignedAt!;
  const completed = record.examCompletedAt ? new Date(record.examCompletedAt) : exam.examCompletedAt!;
  const fileSigned = new Date(record.reportSignedAt!);
  const tat = tatMinutes(completed, firstSigned);

  await tx.examination.update({
    where: { examId: exam.examId },
    data: {
      modalityCode: record.modalityCode,
      triageLevel: record.triageLevel,
      studyDate: new Date(record.studyDate),
      examCompletedAt: completed,
      notes: record.notes ?? exam.notes,
      statusCode: ExaminationStatusCode.COMPLETED_SIGNED_OFF,
    },
  });
  const report = {
    tatExamToSignMinutes: tat,
    isSlaBreached: isBreached(tat, targetFor(record.modalityCode, record.triageLevel)),
    lastAmendedAt: fileSigned.getTime() === firstSigned.getTime() ? null : fileSigned,
    radiologistId: record.radiologistId ?? exam.report!.radiologistId,
  };
  await tx.radiologyReport.update({ where: { examId: exam.examId }, data: report });

  return {
    examId: exam.examId,
    accession: exam.examinationIdentifier,
    action: "AMEND",
    changes: { ...row.changes, ...diffFields(exam.report, report, ["tatExamToSignMinutes", "isSlaBreached", "lastAmendedAt"]) },
  };
}

/** Audit entry for a row that was not applied (skipped amendment or refusal), with the reason. */
export function notAppliedEntry(row: PlanRow, exam: StoredExam): ExamChange {
  const action = row.kind === "amend"
    ? "AMEND_SKIPPED"
    : exam.report?.reportSignedAt ? "REFUSED_SIGNED_OFF" : "REFUSED_CANCELLED";
  const reason = row.kind === "amend" ? "Amendment not confirmed by the administrator." : row.reason ?? "Refused.";
  return { examId: exam.examId, accession: exam.examinationIdentifier, action, changes: { ...row.changes, reason: [null, reason] } };
}
