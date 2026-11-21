// Plain-language labels for audit entries and uploads. Pure: used by the Import dialog and the Audit log tab.

type Scalar = string | number | boolean | null;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Edited",
  SIGN_OFF: "Signed off",
  CANCEL: "Cancelled",
  DELETE: "Deleted",
  IMPORT_INSERT: "Added by upload",
  IMPORT_UPDATE: "Updated by upload",
  AMEND: "Amended by upload",
  AMEND_SKIPPED: "Amendment skipped",
  REFUSED_SIGNED_OFF: "Refused: signed off",
  REFUSED_CANCELLED: "Refused: cancelled",
  RADIOLOGIST_ADDED: "Radiologist added",
  ROLLBACK_REMOVE: "Removed by undo",
  ROLLBACK_RESTORE: "Restored by undo",
};

/** How each action is coloured: a change, a refusal or skip, or an undo. */
export function auditActionTone(action: string): "change" | "refused" | "undo" | "removed" {
  if (action.startsWith("REFUSED") || action === "AMEND_SKIPPED") return "refused";
  if (action.startsWith("ROLLBACK")) return "undo";
  if (action === "DELETE" || action === "CANCEL") return "removed";
  return "change";
}

export const AUDIT_SOURCE_LABELS: Record<string, string> = {
  MANUAL: "On screen",
  IMPORT: "Upload",
  SIMULATOR: "RIS Simulator",
  RIS_SYNC: "RIS sync",
  ROLLBACK: "Undo upload",
};

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  examinationIdentifier: "Accession",
  modalityCode: "Modality",
  triageLevel: "Category",
  statusCode: "Status",
  studyDate: "Study",
  examCompletedAt: "Completed",
  reportSignedAt: "Signed",
  notes: "Notes",
  radiologistId: "Radiologist",
  tatExamToSignMinutes: "TAT",
  isSlaBreached: "SLA",
  lastAmendedAt: "Amended sign-off",
  attempted: "Tried to",
  reason: "Reason",
  fullName: "Name",
};

export const EXAM_STATUS_LABELS: Record<string, string> = {
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  EXAM_COMPLETED: "Waiting for report",
  PENDING_INTERPRETATION: "Waiting for report",
  COMPLETED_SIGNED_OFF: "Signed off",
  CANCELLED: "Cancelled",
};

const DATE_FIELDS = new Set(["studyDate", "examCompletedAt", "reportSignedAt", "lastAmendedAt"]);

export const formatAuditTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function formatMinutes(minutes: number): string {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
}

/** One value of a change, as people read it ("—" for empty). */
export function formatAuditValue(field: string, value: Scalar, radiologistNames: Record<string, string> = {}): string {
  if (value === null || value === "") return "—";
  if (field === "radiologistId") return radiologistNames[String(value)] ?? "Unknown radiologist";
  if (field === "statusCode") return EXAM_STATUS_LABELS[String(value)] ?? String(value);
  if (field === "isSlaBreached") return value ? "Breached" : "Met";
  if (field === "tatExamToSignMinutes" && typeof value === "number") return formatMinutes(value);
  if (DATE_FIELDS.has(field)) return formatAuditTime(String(value));
  return String(value);
}

export function auditFieldLabel(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field;
}

/** "Modality: CT → MRI · Category: OPD → IN" */
export function describeChanges(
  changes: Record<string, [Scalar, Scalar]> | null | undefined,
  radiologistNames: Record<string, string> = {},
): string {
  if (!changes) return "";
  return Object.entries(changes)
    .map(([field, [from, to]]) => `${auditFieldLabel(field)}: ${formatAuditValue(field, from, radiologistNames)} → ${formatAuditValue(field, to, radiologistNames)}`)
    .join(" · ");
}

interface UploadCounts {
  mode: string;
  status: string;
  inserted: number;
  updated: number;
  amended: number;
  refused: number;
}

export const UPLOAD_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Success",
  FAILED: "Failed",
  ROLLED_BACK: "Undone",
};

export function uploadStatusTone(status: string): "ok" | "error" | "undone" {
  if (status === "SUCCESS") return "ok";
  if (status === "ROLLED_BACK") return "undone";
  return "error";
}

/** "3 new · 1 updated" for an upload. */
export function uploadChangesSummary(upload: UploadCounts): string {
  if (upload.mode === "test") return `${upload.inserted} loaded`;
  const parts = [
    upload.inserted && `${upload.inserted} new`,
    upload.updated && `${upload.updated} updated`,
    upload.amended && `${upload.amended} amended`,
    upload.refused && `${upload.refused} refused`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : upload.status === "FAILED" ? "—" : "no changes";
}
