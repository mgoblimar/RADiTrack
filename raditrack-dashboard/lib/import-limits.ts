// Upload limits shared by the Import dialog (browser) and the server. Pure: no imports.

/**
 * Largest file the importer accepts. Next.js refuses server-action requests over 1 MB
 * (its default body limit), so the file must leave room for the form wrapper.
 */
export const MAX_IMPORT_FILE_BYTES = 1000 * 1024;
export const MAX_IMPORT_FILE_LABEL = "1 MB";

/** Shown on the upload screen and in errors when row 1 is not the header row (UPL-41). */
export const HEADER_ROW_RULE =
  "Row 1 must be the column headers (Accession, Modality, Patient_Category, ...), with no title or blank rows above them.";
