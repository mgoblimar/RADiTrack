// Database side of a RIS sync: load what RADiTrack has for the incoming
// accessions, then write the planned creates/updates in one transaction.

import prisma from "@/lib/prisma";
import type { ExamImportRecord } from "@/lib/exam-import";
import { insertRecords, updateRecords } from "@/lib/exam-writer";
import { planSync, type ExistingExam, type SyncPlan } from "./plan";

const LOOKUP_CHUNK = 1000;

/** Existing exams for the given accession numbers (only synced fields). */
export async function loadExisting(accessions: string[]): Promise<ExistingExam[]> {
  const found: ExistingExam[] = [];
  for (let i = 0; i < accessions.length; i += LOOKUP_CHUNK) {
    const rows = await prisma.examination.findMany({
      where: { examinationIdentifier: { in: accessions.slice(i, i + LOOKUP_CHUNK) } },
      include: { report: { select: { reportSignedAt: true } } },
    });
    for (const e of rows) {
      found.push({
        examId: e.examId,
        examinationIdentifier: e.examinationIdentifier,
        modalityCode: e.modalityCode,
        triageLevel: e.triageLevel,
        statusCode: e.statusCode,
        studyDate: e.studyDate.toISOString(),
        examCompletedAt: e.examCompletedAt?.toISOString() ?? null,
        reportSignedAt: e.report?.reportSignedAt?.toISOString() ?? null,
      });
    }
  }
  return found;
}

/** True while the validation dataset replaces real data (see app/actions/dataset.ts). */
export async function isTestModeActive(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = 'examinations_backup') AS "exists"`;
  return rows[0]?.exists ?? false;
}

export async function buildPlan(records: ExamImportRecord[]): Promise<SyncPlan> {
  const existing = await loadExisting([...new Set(records.map((r) => r.examinationIdentifier))]);
  return planSync(records, existing);
}

/** Writes a plan atomically: either every change lands or none does. */
export async function applyPlan(plan: SyncPlan): Promise<void> {
  if (plan.creates.length === 0 && plan.updates.length === 0) return;
  await prisma.$transaction(
    async (tx) => {
      await insertRecords(tx, plan.creates);
      await updateRecords(tx, plan.updates);
    },
    { maxWait: 15_000, timeout: 300_000 },
  );
}
