// Undoing an upload (UPL-34): loads what the rules in lib/rollback-plan.ts need, and applies the plan.
// Server-only module: no "use server". Runs inside the caller's transaction, after lockImports().

import { Prisma } from "@/generated/prisma/client";
import type { FieldChanges } from "@/lib/field-changes";
import { toScalar } from "@/lib/field-changes";
import { isTestModeActive, recordExamChanges, type Actor, type ExamChange } from "@/lib/audit";
import { getAmendmentWindowDays } from "@/lib/settings";
import { formatAuditTime } from "@/lib/audit-display";
import {
  DATA_CHANGING_ACTIONS,
  planRollback,
  type CurrentValues,
  type RollbackPlan,
  type Scalar,
} from "@/lib/rollback-plan";

type Tx = Prisma.TransactionClient;
type StoredExam = Prisma.ExaminationGetPayload<{ include: { report: true } }>;

/** An exam as audit fields; reportSignedAt is the effective sign-off, as the import records it. */
function currentValues(exam: StoredExam): CurrentValues {
  const r = exam.report;
  return {
    examinationIdentifier: exam.examinationIdentifier,
    modalityCode: exam.modalityCode,
    triageLevel: exam.triageLevel,
    statusCode: exam.statusCode,
    studyDate: toScalar(exam.studyDate),
    examCompletedAt: toScalar(exam.examCompletedAt),
    notes: exam.notes,
    reportSignedAt: toScalar(r?.lastAmendedAt ?? r?.reportSignedAt ?? null),
    tatExamToSignMinutes: r?.tatExamToSignMinutes ?? null,
    isSlaBreached: r ? r.isSlaBreached : null,
    lastAmendedAt: toScalar(r?.lastAmendedAt ?? null),
    radiologistId: r?.radiologistId ?? null,
    reportStatus: r?.reportStatus ?? null,
  };
}

/**
 * Everything needed to decide whether upload `batchId` can be undone right now.
 * With `lock`, the upload's exam rows are locked first, so no edit can slip in between this check
 * and the undo (manual edits update the exam row, so they wait for this transaction).
 */
export async function loadRollbackPlan(db: Tx, batchId: string, options: { lock?: boolean; now?: Date } = {}): Promise<RollbackPlan> {
  const now = options.now ?? new Date();
  const batch = await db.importBatch.findUnique({ where: { batchId } });
  if (!batch) return planRollback({ batch: null, entries: [], laterChanges: [], current: new Map(), now, windowDays: 0, testModeNow: false });

  const entries = await db.examinationAuditLog.findMany({
    where: { batchId },
    orderBy: [{ createdAt: "asc" }, { auditId: "asc" }],
    select: { examId: true, accession: true, action: true, changes: true },
  });
  const examIds = [...new Set(entries.map((e) => e.examId).filter((id): id is string => Boolean(id)))];
  if (options.lock && examIds.length > 0) {
    await db.$queryRaw`SELECT exam_id FROM examinations WHERE exam_id IN (${Prisma.join(examIds)}) FOR UPDATE`;
  }

  const [laterChanges, exams, windowDays, testModeNow] = await Promise.all([
    examIds.length === 0 ? [] : db.examinationAuditLog.findMany({
      where: {
        examId: { in: examIds },
        createdAt: { gt: batch.uploadedAt },
        action: { in: [...DATA_CHANGING_ACTIONS] },
        OR: [{ batchId: null }, { batchId: { not: batchId } }],
      },
      select: { examId: true, accession: true, action: true },
    }),
    examIds.length === 0 ? [] : db.examination.findMany({ where: { examId: { in: examIds } }, include: { report: true } }),
    getAmendmentWindowDays(db),
    isTestModeActive(db),
  ]);

  return planRollback({
    batch,
    entries: entries.map((e) => ({ ...e, changes: (e.changes ?? null) as FieldChanges | null })),
    laterChanges,
    current: new Map(exams.map((exam) => [exam.examId, currentValues(exam)])),
    now,
    windowDays,
    testModeNow,
  });
}

/** `{ field: [now, restored] }` for the fields an undo puts back. */
function undoChanges(current: CurrentValues, restored: Record<string, Scalar | Date>): FieldChanges {
  const changes: FieldChanges = {};
  for (const [field, value] of Object.entries(restored)) {
    const to = toScalar(value);
    const from = current[field] ?? null;
    if (from !== to) changes[field] = [from, to];
  }
  return changes;
}

/** Applies an ok plan, logs every exam it touches, and marks the upload as undone. */
export async function applyRollback(
  tx: Tx,
  plan: Extract<RollbackPlan, { ok: true }>,
  batch: { batchId: string; uploadedAt: Date },
  actor: Actor,
): Promise<{ removed: number; restored: number }> {
  const log: ExamChange[] = [];

  // Exams the upload added: removed in one statement (their reports go with them). The log keeps their values.
  if (plan.remove.length > 0) {
    await tx.examination.deleteMany({ where: { examId: { in: plan.remove.map((item) => item.examId) } } });
    for (const item of plan.remove) {
      const removed: FieldChanges = {};
      for (const [field, value] of Object.entries(item.current)) if (value !== null) removed[field] = [value, null];
      log.push({ examId: item.examId, accession: item.accession, action: "ROLLBACK_REMOVE", changes: removed });
    }
  }

  const reports = plan.restore.length === 0 ? [] : await tx.radiologyReport.findMany({
    where: { examId: { in: plan.restore.map((item) => item.examId) } },
    select: { examId: true, createdAt: true },
  });
  const reportCreatedAt = new Map(reports.map((r) => [r.examId, r.createdAt]));

  for (const item of plan.restore) {
    if (Object.keys(item.exam).length > 0) {
      await tx.examination.update({ where: { examId: item.examId }, data: item.exam as Prisma.ExaminationUpdateInput });
    }
    let reportRestored: Record<string, Scalar | Date> = item.report;
    const createdAt = reportCreatedAt.get(item.examId);
    if (item.removeSignOff && createdAt) {
      // Did this upload create the report row? New entries say so (reportStatus was null before);
      // older entries are judged by when the row was created.
      const createdByUpload = "reportStatus" in item.report ? item.report.reportStatus === null : createdAt >= batch.uploadedAt;
      if (createdByUpload) {
        await tx.radiologyReport.delete({ where: { examId: item.examId } });
        reportRestored = { reportSignedAt: null, tatExamToSignMinutes: null, isSlaBreached: null, radiologistId: null, reportStatus: null };
      } else {
        // The row was there before (e.g. a started report): clear the sign-off, put back what the upload changed.
        reportRestored = { tatExamToSignMinutes: null, isSlaBreached: false, ...item.report, reportSignedAt: null, lastAmendedAt: null };
        await tx.radiologyReport.update({ where: { examId: item.examId }, data: reportRestored as Prisma.RadiologyReportUpdateInput });
      }
    } else if (createdAt && Object.keys(item.report).length > 0) {
      await tx.radiologyReport.update({ where: { examId: item.examId }, data: item.report as Prisma.RadiologyReportUpdateInput });
    }
    log.push({
      examId: item.examId,
      accession: item.accession,
      action: "ROLLBACK_RESTORE",
      changes: undoChanges(item.current, { ...item.exam, ...reportRestored }),
    });
  }

  const testMode = await isTestModeActive(tx);
  await recordExamChanges(tx, log, { actor, source: "ROLLBACK", batchId: batch.batchId, testMode });
  await tx.importBatch.update({
    where: { batchId: batch.batchId },
    data: {
      status: "ROLLED_BACK",
      message: `Undone by ${actor.username} on ${formatAuditTime(new Date().toISOString())}: ${plan.remove.length} added exam(s) removed, ${plan.restore.length} exam(s) restored.`,
    },
  });
  return { removed: plan.remove.length, restored: plan.restore.length };
}
