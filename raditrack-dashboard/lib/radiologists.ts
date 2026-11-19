// Matches the optional Radiologist column of an import file to RADiTrack's radiologists.
// Server-only module: no "use server".

import type { Prisma } from "@/generated/prisma/client";
import type { ExamImportRecord, ImportRowError } from "@/lib/exam-import";

type Db = Prisma.TransactionClient;

/** Case, extra spaces and a trailing period never matter when matching a name. */
export function normalizeRadiologistName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface UnknownRadiologist {
  /** The name as written in the file (first spelling seen). */
  name: string;
  rowCount: number;
}

export interface RadiologistResolution {
  /** Records whose radiologist (if any) is known, with radiologistId filled in. */
  records: ExamImportRecord[];
  /** One row error per record whose radiologist is unknown or inactive. */
  errors: ImportRowError[];
  /** Unknown names once each, for "Add as new radiologist". */
  unknown: UnknownRadiologist[];
  /** radiologistId -> full name, for showing changes in the preview. */
  names: Record<string, string>;
}

export async function resolveRadiologists(db: Db, records: readonly ExamImportRecord[]): Promise<RadiologistResolution> {
  const all = await db.radiologist.findMany({ select: { radiologistId: true, fullName: true, isActive: true } });
  const byName = new Map(all.map((r) => [normalizeRadiologistName(r.fullName), r]));
  const names = Object.fromEntries(all.map((r) => [r.radiologistId, r.fullName]));

  const resolved: ExamImportRecord[] = [];
  const errors: ImportRowError[] = [];
  const unknown = new Map<string, UnknownRadiologist>();

  for (const record of records) {
    if (!record.radiologistName) {
      resolved.push({ ...record, radiologistId: null });
      continue;
    }
    const key = normalizeRadiologistName(record.radiologistName);
    const match = byName.get(key);
    if (match?.isActive) {
      resolved.push({ ...record, radiologistId: match.radiologistId });
    } else if (match) {
      errors.push({ rowNumber: record.rowNumber, message: `Radiologist "${match.fullName}" is inactive in RADiTrack. Reactivate them under Configurations or fix the file.` });
    } else {
      errors.push({ rowNumber: record.rowNumber, message: `Radiologist "${record.radiologistName}" is not in RADiTrack. Add them below or fix the spelling.` });
      const entry = unknown.get(key) ?? { name: record.radiologistName.trim().replace(/\s+/g, " "), rowCount: 0 };
      entry.rowCount++;
      unknown.set(key, entry);
    }
  }
  return { records: resolved, errors, unknown: [...unknown.values()], names };
}
