import ExcelJS from "exceljs";
import { missingRequiredColumns, normalizeHeader, parseCsv, type RawRow } from "@/lib/exam-import";
import { HEADER_ROW_RULE, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_LABEL } from "@/lib/import-limits";
import { UserError } from "@/lib/user-error";

type CellValue = ExcelJS.CellValue;

/** Flattens an ExcelJS cell value (formula results, rich text, hyperlinks) to a plain value. */
function plainCellValue(value: CellValue): RawRow[string] {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date || typeof value !== "object") return value as RawRow[string];
  // An Excel error (#N/A, #REF!...) is kept as its text so the importer can flag the row.
  if ("error" in value) return String(value.error);
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
  assertHeaderRow(keys.filter(Boolean));

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

/** UPL-41: a blank or title row 1 gives a clear message instead of an error on every row. */
function assertHeaderRow(keys: readonly string[]): void {
  const missing = missingRequiredColumns(keys);
  if (missing.length === 0) return;
  const found = keys.length === 0 ? "Row 1 is blank." : `Row 1 is missing ${missing.join(", ")}.`;
  throw new UserError(`${found} ${HEADER_ROW_RULE}`);
}

/** Reads an uploaded .xlsx or .csv file into header-keyed rows. Throws a user-facing message on bad input. */
export async function readSpreadsheetRows(file: File): Promise<RawRow[]> {
  if (file.size === 0) throw new UserError("The file is empty.");
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new UserError(`The file is larger than ${MAX_IMPORT_FILE_LABEL}. Split it into smaller files.`);

  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return rowsFromWorkbook(await file.arrayBuffer());
  if (name.endsWith(".csv")) {
    const rows = parseCsv(await file.text());
    if (rows.length > 0) assertHeaderRow(Object.keys(rows[0]).filter(Boolean));
    return rows;
  }
  throw new UserError("Upload an Excel workbook (.xlsx) or a CSV file.");
}
