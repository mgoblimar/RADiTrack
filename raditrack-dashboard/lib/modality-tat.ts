import { TriageLevel } from "@/lib/enums";

/** Default SLA targets (minutes) when a modality has no SLA row for a category. */
const DEFAULT_TARGET_URGENT_MINUTES = 2880; // ER and IN: 48 h
const DEFAULT_TARGET_OPD_MINUTES = 4320; // OPD: 72 h

export type ModalityStatsFilter = "all" | "isStat" | "isRoutine" | "OPD" | "ER" | "IN";

export interface ModalityTatStats {
  /** Average TAT of signed reports, in minutes (0 when none). */
  avgTat: number;
  /** Median TAT of signed reports, in minutes (0 when none). */
  medianTat: number;
  /** SLA target in minutes for this category. */
  target: number;
  /** Signed (finalized) reports in the window. */
  volume: number;
  /** All examinations in the window, signed or still pending. */
  examCount: number;
}

interface ExamForStats {
  triageLevel: string;
  report: { reportSignedAt: Date | null; tatExamToSignMinutes: number | null } | null;
}

interface SlaForStats {
  triageLevel: string;
  targetTatMinutes: number;
}

export function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
}

function matchesFilter(triageLevel: string, filter: ModalityStatsFilter): boolean {
  if (filter === "all") return true;
  if (filter === "isStat") return triageLevel === TriageLevel.ER;
  if (filter === "isRoutine") return triageLevel !== TriageLevel.ER;
  return triageLevel === filter;
}

function targetFor(slaConfigs: readonly SlaForStats[], filter: ModalityStatsFilter): number {
  const isUrgent = filter === "isStat" || filter === "ER" || filter === "IN";
  const triage =
    filter === "isStat" || filter === "ER"
      ? TriageLevel.ER
      : filter === "IN"
        ? TriageLevel.IN
        : TriageLevel.OPD;
  const sla =
    slaConfigs.find((s) => s.triageLevel === triage) ??
    (filter === "all" || filter === "isRoutine" ? slaConfigs[0] : undefined);
  return sla?.targetTatMinutes || (isUrgent ? DEFAULT_TARGET_URGENT_MINUTES : DEFAULT_TARGET_OPD_MINUTES);
}

/**
 * TAT statistics for one modality and patient-category filter.
 * Only signed reports count toward average and median; pending exams only add to examCount.
 */
export function modalityTatStats(
  exams: readonly ExamForStats[],
  slaConfigs: readonly SlaForStats[],
  filter: ModalityStatsFilter,
): ModalityTatStats {
  const inCategory = exams.filter((e) => matchesFilter(e.triageLevel, filter));
  const signed = inCategory.filter((e) => e.report?.reportSignedAt);
  const tatList = signed
    .map((e) => e.report?.tatExamToSignMinutes || 0)
    .filter((v) => v > 0);

  const avgTat =
    tatList.length > 0
      ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
      : 0;

  return {
    avgTat,
    medianTat: medianOf(tatList),
    target: targetFor(slaConfigs, filter),
    volume: signed.length,
    examCount: inCategory.length,
  };
}

/** Stats for every category the TAT-by-modality views use. */
export function modalityTatBreakdown(
  exams: readonly ExamForStats[],
  slaConfigs: readonly SlaForStats[],
) {
  return {
    all: modalityTatStats(exams, slaConfigs, "all"),
    emergency: modalityTatStats(exams, slaConfigs, "isStat"),
    routine: modalityTatStats(exams, slaConfigs, "isRoutine"),
    opd: modalityTatStats(exams, slaConfigs, "OPD"),
    er: modalityTatStats(exams, slaConfigs, "ER"),
    inpatient: modalityTatStats(exams, slaConfigs, "IN"),
  };
}
