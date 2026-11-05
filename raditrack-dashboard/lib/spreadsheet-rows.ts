import ExcelJS from "exceljs";
import { normalizeHeader, parseCsv, type RawRow } from "@/lib/exam-import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type CellValue = ExcelJS.CellValue;

/** Flattens an ExcelJS cell value (formula results, rich text, hyperlinks) to a plain value. */
function plainCellValue(value: CellValue): RawRow[string] {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date || typeof value !== "object") return value as RawRow[string];
  if ("result" in value) return plainCellValue(value.result as CellValue);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return String(value.text);
  return undefined;
}

async function rowsFromWorkbook(buffer: ArrayBuffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  // Prefer a sheet named "Exams" (the template); otherwise use the first sheet.
  const sheet = workbook.getWorksheet("Exams") ?? workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const keys: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    keys[col] = normalizeHeader(String(plainCellValue(cell.value) ?? ""));
  });

  const rows: RawRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: RawRow = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      if (keys[col]) record[keys[col]] = plainCellValue(cell.value);
    });
    if (Object.values(record).some((v) => v !== undefined && String(v).trim() !== "")) rows.push(record);
  });
  return rows;
}

/** Reads an uploaded .xlsx or .csv file into header-keyed rows. Throws a user-facing message on bad input. */
export async function readSpreadsheetRows(file: File): Promise<RawRow[]> {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than 5 MB.");

  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return rowsFromWorkbook(await file.arrayBuffer());
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  throw new Error("Upload an Excel workbook (.xlsx) or a CSV file.");
}
