"use server";

// Test-data switch and examination import.
//
// Test mode: real exams and reports are copied into backup tables, replaced by
// the test set, and restored afterwards. Test mode is ON exactly while the
// backup table exists. Every switch runs in one database transaction, so a
// failure part-way leaves the data as it was.

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { ExaminationStatusCode } from "@/lib/enums";
import {
  parseExamRows,
  type ExamImportRecord,
  type ImportRowError,
} from "@/lib/exam-import";
import { readSpreadsheetRows } from "@/lib/spreadsheet-rows";
import { testDatasetRows } from "@/data/test-dataset";
import { insertRecords, type Tx } from "@/lib/exam-writer";

const EXAMS_TABLE = "examinations";
const REPORTS_TABLE = "radiology_reports";
const EXAMS_BACKUP = "examinations_backup";
const REPORTS_BACKUP = "radiology_reports_backup";
const TX_OPTIONS = { maxWait: 15_000, timeout: 120_000 };


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

interface ActionResult {
  success: boolean;
  count?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function backupExists(db: Tx | typeof prisma): Promise<boolean> {
  const rows = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = ${EXAMS_BACKUP}
    ) AS "exists"`;
  return rows[0]?.exists ?? false;
}

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

/** Backs up real data (first time only), then replaces all exams with `records`. */
async function replaceWithTestData(records: ExamImportRecord[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (!(await backupExists(tx))) {
      await tx.$executeRawUnsafe(`CREATE TABLE "${EXAMS_BACKUP}" AS SELECT * FROM "${EXAMS_TABLE}"`);
      await tx.$executeRawUnsafe(`CREATE TABLE "${REPORTS_BACKUP}" AS SELECT * FROM "${REPORTS_TABLE}"`);
    }
    await tx.radiologyReport.deleteMany();
    await tx.examination.deleteMany();
    await insertRecords(tx, records);
  }, TX_OPTIONS);
}

function revalidateAll() {
  for (const path of ["/", "/simulator", "/patient", "/report"]) revalidatePath(path);
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
    return { error: errorMessage(error, "Could not read the file.") };
  }
}

/** Saves previewed records: append to current data, or load them as test data (backing up real data). */
export async function commitExamImportAction(records: ExamImportRecord[], mode: ImportMode): Promise<ActionResult> {
  if (records.length === 0) return { success: false, error: "There are no valid rows to import." };
  const invalid = revalidateRecords(records);
  if (invalid.length > 0) return { success: false, error: invalid[0].message };

  try {
    if (mode === "test") {
      await replaceWithTestData(records);
    } else {
      await prisma.$transaction(async (tx) => {
        const clash = await tx.examination.findFirst({
          where: { examinationIdentifier: { in: records.map((r) => r.examinationIdentifier) } },
          select: { examinationIdentifier: true },
        });
        if (clash) throw new Error(`Accession "${clash.examinationIdentifier}" already exists. Nothing was imported.`);
        await insertRecords(tx, records);
      }, TX_OPTIONS);
    }
    revalidateAll();
    return { success: true, count: records.length };
  } catch (error) {
    console.error("Exam import failed:", error);
    return { success: false, error: errorMessage(error, "Import failed. Nothing was saved.") };
  }
}

/** Loads the bundled 100-exam validation dataset (dates relative to now) as test data. */
export async function loadTestDatasetAction(): Promise<ActionResult> {
  const { records, errors } = parseExamRows(testDatasetRows());
  if (errors.length > 0) {
    return { success: false, error: `Test dataset row ${errors[0].rowNumber}: ${errors[0].message}` };
  }
  try {
    await replaceWithTestData(records);
    revalidateAll();
    return { success: true, count: records.length };
  } catch (error) {
    console.error("Loading test dataset failed:", error);
    return { success: false, error: errorMessage(error, "Failed to load the test dataset. Nothing changed.") };
  }
}

/** Puts the backed-up real data back and leaves test mode. */
export async function restoreRealDataAction(): Promise<ActionResult> {
  try {
    const count = await prisma.$transaction(async (tx) => {
      if (!(await backupExists(tx))) throw new Error("Test mode is not active; there is no backup to restore.");
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
