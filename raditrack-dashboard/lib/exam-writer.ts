// Writes validated exams to the database, computing TAT and SLA breach exactly
// like report sign-off does. Shared by spreadsheet import, the test dataset and
// the RIS sync agent so all three follow the same rules.

import type { Prisma } from "@/generated/prisma/client";
import type { ExamImportRecord } from "@/lib/exam-import";

export type Tx = Prisma.TransactionClient;

interface SlaRule {
  modalityCode: string;
  triageLevel: string;
  targetTatMinutes: number;
}

/** First matching SLA target for a modality + patient category (same as sign-off). */
export function slaTargetFor(rules: SlaRule[], modality: string, triage: string): number | undefined {
  return rules.find((s) => s.modalityCode === modality && s.triageLevel === triage)?.targetTatMinutes;
}

/** Report fields for a signed record, or null when the record is not signed. */
export function reportFieldsFor(record: ExamImportRecord, rules: SlaRule[]) {
  if (!record.reportSignedAt || !record.examCompletedAt) return null;
  const signed = new Date(record.reportSignedAt);
  const tatMinutes = Number(((signed.getTime() - new Date(record.examCompletedAt).getTime()) / 60_000).toFixed(2));
  const target = slaTargetFor(rules, record.modalityCode, record.triageLevel);
  return {
    reportSignedAt: signed,
    reportStatus: "FINALIZED",
    tatExamToSignMinutes: tatMinutes,
    isSlaBreached: target !== undefined ? tatMinutes > target : false,
  };
}

export function examFieldsFor(record: ExamImportRecord) {
  return {
    examinationIdentifier: record.examinationIdentifier,
    modalityCode: record.modalityCode,
    statusCode: record.statusCode,
    triageLevel: record.triageLevel,
    studyDate: new Date(record.studyDate),
    examCompletedAt: record.examCompletedAt ? new Date(record.examCompletedAt) : null,
  };
}

/** Inserts new exams (and signed reports). */
export async function insertRecords(tx: Tx, records: ExamImportRecord[]): Promise<void> {
  if (records.length === 0) return;
  const rules = await tx.slaConfiguration.findMany();
  const exams = records.map((r) => ({ examId: crypto.randomUUID(), ...examFieldsFor(r), notes: r.notes }));
  await tx.examination.createMany({ data: exams });

  const reports = records.flatMap((r, i) => {
    const report = reportFieldsFor(r, rules);
    return report ? [{ examId: exams[i].examId, ...report }] : [];
  });
  if (reports.length > 0) await tx.radiologyReport.createMany({ data: reports });
}

/**
 * Updates existing exams to match `records` (matched by examId). The report is
 * created, recalculated or removed so it always mirrors the source's sign-off.
 */
export async function updateRecords(tx: Tx, updates: { examId: string; record: ExamImportRecord }[]): Promise<void> {
  if (updates.length === 0) return;
  const rules = await tx.slaConfiguration.findMany();
  for (const { examId, record } of updates) {
    await tx.examination.update({ where: { examId }, data: examFieldsFor(record) });
    const report = reportFieldsFor(record, rules);
    if (report) {
      await tx.radiologyReport.upsert({ where: { examId }, create: { examId, ...report }, update: report });
    } else {
      await tx.radiologyReport.deleteMany({ where: { examId } });
    }
  }
}
