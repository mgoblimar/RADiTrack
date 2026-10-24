"use server";

import prisma from "@/lib/prisma";
import {
  TriageLevel,
  UrgencyLevel,
  ModalityCode,
  ExaminationStatusCode,
} from "@/lib/enums";
import { calculatedMedian } from "./utils";
import type { ModalityTatOverviewItem, ModalityTatStats } from "./analytics";

// 3. QUERY: Dashboard Aggregations
export async function getDashboardData() {
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
        (s) =>
          s.triageLevel === e.triageLevel && s.urgencyLevel === e.urgencyLevel,
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
        urgencyLevel: e.urgencyLevel,
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
      urgencyLevel: e.urgencyLevel,
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

export type KpiPreset =
  | "ALL"
  | "TODAY"
  | "ROLLING_7D"
  | "WEEK"
  | "LAST_WEEK"
  | "MONTH"
  | "LAST_MONTH"
  | "YEAR"
  | "CUSTOM";

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
  const now = new Date();
  const preset = options.preset || "ALL";

  let start: Date;
  let end: Date;
  let priorStart: Date;
  let priorEnd: Date;
  let presetLabel: string;
  let priorPeriodLabel: string;
  let isAllTime = false;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (preset === "TODAY") {
    start = todayStart;
    end = todayEnd;
    priorStart = new Date(todayStart);
    priorStart.setDate(priorStart.getDate() - 1);
    priorEnd = new Date(todayEnd);
    priorEnd.setDate(priorEnd.getDate() - 1);
    presetLabel = "Today";
    priorPeriodLabel = "Yesterday";
  } else if (preset === "ROLLING_7D") {
    end = todayEnd;
    start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    priorEnd = new Date(start.getTime() - 1);
    priorStart = new Date(start);
    priorStart.setDate(priorStart.getDate() - 7);
    presetLabel = "Rolling 7 Days";
    priorPeriodLabel = "Prior 7 Days";
  } else if (preset === "WEEK") {
    const day = now.getDay();
    const diffToMon = now.getDate() - (day === 0 ? 6 : day - 1);
    start = new Date(now.getFullYear(), now.getMonth(), diffToMon, 0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    priorStart = new Date(start);
    priorStart.setDate(start.getDate() - 7);
    priorEnd = new Date(end);
    priorEnd.setDate(end.getDate() - 7);
    presetLabel = "This Week (Mon–Sun)";
    priorPeriodLabel = "Last Week";
  } else if (preset === "LAST_WEEK") {
    const day = now.getDay();
    const diffToMon = now.getDate() - (day === 0 ? 6 : day - 1) - 7;
    start = new Date(now.getFullYear(), now.getMonth(), diffToMon, 0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    priorStart = new Date(start);
    priorStart.setDate(start.getDate() - 7);
    priorEnd = new Date(end);
    priorEnd.setDate(end.getDate() - 7);
    presetLabel = "Last Week (Mon–Sun)";
    priorPeriodLabel = "2 Weeks Ago";
  } else if (preset === "MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    priorEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    presetLabel = "This Month";
    priorPeriodLabel = "Last Month";
  } else if (preset === "LAST_MONTH") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    priorStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
    priorEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    presetLabel = "Last Month";
    priorPeriodLabel = "2 Months Ago";
  } else if (preset === "YEAR") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    priorStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    priorEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    presetLabel = "This Year";
    priorPeriodLabel = "Last Year";
  } else if (preset === "CUSTOM" && options.startDate && options.endDate) {
    const sParts = options.startDate.split("-").map(Number);
    const eParts = options.endDate.split("-").map(Number);
    start = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
    end = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);

    const durationMs = end.getTime() - start.getTime() + 1;
    priorEnd = new Date(start.getTime() - 1);
    priorStart = new Date(priorEnd.getTime() - durationMs + 1);
    presetLabel = "Custom Range";
    priorPeriodLabel = "Prior Period";
  } else {
    // ALL
    isAllTime = true;
    start = new Date(2020, 0, 1, 0, 0, 0, 0);
    end = new Date(2035, 11, 31, 23, 59, 59, 999);
    priorStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    priorEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    presetLabel = "All Time";
    priorPeriodLabel = "Prev Month";
  }

  const formatShort = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  let dateRangeFormatted = `${formatShort(start)} – ${formatShort(end)}`;
  if (isAllTime) {
    dateRangeFormatted = "All Recorded Scans";
  } else if (preset === "TODAY") {
    dateRangeFormatted = formatShort(start);
  } else if (preset === "MONTH") {
    dateRangeFormatted = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "LAST_MONTH") {
    dateRangeFormatted = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "YEAR") {
    dateRangeFormatted = `${start.getFullYear()} Calendar Year`;
  }

  let priorDateRangeFormatted = `${formatShort(priorStart)} – ${formatShort(priorEnd)}`;
  if (preset === "TODAY") {
    priorDateRangeFormatted = formatShort(priorStart);
  } else if (preset === "MONTH" || preset === "ALL") {
    priorDateRangeFormatted = priorStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "LAST_MONTH") {
    priorDateRangeFormatted = priorStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else if (preset === "YEAR") {
    priorDateRangeFormatted = `${priorStart.getFullYear()} Calendar Year`;
  }

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
  const modalityOverview: ModalityTatOverviewItem[] = modalities.map((m) => {
    const calcStats = (
      filterType: "all" | "isStat" | "isRoutine" | "OPD" | "ER" | "IN"
    ): ModalityTatStats => {
      const filtered = m.examinations.filter((e) => {
        if (filterType === "all") return true;
        if (filterType === "isStat") return e.urgencyLevel === UrgencyLevel.STAT || e.triageLevel === TriageLevel.ER;
        if (filterType === "isRoutine") return e.urgencyLevel === UrgencyLevel.ROUTINE && e.triageLevel !== TriageLevel.ER;
        return e.triageLevel === filterType;
      });

      const tatList = filtered
        .map((e) => e.report?.tatExamToSignMinutes || 0)
        .filter((v) => v > 0);

      const avgTat =
        tatList.length > 0
          ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
          : 0;

      let sla: any;
      if (filterType === "isStat" || filterType === "ER") {
        sla = m.slaConfigs.find((s) => s.triageLevel === TriageLevel.ER || s.urgencyLevel === UrgencyLevel.STAT);
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


