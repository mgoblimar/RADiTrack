"use server";

// Audit log tab (Def-UPL-11) and undoing an upload (UPL-34). Administrators only.

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/dal";
import { actorOf, isTestModeActive } from "@/lib/audit";
import { AUDIT_ACTION_LABELS, AUDIT_SOURCE_LABELS } from "@/lib/audit-display";
import type { FieldChanges } from "@/lib/field-changes";
import { lockImports } from "@/lib/import-apply";
import { applyRollback, loadRollbackPlan } from "@/lib/import-rollback";
import { getAmendmentWindowDays } from "@/lib/settings";
import { userMessage } from "@/lib/user-error";
import type { ImportBatchSummary } from "./dataset";

const PAGE_SIZE = 50;
const MAX_PAGE = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TX_OPTIONS = { maxWait: 15_000, timeout: 120_000 };
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

export type AuditDataFilter = "all" | "real" | "test";

export interface AuditLogFilters {
  accession?: string;
  action?: string;
  source?: string;
  user?: string;
  /** Manila dates, "YYYY-MM-DD", both inclusive. */
  from?: string;
  to?: string;
  batchId?: string;
  data?: AuditDataFilter;
  page?: number;
}

export interface AuditLogEntry {
  auditId: string;
  createdAt: string;
  accession: string;
  action: string;
  source: string;
  actor: string;
  testMode: boolean;
  batchId: string | null;
  fileName: string | null;
  changes: FieldChanges | null;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  /** Everyone who appears in the log, for the user filter. */
  users: string[];
  /** Radiologist id -> name, for showing radiologist changes. */
  radiologistNames: Record<string, string>;
  /** File name of the upload being filtered on, if any. */
  batchFileName: string | null;
}

export interface UploadLogItem extends ImportBatchSummary {
  /** The quick checks pass; the full check (exams changed since) runs when Undo is pressed. */
  canUndo: boolean;
  undoNote: string | null;
}

export interface UploadLogPage {
  uploads: UploadLogItem[];
  total: number;
  page: number;
  pageSize: number;
  windowDays: number;
}

export type RollbackPreview =
  | { ok: true; fileName: string; uploadedAt: string; remove: number; restore: number; accessions: string[] }
  | { ok: false; reason: string; blockedBy: string[] };

export type RollbackResult =
  | { ok: true; removed: number; restored: number }
  | { ok: false; reason: string; blockedBy: string[] };

// ---------------------------------------------------------------------------
// Input checks (these actions are reachable by direct POST, so nothing is trusted)
// ---------------------------------------------------------------------------

const clean = (value: unknown, max: number): string => (typeof value === "string" ? value.trim().slice(0, max) : "");

function pageOf(value: unknown): number {
  const page = Math.trunc(Number(value));
  return Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
}

/** Start of a Manila day, as a real timestamp; null for anything that is not "YYYY-MM-DD". */
function manilaDayStart(value: unknown): Date | null {
  const day = clean(value, 10);
  if (!ISO_DAY.test(day)) return null;
  const start = new Date(`${day}T00:00:00+08:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}

function dataWhere(data: unknown): { testMode?: boolean } {
  if (data === "real") return { testMode: false };
  if (data === "test") return { testMode: true };
  return {};
}

function auditWhere(filters: AuditLogFilters): Prisma.ExaminationAuditLogWhereInput {
  const where: Prisma.ExaminationAuditLogWhereInput = { ...dataWhere(filters.data) };
  const accession = clean(filters.accession, 64);
  if (accession) where.accession = { contains: accession, mode: "insensitive" };
  const action = clean(filters.action, 40);
  if (Object.hasOwn(AUDIT_ACTION_LABELS, action)) where.action = action;
  const source = clean(filters.source, 20);
  if (Object.hasOwn(AUDIT_SOURCE_LABELS, source)) where.source = source;
  const user = clean(filters.user, 100);
  if (user) where.actorUsername = user;
  const batchId = clean(filters.batchId, 36);
  if (UUID.test(batchId)) where.batchId = batchId;
  const from = manilaDayStart(filters.from);
  const to = manilaDayStart(filters.to);
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: new Date(to.getTime() + DAY_MS) } : {}),
    };
  }
  return where;
}

function radiologistIdsIn(entries: { changes: Prisma.JsonValue }[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    const pair = (entry.changes as FieldChanges | null)?.radiologistId;
    if (!pair) continue;
    for (const value of pair) if (typeof value === "string" && value) ids.add(value);
  }
  return [...ids];
}

// ---------------------------------------------------------------------------
// Exam changes
// ---------------------------------------------------------------------------

/** One page of the examination audit trail, newest first. */
export async function listAuditLogAction(filters: AuditLogFilters = {}): Promise<AuditLogPage> {
  await requireAdmin();
  const where = auditWhere(filters ?? {});
  const page = pageOf(filters?.page);

  const [total, rows, users] = await Promise.all([
    prisma.examinationAuditLog.count({ where }),
    prisma.examinationAuditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { auditId: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { batch: { select: { fileName: true } } },
    }),
    prisma.examinationAuditLog.groupBy({ by: ["actorUsername"], orderBy: { actorUsername: "asc" } }),
  ]);

  const ids = radiologistIdsIn(rows);
  const radiologists = ids.length === 0 ? [] : await prisma.radiologist.findMany({
    where: { radiologistId: { in: ids } },
    select: { radiologistId: true, fullName: true },
  });
  const batchId = typeof where.batchId === "string" ? where.batchId : null;
  const batch = batchId ? await prisma.importBatch.findUnique({ where: { batchId }, select: { fileName: true } }) : null;

  return {
    entries: rows.map((row) => ({
      auditId: row.auditId,
      createdAt: row.createdAt.toISOString(),
      accession: row.accession,
      action: row.action,
      source: row.source,
      actor: row.actorUsername,
      testMode: row.testMode,
      batchId: row.batchId,
      fileName: row.batch?.fileName ?? null,
      changes: (row.changes ?? null) as FieldChanges | null,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
    users: users.map((u) => u.actorUsername),
    radiologistNames: Object.fromEntries(radiologists.map((r) => [r.radiologistId, r.fullName])),
    batchFileName: batch?.fileName ?? null,
  };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/** One page of the upload log, newest first, with whether each upload can still be undone. */
export async function listUploadLogAction(options: { page?: number; data?: AuditDataFilter } = {}): Promise<UploadLogPage> {
  await requireAdmin();
  const page = pageOf(options?.page);
  const where = dataWhere(options?.data);
  const [total, rows, windowDays, testModeNow] = await Promise.all([
    prisma.importBatch.count({ where }),
    prisma.importBatch.findMany({ where, orderBy: { uploadedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    getAmendmentWindowDays(prisma),
    isTestModeActive(prisma),
  ]);
  const now = Date.now();

  const uploads: UploadLogItem[] = rows.map((b) => {
    const undoNote =
      b.status === "ROLLED_BACK" ? "Already undone"
      : b.status !== "SUCCESS" ? "Failed upload: nothing to undo"
      : b.mode !== "append" ? "Test-data load: use Restore real data"
      : b.testMode !== testModeNow ? (b.testMode ? "Made on test data, which is no longer loaded" : "Made on real data; test data is loaded now")
      : now - b.uploadedAt.getTime() > windowDays * DAY_MS ? `Older than ${windowDays} day(s)`
      : null;
    return {
      batchId: b.batchId,
      fileName: b.fileName,
      mode: b.mode,
      uploadedAt: b.uploadedAt.toISOString(),
      uploadedBy: b.uploadedByUsername,
      rowsInFile: b.rowsInFile,
      inserted: b.inserted,
      updated: b.updated,
      unchanged: b.unchanged,
      amended: b.amended,
      refused: b.refused,
      errorRows: b.errorRows,
      status: b.status,
      message: b.message,
      testMode: b.testMode,
      canUndo: undoNote === null && b.inserted + b.updated + b.amended > 0,
      undoNote: undoNote ?? (b.inserted + b.updated + b.amended > 0 ? null : "Changed no exams"),
    };
  });
  return { uploads, total, page, pageSize: PAGE_SIZE, windowDays };
}

// ---------------------------------------------------------------------------
// Undo an upload
// ---------------------------------------------------------------------------

/** What undoing upload `batchId` would do, or why it cannot be undone. Changes nothing. */
export async function previewRollbackAction(batchId: string): Promise<RollbackPreview> {
  await requireAdmin();
  const id = clean(batchId, 36);
  if (!UUID.test(id)) return { ok: false, reason: "This upload was not found.", blockedBy: [] };
  const [plan, batch] = await Promise.all([
    loadRollbackPlan(prisma, id),
    prisma.importBatch.findUnique({ where: { batchId: id }, select: { fileName: true, uploadedAt: true } }),
  ]);
  if (!plan.ok) return { ok: false, reason: plan.reason, blockedBy: plan.blockedBy ?? [] };
  return {
    ok: true,
    fileName: batch?.fileName ?? "",
    uploadedAt: batch?.uploadedAt.toISOString() ?? "",
    remove: plan.remove.length,
    restore: plan.restore.length,
    accessions: [...plan.remove, ...plan.restore].map((item) => item.accession).sort(),
  };
}

/** Undoes upload `batchId`: all of it or, if anything blocks it, none of it. */
export async function rollbackImportAction(batchId: string): Promise<RollbackResult> {
  const user = await requireAdmin();
  const id = clean(batchId, 36);
  if (!UUID.test(id)) return { ok: false, reason: "This upload was not found.", blockedBy: [] };

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Same lock as imports: no upload can run while an upload is being undone.
      await lockImports(tx);
      // Locks the upload's exam rows too, so no manual edit can land between this check and the undo.
      const plan = await loadRollbackPlan(tx, id, { lock: true });
      if (!plan.ok) return { ok: false as const, reason: plan.reason, blockedBy: plan.blockedBy ?? [] };
      const batch = await tx.importBatch.findUniqueOrThrow({ where: { batchId: id }, select: { batchId: true, uploadedAt: true } });
      const done = await applyRollback(tx, plan, batch, actorOf(user));
      return { ok: true as const, ...done };
    }, TX_OPTIONS);
    if (result.ok) {
      for (const path of ["/", "/simulator", "/patient", "/report"]) revalidatePath(path);
    }
    return result;
  } catch (error) {
    console.error("Undoing upload failed:", error);
    return { ok: false, reason: userMessage(error, "Could not undo the upload. Nothing was changed."), blockedBy: [] };
  }
}
