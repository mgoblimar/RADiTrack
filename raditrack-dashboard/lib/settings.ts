// Administrator-editable settings stored in app_settings (prisma/sql/002_audit_logs.sql).
// Server-only module: no "use server".

import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_AMENDMENT_WINDOW_DAYS } from "@/lib/import-plan";

type Db = Prisma.TransactionClient;

export const AMENDMENT_WINDOW_KEY = "amendment_window_days";
export const MAX_AMENDMENT_WINDOW_DAYS = 90;

/** Days after the first sign-off during which a re-upload may amend an exam. */
export async function getAmendmentWindowDays(db: Db): Promise<number> {
  const row = await db.appSetting.findUnique({ where: { key: AMENDMENT_WINDOW_KEY } });
  const days = Number(row?.value);
  return Number.isInteger(days) && days >= 0 && days <= MAX_AMENDMENT_WINDOW_DAYS ? days : DEFAULT_AMENDMENT_WINDOW_DAYS;
}

export async function setAmendmentWindowDays(db: Db, days: number, updatedBy: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key: AMENDMENT_WINDOW_KEY },
    update: { value: String(days), updatedAt: new Date(), updatedBy },
    create: { key: AMENDMENT_WINDOW_KEY, value: String(days), updatedBy },
  });
}
