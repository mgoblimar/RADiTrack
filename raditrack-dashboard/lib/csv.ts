// Safe CSV output. Pure: safe in the browser and on the server.

/**
 * One CSV cell.
 * - A value starting with = + - @ (or a tab / carriage return) is prefixed with ' so
 *   Excel shows it as text instead of running it as a formula (CSV injection).
 *   Plain negative numbers are left alone.
 * - Commas, quotes and line breaks are quoted (RFC 4180), so columns never shift.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvLine(values: readonly unknown[]): string {
  return values.map(csvCell).join(",");
}
