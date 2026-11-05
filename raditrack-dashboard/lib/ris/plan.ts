// Decides what a RIS sync should change, without touching the database.
// RIS is the source of truth: exams are matched by accession number, new ones
// are added and existing ones are updated when any synced field differs.

import type { ExamImportRecord } from "@/lib/exam-import";

/** What RADiTrack currently holds for an accession (only the synced fields). */
export interface ExistingExam {
  examId: string;
  examinationIdentifier: string;
  modalityCode: string;
  triageLevel: string;
  statusCode: string;
  studyDate: string;
  examCompletedAt: string | null;
  reportSignedAt: string | null;
}

export interface PlannedUpdate {
  examId: string;
  record: ExamImportRecord;
  /** Human-readable list of what changed, e.g. "signed", "category OPD → ER". */
  changes: string[];
}

export interface SyncPlan {
  creates: ExamImportRecord[];
  updates: PlannedUpdate[];
  unchanged: number;
}

const sameTime = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && new Date(a).getTime() === new Date(b).getTime());

function describeChanges(existing: ExistingExam, record: ExamImportRecord): string[] {
  const changes: string[] = [];
  if (existing.modalityCode !== record.modalityCode) changes.push(`modality ${existing.modalityCode} → ${record.modalityCode}`);
  if (existing.triageLevel !== record.triageLevel) changes.push(`category ${existing.triageLevel} → ${record.triageLevel}`);
  if (!sameTime(existing.studyDate, record.studyDate)) changes.push("study time");
  if (!sameTime(existing.examCompletedAt, record.examCompletedAt)) {
    changes.push(existing.examCompletedAt ? "completion time" : "completed");
  }
  if (!sameTime(existing.reportSignedAt, record.reportSignedAt)) {
    changes.push(!existing.reportSignedAt ? "signed" : record.reportSignedAt ? "sign-off time" : "unsigned in RIS");
  }
  if (existing.statusCode !== record.statusCode && (existing.statusCode === "CANCELLED" || record.statusCode === "CANCELLED")) {
    changes.push(record.statusCode === "CANCELLED" ? "cancelled" : "un-cancelled");
  }
  return changes;
}

/**
 * Compares incoming RIS records with existing exams. When the same accession
 * appears more than once in `incoming`, the last one wins.
 */
export function planSync(incoming: ExamImportRecord[], existing: ExistingExam[]): SyncPlan {
  const byAccession = new Map(existing.map((e) => [e.examinationIdentifier, e]));
  const latest = new Map(incoming.map((r) => [r.examinationIdentifier, r]));

  const plan: SyncPlan = { creates: [], updates: [], unchanged: 0 };
  for (const record of latest.values()) {
    const current = byAccession.get(record.examinationIdentifier);
    if (!current) {
      plan.creates.push(record);
      continue;
    }
    const changes = describeChanges(current, record);
    if (changes.length === 0) plan.unchanged++;
    else plan.updates.push({ examId: current.examId, record, changes });
  }
  return plan;
}
