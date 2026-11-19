"use server";

import { requireAdmin, requireUser } from "@/lib/auth/dal";
// Test-data switch and examination import.
//
// Test mode: real exams and reports are copied into backup tables, replaced by
// the test set, and restored afterwards. Test mode is ON exactly while the
// backup table exists. Every switch runs in one database transaction, so a
// failure part-way leaves the data as it was.

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ExaminationStatusCode } from "@/lib/enums";
import {
  parseExamRows,
  type ExamImportRecord,
  type ImportRowError,
} from "@/lib/exam-import";
import { readSpreadsheetRows } from "@/lib/spreadsheet-rows";
import { UserError, userMessage } from "@/lib/user-error";
import {
  actorOf,
  diffFields,
  isTestModeActive,
  recordExamChanges,
  recordImportBatch,
  AUDITED_EXAM_FIELDS,
  AUDITED_REPORT_FIELDS,
  type Actor,
  type ExamChange,
} from "@/lib/audit";
import { testDatasetRows } from "@/data/test-dataset";

const EXAMS_TABLE = "examinations";
const REPORTS_TABLE = "radiology_reports";
const EXAMS_BACKUP = "examinations_backup";
const REPORTS_BACKUP = "radiology_reports_backup";
const TX_OPTIONS = { maxWait: 15_000, timeout: 120_000 };

type Tx = Prisma.TransactionClient;

export interface DatasetStatus {
  isTestActive: boolean;
  activeCount: number;
  backupCount: number;
}

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  records: ExamImportRecord[];
  /** Rows that cannot be imported at all. */
  errors: ImportRowError[];
  /** Accessions already in the database (blocks "add", irrelevant for test mode). */
  conflicts: ImportRowError[];
}

export type ImportMode = "append" | "test";

/** One upload as shown on screen (upload history and the success message). */
export interface ImportBatchSummary {
  batchId: string;
  fileName: string;
  mode: string;
  uploadedAt: string;
  uploadedBy: string;
  rowsInFile: number;
  inserted: number;
  errorRows: number;
  status: string;
  message: string | null;
  testMode: boolean;
}

/** What the browser knows about the file when the user presses Import. */
export interface ImportFileInfo {
  fileName: string;
  rowsInFile: number;
  errorRows: number;
}

interface ActionResult {
  success: boolean;
  count?: number;
  error?: string;
  batch?: ImportBatchSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Test mode is ON exactly while the backup table exists. */
const backupExists = (db: Tx) => isTestModeActive(db);

/** Copies backup rows into a live table using the columns both tables share. */
async function restoreTable(tx: Tx, table: string, backup: string): Promise<void> {
  const columns = await tx.$queryRaw<{ column_name: string }[]>`
    SELECT b.column_name FROM information_schema.columns b
    JOIN information_schema.columns t
      ON t.column_name = b.column_name AND t.table_name = ${table} AND t.table_schema = current_schema()
    WHERE b.table_name = ${backup} AND b.table_schema = current_schema()
    ORDER BY b.ordinal_position`;
  if (columns.length === 0) throw new Error(`Backup table ${backup} has no matching columns.`);
  const list = columns.map((c) => `"${c.column_name.replace(/"/g, '""')}"`).join(", ");
  // Table names are fixed constants above; column names come from the catalog and are quoted.
  await tx.$executeRawUnsafe(`INSERT INTO "${table}" (${list}) SELECT ${list} FROM "${backup}"`);
}

/**
 * Inserts exams (and signed reports) computing TAT and SLA breach exactly like sign-off does.
 * Returns one IMPORT_INSERT audit entry per exam (the caller decides whether to record them).
 */
async function insertRecords(tx: Tx, records: ExamImportRecord[]): Promise<ExamChange[]> {
  const slaConfigs = await tx.slaConfiguration.findMany();
  const targetFor = (modality: string, triage: string) =>
    slaConfigs.find((s) => s.modalityCode === modality && s.triageLevel === triage)?.targetTatMinutes;

  const exams = records.map((r) => ({
    examId: crypto.randomUUID(),
    examinationIdentifier: r.examinationIdentifier,
    modalityCode: r.modalityCode,
    statusCode: r.statusCode,
    triageLevel: r.triageLevel,
    studyDate: new Date(r.studyDate),
    examCompletedAt: r.examCompletedAt ? new Date(r.examCompletedAt) : null,
    notes: r.notes,
  }));
  await tx.examination.createMany({ data: exams });

  const reports = records.flatMap((r, i) => {
    if (!r.reportSignedAt || !r.examCompletedAt) return [];
    const signed = new Date(r.reportSignedAt);
    const tatMinutes = Number(((signed.getTime() - new Date(r.examCompletedAt).getTime()) / 60_000).toFixed(2));
    const target = targetFor(r.modalityCode, r.triageLevel);
    return [{
      examId: exams[i].examId,
      reportSignedAt: signed,
      reportStatus: "FINALIZED",
      tatExamToSignMinutes: tatMinutes,
      isSlaBreached: target !== undefined ? tatMinutes > target : false,
    }];
  });
  if (reports.length > 0) await tx.radiologyReport.createMany({ data: reports });

  const reportByExam = new Map(reports.map((r) => [r.examId, r]));
  return exams.map((exam) => ({
    examId: exam.examId,
    accession: exam.examinationIdentifier,
    action: "IMPORT_INSERT" as const,
    changes: {
      ...diffFields(null, exam, AUDITED_EXAM_FIELDS),
      ...diffFields(null, reportByExam.get(exam.examId) ?? null, AUDITED_REPORT_FIELDS),
    },
  }));
}

/**
 * Backs up real data (first time only), then replaces all exams with `records`.
 * Logged as one upload batch (mode "test"); test exams get no per-exam audit entries,
 * since they are thrown away when the real data is restored.
 */
async function replaceWithTestData(records: ExamImportRecord[], actor: Actor, file: ImportFileInfo) {
  return prisma.$transaction(async (tx) => {
    if (!(await backupExists(tx))) {
      await tx.$executeRawUnsafe(`CREATE TABLE "${EXAMS_BACKUP}" AS SELECT * FROM "${EXAMS_TABLE}"`);
      await tx.$executeRawUnsafe(`CREATE TABLE "${REPORTS_BACKUP}" AS SELECT * FROM "${REPORTS_TABLE}"`);
    }
    await tx.radiologyReport.deleteMany();
    await tx.examination.deleteMany();
    await insertRecords(tx, records);
    return recordImportBatch(tx, {
      batchId: crypto.randomUUID(),
      fileName: file.fileName,
      mode: "test",
      actor,
      rowsInFile: file.rowsInFile,
      inserted: records.length,
      errorRows: file.errorRows,
      status: "SUCCESS",
      testMode: true,
    });
  }, TX_OPTIONS);
}

type BatchRow = Awaited<ReturnType<typeof recordImportBatch>>;

function toSummary(batch: BatchRow): ImportBatchSummary {
  return {
    batchId: batch.batchId,
    fileName: batch.fileName,
    mode: batch.mode,
    uploadedAt: batch.uploadedAt.toISOString(),
    uploadedBy: batch.uploadedByUsername,
    rowsInFile: batch.rowsInFile,
    inserted: batch.inserted,
    errorRows: batch.errorRows,
    status: batch.status,
    message: batch.message,
    testMode: batch.testMode,
  };
}

/** Logs a failed upload attempt. Never throws: a logging problem must not hide the real error. */
async function recordFailedBatch(actor: Actor, file: ImportFileInfo, mode: ImportMode, message: string) {
  try {
    await recordImportBatch(prisma, {
      batchId: crypto.randomUUID(),
      fileName: file.fileName,
      mode,
      actor,
      rowsInFile: file.rowsInFile,
      errorRows: file.errorRows,
      status: "FAILED",
      message,
      testMode: await isTestModeActive(prisma),
    });
  } catch (logError) {
    console.error("Could not log the failed upload:", logError);
  }
}

function revalidateAll() {
  for (const path of ["/", "/simulator", "/patient", "/report"]) revalidatePath(path);
}

/** Two imports saved the same accession at once: the database refused the second one. */
const isDuplicateAccession = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

/** Shows RADiTrack's own messages; database and library errors get `fallback` (no raw error text on screen). */
const errorMessage = (error: unknown, fallback: string) => {
  if (isDuplicateAccession(error)) {
    return "Some of these accessions were saved by another import a moment ago. Nothing from this file was saved. Upload it again to see which rows already exist.";
  }
  return userMessage(error, fallback);
};

/** Re-validates records sent back from the client before writing them. */
function revalidateRecords(records: ExamImportRecord[]): ImportRowError[] {
  const valid = new Set<string>(Object.values(ExaminationStatusCode));
  const errors: ImportRowError[] = [];
  records.forEach((r) => {
    const dates = [r.studyDate, r.examCompletedAt, r.reportSignedAt].filter(Boolean) as string[];
    if (!r.examinationIdentifier || !valid.has(r.statusCode) || dates.some((d) => isNaN(Date.parse(d)))) {
      errors.push({ rowNumber: r.rowNumber, message: "Row changed after preview; upload the file again." });
    }
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getDatasetStatusAction(): Promise<DatasetStatus> {
  await requireUser();
  const [isTestActive, activeCount] = await Promise.all([backupExists(prisma), prisma.examination.count()]);
  let backupCount = 0;
  if (isTestActive) {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`SELECT count(*) AS count FROM "${EXAMS_BACKUP}"`);
    backupCount = Number(rows[0]?.count ?? 0);
  }
  return { isTestActive, activeCount, backupCount };
}

/** Reads and validates an uploaded .xlsx/.csv without saving anything. */
export async function previewExamImportAction(formData: FormData): Promise<ImportPreview | { error: string }> {
  // First line on purpose: server actions are reachable by direct POST, not only through the Import button.
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to import." };
  try {
    const rows = await readSpreadsheetRows(file);
    if (rows.length === 0) return { error: "No exam rows found. The first row must be the column headers." };
    const { records, errors } = parseExamRows(rows);

    const existing = await prisma.examination.findMany({
      where: { examinationIdentifier: { in: records.map((r) => r.examinationIdentifier) } },
      select: { examinationIdentifier: true },
    });
    const taken = new Set(existing.map((e) => e.examinationIdentifier));
    const conflicts = records
      .filter((r) => taken.has(r.examinationIdentifier))
      .map((r) => ({ rowNumber: r.rowNumber, message: `Accession "${r.examinationIdentifier}" already exists.` }));

    return { fileName: file.name, totalRows: rows.length, records, errors, conflicts };
  } catch (error) {
    return { error: errorMessage(error, "Could not read the file. Check that it is a valid .xlsx or .csv file and try again.") };
  }
}

/** Saves previewed records: append to current data, or load them as test data (backing up real data). */
export async function commitExamImportAction(
  records: ExamImportRecord[],
  mode: ImportMode,
  file: ImportFileInfo,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const actor = actorOf(user);
  if (records.length === 0) return { success: false, error: "There are no valid rows to import." };
  const invalid = revalidateRecords(records);
  if (invalid.length > 0) return { success: false, error: invalid[0].message };

  try {
    const batch = mode === "test"
      ? await replaceWithTestData(records, actor, file)
      : await prisma.$transaction(async (tx) => {
          const clash = await tx.examination.findFirst({
            where: { examinationIdentifier: { in: records.map((r) => r.examinationIdentifier) } },
            select: { examinationIdentifier: true },
          });
          if (clash) throw new UserError(`Accession "${clash.examinationIdentifier}" already exists. Nothing was imported.`);
          const testMode = await isTestModeActive(tx);
          const created = await recordImportBatch(tx, {
            batchId: crypto.randomUUID(),
            fileName: file.fileName,
            mode: "append",
            actor,
            rowsInFile: file.rowsInFile,
            inserted: records.length,
            errorRows: file.errorRows,
            status: "SUCCESS",
            testMode,
          });
          const entries = await insertRecords(tx, records);
          await recordExamChanges(tx, entries, { actor, source: "IMPORT", batchId: created.batchId, testMode });
          return created;
        }, TX_OPTIONS);
    revalidateAll();
    return { success: true, count: records.length, batch: toSummary(batch) };
  } catch (error) {
    console.error("Exam import failed:", error);
    const message = errorMessage(error, "Import failed. Nothing was saved.");
    await recordFailedBatch(actor, file, mode, message);
    return { success: false, error: message };
  }
}

/** The most recent uploads, newest first (administrators only). */
export async function listImportBatchesAction(limit = 20): Promise<ImportBatchSummary[]> {
  await requireAdmin();
  const take = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100);
  const batches = await prisma.importBatch.findMany({ orderBy: { uploadedAt: "desc" }, take });
  return batches.map(toSummary);
}

/** Loads the bundled 100-exam validation dataset (dates relative to now) as test data. */
export async function loadTestDatasetAction(): Promise<ActionResult> {
  const user = await requireAdmin();
  const rows = testDatasetRows();
  const { records, errors } = parseExamRows(rows);
  if (errors.length > 0) {
    return { success: false, error: `Test dataset row ${errors[0].rowNumber}: ${errors[0].message}` };
  }
  try {
    const batch = await replaceWithTestData(records, actorOf(user), {
      fileName: "Built-in validation dataset",
      rowsInFile: rows.length,
      errorRows: 0,
    });
    revalidateAll();
    return { success: true, count: records.length, batch: toSummary(batch) };
  } catch (error) {
    console.error("Loading test dataset failed:", error);
    return { success: false, error: errorMessage(error, "Failed to load the test dataset. Nothing changed.") };
  }
}

/** Puts the backed-up real data back and leaves test mode. */
export async function restoreRealDataAction(): Promise<ActionResult> {
  await requireAdmin();
  try {
    const count = await prisma.$transaction(async (tx) => {
      if (!(await backupExists(tx))) throw new UserError("Test mode is not active; there is no backup to restore.");
      await tx.radiologyReport.deleteMany();
      await tx.examination.deleteMany();
      await restoreTable(tx, EXAMS_TABLE, EXAMS_BACKUP);
      await restoreTable(tx, REPORTS_TABLE, REPORTS_BACKUP);
      await tx.$executeRawUnsafe(`DROP TABLE "${REPORTS_BACKUP}"`);
      await tx.$executeRawUnsafe(`DROP TABLE "${EXAMS_BACKUP}"`);
      return tx.examination.count();
    }, TX_OPTIONS);
    revalidateAll();
    return { success: true, count };
  } catch (error) {
    console.error("Restoring real data failed:", error);
    return { success: false, error: errorMessage(error, "Restore failed. Test data is still active.") };
  }
}
