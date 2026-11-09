"use server";

import { requireUser } from "@/lib/auth/dal";
import prisma from "@/lib/prisma";
import {
  TriageLevel,
  UrgencyLevel,
  ModalityCode,
  ExaminationStatusCode,
  sortByModalityOrder,
} from "@/lib/enums";
import { calculatedMedian } from "./utils";
import { resolveKpiRange, type KpiPreset } from "@/lib/kpi-range";
import type { ModalityTatOverviewItem, ModalityTatStats } from "./analytics";

// 3. QUERY: Dashboard Aggregations
export async function getDashboardData() {
  await requireUser();
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [allExams, allReports, pendingReadingExams] = await Promise.all([
    prisma.examination.findMany({ include: { report: true, modality: true } }),
    prisma.radiologyReport.findMany({
      where: { reportSignedAt: { not: null } },
    }),
    prisma.examination.findMany({
      where: {
        examCompletedAt: { not: null },
        statusCode: {
          notIn: [
            ExaminationStatusCode.CANCELLED,
            ExaminationStatusCode.COMPLETED_SIGNED_OFF,
            "FINALIZED",
          ],
        },
        report: { is: null },
      },

      include: { modality: { include: { slaConfigs: true } } },

      orderBy: { examCompletedAt: "asc" },
    }),
  ]);

  const tatValues = allReports
    .map((r) => r.tatExamToSignMinutes || 0)
    .filter((v) => v > 0);
  const avgTat =
    tatValues.length > 0
      ? Number(
          (tatValues.reduce((a, b) => a + b, 0) / tatValues.length).toFixed(1),
        )
      : 0;
  const medianTat = await calculatedMedian(tatValues);
  const slaBreaches = allReports.filter((r) => r.isSlaBreached).length;
  const pctOnTime =
    allReports.length > 0
      ? Number(
          (
            ((allReports.length - slaBreaches) / allReports.length) *
            100
          ).toFixed(1),
        )
      : 100;

  const volumeByModality: Record<string, number> = {
    XRAY: 0,
    US: 0,
    CT: 0,
    MRI: 0,
    MAMMO: 0,
  };
  allExams.forEach((e) => {
    if (volumeByModality[e.modalityCode] !== undefined) {
      volumeByModality[e.modalityCode]++;
    }
  });

  const pendingByModality: Record<string, number> = {
    XRAY: 0,
    US: 0,
    CT: 0,
    MRI: 0,
    MAMMO: 0,
  };
  pendingReadingExams.forEach((e) => {
    if (pendingByModality[e.modalityCode] !== undefined) {
      pendingByModality[e.modalityCode]++;
    }
  });

  return {
    totalVolume: allExams.length,
    finalizedCount: allReports.length,
    pendingReadingCount: pendingReadingExams.length,
    avgTatMinutes: avgTat,
    medianTatMinutes: medianTat,
    pctOnTime,
    volumeByModality,
    pendingByModality,
    pendingReadingQueue: pendingReadingExams.map((e) => {
      const dwellMinutes = Number(
        (
          (now.getTime() - new Date(e.examCompletedAt!).getTime()) /
          (1000 * 60)
        ).toFixed(1),
      );
      const dwellHours = Number((dwellMinutes / 60).toFixed(1));
      const targetRule = e.modality.slaConfigs.find(
        (s) => s.triageLevel === e.triageLevel,
      );
      const isBreached = targetRule
        ? dwellMinutes > targetRule.targetTatMinutes
        : false;
      const isCarryOver = new Date(e.studyDate) < todayStart;

      return {
        examId: e.examId,
        identifier: e.examinationIdentifier,
        modalityCode: e.modalityCode,
        triageLevel: e.triageLevel,
        urgencyLevel: e.triageLevel === "ER" ? "STAT" : "ROUTINE",
        dwellMinutes,
        dwellHours,
        targetTat: targetRule?.targetTatMinutes ?? null,
        isBreached,
        isCarryOver,
        notes: e.notes ?? "",
      };
    }),
    allExamsSummary: allExams.map((e) => ({
      examId: e.examId,
      modalityCode: e.modalityCode,
      triageLevel: e.triageLevel,
      studyDate: e.studyDate.toISOString(),
      statusCode: e.statusCode,
      tatMinutes: e.report?.tatExamToSignMinutes ?? null,
      isSlaBreached: Boolean(e.report?.isSlaBreached),
      isFinalized: Boolean(e.report?.reportSignedAt),
    })),
  };
}

// ============================================================================
// 24. ACTION: Unified Top-Level Temporal Filtering for Executive KPIs
// Computes dynamic Executive KPIs, prior period baselines, and modality stats
// ============================================================================

export type { KpiPreset };

export interface FilteredKpiOptions {
  preset: KpiPreset;
  startDate?: string;
  endDate?: string;
  modalityCode?: "ALL" | ModalityCode | string;
  triageLevel?: "ALL" | TriageLevel | string;
}

export interface FilteredKpiResult {
  preset: KpiPreset;
  presetLabel: string;
  dateRangeFormatted: string;
  totalVolume: number;
  finalizedCount: number;
  pendingReadingCount: number;
  avgTatMinutes: number;
  avgTatHours: number;
  medianTatMinutes: number;
  pctOnTime: number;
  breachCount: number;
  // Comparative Baseline
  priorPeriodLabel: string;
  priorDateRangeFormatted: string;
  priorTotalVolume: number;
  priorFinalizedCount: number;
  priorAvgTatMinutes: number;
  priorAvgTatHours: number;
  tatDeltaPercent: number | null;
  volumeDeltaPercent: number | null;
  modalityOverview: ModalityTatOverviewItem[];
  volumeByModality: Record<string, number>;
  pendingByModality: Record<string, number>;
}

export async function fetchFilteredExecutiveKpiAction(
  options: FilteredKpiOptions
): Promise<FilteredKpiResult> {
  await requireUser();
  const now = new Date();
  const preset = options.preset || "ALL";
  const {
    start,
    end,
    priorStart,
    priorEnd,
    presetLabel,
    priorPeriodLabel,
    isAllTime,
    dateRangeFormatted,
    priorDateRangeFormatted,
  } = resolveKpiRange(preset, now, options.startDate, options.endDate);

  const [currentExams, priorExams, allActivePendingExams, modalities] = await Promise.all([
    prisma.examination.findMany({
      where: {
        statusCode: { not: ExaminationStatusCode.CANCELLED },
        studyDate: isAllTime ? undefined : { gte: start, lte: end },
      },
      include: {
        report: true,
      },
    }),
    prisma.examination.findMany({
      where: {
        statusCode: { not: ExaminationStatusCode.CANCELLED },
        studyDate: { gte: priorStart, lte: priorEnd },
      },
      include: {
        report: true,
      },
    }),
    prisma.examination.findMany({
      where: {
        examCompletedAt: { not: null },
        statusCode: {
          notIn: [
            ExaminationStatusCode.CANCELLED,
            ExaminationStatusCode.COMPLETED_SIGNED_OFF,
            "FINALIZED",
          ],
        },
        report: { is: null },
      },
      select: { examId: true, studyDate: true, modalityCode: true, triageLevel: true },
    }),
    prisma.modality.findMany({
      include: {
        slaConfigs: true,
        examinations: {
          where: {
            report: { reportSignedAt: { not: null } },
            statusCode: { not: ExaminationStatusCode.CANCELLED },
            studyDate: isAllTime ? undefined : { gte: start, lte: end },
          },
          include: { report: true },
        },
      },
      orderBy: { modalityCode: "asc" },
    }),
  ]);

  const targetModality =
    options.modalityCode && options.modalityCode !== "ALL"
      ? options.modalityCode
      : undefined;

  const targetTriage =
    options.triageLevel && options.triageLevel !== "ALL"
      ? options.triageLevel
      : undefined;

  // Breakdown by modality (respecting targetTriage if selected)
  const volumeByModality: Record<string, number> = {
    XRAY: 0,
    US: 0,
    CT: 0,
    MRI: 0,
    MAMMO: 0,
  };
  currentExams.forEach((e) => {
    if (targetTriage && e.triageLevel !== targetTriage) return;
    if (volumeByModality[e.modalityCode] !== undefined) {
      volumeByModality[e.modalityCode]++;
    }
  });

  const pendingByModality: Record<string, number> = {
    XRAY: 0,
    US: 0,
    CT: 0,
    MRI: 0,
    MAMMO: 0,
  };
  const activePendingExams = isAllTime
    ? allActivePendingExams
    : currentExams.filter((e) => !e.report || !e.report.reportSignedAt);
  activePendingExams.forEach((e) => {
    if (targetTriage && e.triageLevel !== targetTriage) return;
    if (pendingByModality[e.modalityCode] !== undefined) {
      pendingByModality[e.modalityCode]++;
    }
  });

  // Filter scoped exams according to BOTH targetModality and targetTriage for the executive KPI cards
  const scopedCurrentExams = currentExams.filter((e) => {
    if (targetModality && e.modalityCode !== targetModality) return false;
    if (targetTriage && e.triageLevel !== targetTriage) return false;
    return true;
  });

  const scopedActivePendingExams = activePendingExams.filter((e) => {
    if (targetModality && e.modalityCode !== targetModality) return false;
    if (targetTriage && e.triageLevel !== targetTriage) return false;
    return true;
  });

  const totalVolume = scopedCurrentExams.length;
  const finalizedExams = scopedCurrentExams.filter((e) => e.report && e.report.reportSignedAt);
  const finalizedCount = finalizedExams.length;
  const pendingReadingCount = scopedActivePendingExams.length;

  const tatValues = finalizedExams
    .map((e) => e.report?.tatExamToSignMinutes || 0)
    .filter((v) => v > 0);

  const avgTatMinutes =
    tatValues.length > 0
      ? Number((tatValues.reduce((a, b) => a + b, 0) / tatValues.length).toFixed(1))
      : 0;
  const avgTatHours = Number((avgTatMinutes / 60).toFixed(1));
  const medianTatMinutes = await calculatedMedian(tatValues);

  const breachCount = finalizedExams.filter((e) => e.report?.isSlaBreached).length;
  const pctOnTime =
    finalizedCount > 0
      ? Number((((finalizedCount - breachCount) / finalizedCount) * 100).toFixed(1))
      : 100;

  // Prior period metrics
  const scopedPriorExams = priorExams.filter((e) => {
    if (targetModality && e.modalityCode !== targetModality) return false;
    if (targetTriage && e.triageLevel !== targetTriage) return false;
    return true;
  });
  const priorTotalVolume = scopedPriorExams.length;
  const priorFinalizedExams = scopedPriorExams.filter((e) => e.report && e.report.reportSignedAt);
  const priorFinalizedCount = priorFinalizedExams.length;
  const priorTatValues = priorFinalizedExams
    .map((e) => e.report?.tatExamToSignMinutes || 0)
    .filter((v) => v > 0);

  const priorAvgTatMinutes =
    priorTatValues.length > 0
      ? Number((priorTatValues.reduce((a, b) => a + b, 0) / priorTatValues.length).toFixed(1))
      : 0;
  const priorAvgTatHours = Number((priorAvgTatMinutes / 60).toFixed(1));

  let tatDeltaPercent: number | null = null;
  if (avgTatMinutes > 0 && priorAvgTatMinutes > 0) {
    tatDeltaPercent = Number(
      (((avgTatMinutes - priorAvgTatMinutes) / priorAvgTatMinutes) * 100).toFixed(1)
    );
  }

  let volumeDeltaPercent: number | null = null;
  if (priorTotalVolume > 0) {
    volumeDeltaPercent = Number(
      (((totalVolume - priorTotalVolume) / priorTotalVolume) * 100).toFixed(1)
    );
  }

  // Modality TAT Breakdown for this period
  const modalityOverview: ModalityTatOverviewItem[] = sortByModalityOrder(modalities).map((m) => {
    const calcStats = (
      filterType: "all" | "isStat" | "isRoutine" | "OPD" | "ER" | "IN"
    ): ModalityTatStats => {
      const filtered = m.examinations.filter((e) => {
        if (filterType === "all") return true;
        if (filterType === "isStat") return e.triageLevel === TriageLevel.ER;
        if (filterType === "isRoutine") return e.triageLevel !== TriageLevel.ER;
        return e.triageLevel === filterType;
      });

      const tatList = filtered
        .map((e) => e.report?.tatExamToSignMinutes || 0)
        .filter((v) => v > 0);

      const avgTat =
        tatList.length > 0
          ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
          : 0;

      let sla: (typeof m.slaConfigs)[number] | undefined;
      if (filterType === "isStat" || filterType === "ER") {
        sla = m.slaConfigs.find((s) => s.triageLevel === TriageLevel.ER);
      } else if (filterType === "OPD") {
        sla = m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD);
      } else if (filterType === "IN") {
        sla = m.slaConfigs.find((s) => s.triageLevel === TriageLevel.IN);
      } else {
        sla = m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD) || m.slaConfigs[0];
      }

      const defaultTarget =
          filterType === "isStat" || filterType === "ER" || filterType === "IN"
            ? 2880
            : 4320;

      return {
        avgTat,
        target: sla?.targetTatMinutes || defaultTarget,
        volume: filtered.length,
      };
    };

    return {
      modality: m.modalityCode,
      name: m.modalityName,
      all: calcStats("all"),
      emergency: calcStats("isStat"),
      routine: calcStats("isRoutine"),
      opd: calcStats("OPD"),
      er: calcStats("ER"),
      inpatient: calcStats("IN"),
    };
  });

  return {
    preset,
    presetLabel,
    dateRangeFormatted,
    totalVolume,
    finalizedCount,
    pendingReadingCount,
    avgTatMinutes,
    avgTatHours,
    medianTatMinutes,
    pctOnTime,
    breachCount,
    priorPeriodLabel,
    priorDateRangeFormatted,
    priorTotalVolume,
    priorFinalizedCount,
    priorAvgTatMinutes,
    priorAvgTatHours,
    tatDeltaPercent,
    volumeDeltaPercent,
    modalityOverview,
    volumeByModality,
    pendingByModality,
  };
}


