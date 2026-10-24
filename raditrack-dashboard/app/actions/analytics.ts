"use server";

import prisma from "@/lib/prisma";
import {
  TriageLevel,
  UrgencyLevel,
  ModalityCode,
} from "@/lib/enums";
import { calculatedMedian } from "./utils";

// ============================================================================
// 5. QUERY: 7-Day Retrospective Staff & Management Analytics (Proposal Page 6)
// Day-by-Day performance table with OPD/IN/ER split, Finalized, Pending, and Avg TAT
// ============================================================================
export interface SevenDayAnalyticsOptions {
  anchorDate?: string;
  mode?: "rolling" | "static";
}

export async function getSevenDayStaffAnalytics(options?: SevenDayAnalyticsOptions) {
  const mode = options?.mode || "rolling";
  let anchor: Date;
  if (options?.anchorDate) {
    const parts = options.anchorDate.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      anchor = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    } else {
      anchor = new Date(options.anchorDate);
    }
  } else {
    anchor = new Date();
  }
  if (isNaN(anchor.getTime())) anchor = new Date();

  const currentDays: Date[] = [];
  const priorDays: Date[] = [];

  if (mode === "static") {
    // Static calendar week: Monday to Sunday of the anchor week
    // Requirement: Latest as Sunday at the top down to Monday at the bottom
    const d = new Date(anchor);
    const day = d.getDay(); // 0 = Sun, 1 = Mon ...
    const diffToMon = d.getDate() - (day === 0 ? 6 : day - 1);
    const mon = new Date(d);
    mon.setDate(diffToMon);
    mon.setHours(0, 0, 0, 0);

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const cur = new Date(sun);
      cur.setDate(sun.getDate() - i);
      currentDays.push(cur);

      const pri = new Date(cur);
      pri.setDate(cur.getDate() - 7);
      priorDays.push(pri);
    }
  } else {
    // Rolling mode: anchor date going back 6 days (7 days total, e.g. Oct 5 down to Sep 29)
    const base = new Date(anchor);
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const cur = new Date(base);
      cur.setDate(base.getDate() - i);
      currentDays.push(cur);

      const pri = new Date(cur);
      pri.setDate(cur.getDate() - 7);
      priorDays.push(pri);
    }
  }

  // Find min and max dates across both 7-day windows for query
  const allDays = [...currentDays, ...priorDays];
  const queryStart = new Date(Math.min(...allDays.map((d) => d.getTime())));
  queryStart.setHours(0, 0, 0, 0);

  const queryEnd = new Date(Math.max(...allDays.map((d) => d.getTime())));
  queryEnd.setHours(23, 59, 59, 999);

  // Fetch all exams in the 14-day combined window with their reports
  const all14DayExams = await prisma.examination.findMany({
    where: {
      studyDate: { gte: queryStart, lte: queryEnd },
      statusCode: { not: "CANCELLED" },
    },
    include: {
      report: true,
    },
    orderBy: { studyDate: "desc" },
  });

  // Helper function to build 7-day table data for a given modality filter (or 'ALL')
  const computeTableForModality = (filterCode?: string) => {
    const filteredExams = filterCode && filterCode !== "ALL"
      ? all14DayExams.filter((e) => e.modalityCode === filterCode)
      : all14DayExams;

    const buildDayRows = (dayList: Date[], isPrior = false) =>
      dayList.map((dayDate, index) => {
        const nextDay = new Date(dayDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const examsForDay = filteredExams.filter((e) => {
          const s = new Date(e.studyDate);
          return s >= dayDate && s < nextDay;
        });

        const opdCount = examsForDay.filter((e) => e.triageLevel === TriageLevel.OPD).length;
        const inCount = examsForDay.filter((e) => e.triageLevel === TriageLevel.IN).length;
        const erCount = examsForDay.filter((e) => e.triageLevel === TriageLevel.ER).length;

        const finalizedExams = examsForDay.filter(
          (e) => e.report && e.report.reportSignedAt !== null
        );
        const pendingCount = examsForDay.length - finalizedExams.length;

        // Proposal Rule: Average TAT is calculated ONLY from finalized reports
        const tatList = finalizedExams
          .map((e) => e.report?.tatExamToSignMinutes || 0)
          .filter((v) => v > 0);

        const avgTatMinutes =
          tatList.length > 0
            ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
            : 0;

        const y = dayDate.getFullYear();
        const m = String(dayDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(dayDate.getDate()).padStart(2, "0");
        const isoDate = `${y}-${m}-${dStr}`;

        let dayLabel = "";
        if (mode === "static") {
          dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });
        } else if (!isPrior) {
          dayLabel = index === 0 ? "Anchor" : index === 1 ? "Day -1" : `Day -${index}`;
        } else {
          dayLabel = index === 0 ? "Prior -7" : `Day -${index + 7}`;
        }

        return {
          dayLabel,
          formattedDate: dayDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            weekday: "short",
          }),
          isoDate,
          totalExams: examsForDay.length,
          opdCount,
          inCount,
          erCount,
          finalizedCount: finalizedExams.length,
          pendingCount,
          avgTatMinutes,
          avgTatHours: Number((avgTatMinutes / 60).toFixed(1)),
        };
      });

    const dayRows = buildDayRows(currentDays, false);
    const priorDayRows = buildDayRows(priorDays, true);

    // Current window totals
    const curMin = new Date(Math.min(...currentDays.map((d) => d.getTime())));
    curMin.setHours(0, 0, 0, 0);
    const curMax = new Date(Math.max(...currentDays.map((d) => d.getTime())));
    curMax.setHours(23, 59, 59, 999);

    const currentFinalized = filteredExams.filter((e) => {
      const s = new Date(e.studyDate);
      return s >= curMin && s <= curMax && e.report?.tatExamToSignMinutes;
    });
    const currentTatList = currentFinalized.map((e) => e.report!.tatExamToSignMinutes!);
    const currentAvgTat =
      currentTatList.length > 0
        ? currentTatList.reduce((a, b) => a + b, 0) / currentTatList.length
        : 0;

    // Prior window totals
    const priMin = new Date(Math.min(...priorDays.map((d) => d.getTime())));
    priMin.setHours(0, 0, 0, 0);
    const priMax = new Date(Math.max(...priorDays.map((d) => d.getTime())));
    priMax.setHours(23, 59, 59, 999);

    const priorFinalized = filteredExams.filter((e) => {
      const s = new Date(e.studyDate);
      return s >= priMin && s <= priMax && e.report?.tatExamToSignMinutes;
    });
    const priorTatList = priorFinalized.map((e) => e.report!.tatExamToSignMinutes!);
    const priorAvgTat =
      priorTatList.length > 0
        ? priorTatList.reduce((a, b) => a + b, 0) / priorTatList.length
        : 0;

    let pctChange = 0;
    if (priorAvgTat > 0 && currentAvgTat > 0) {
      pctChange = Number((((currentAvgTat - priorAvgTat) / priorAvgTat) * 100).toFixed(1));
    }

    const currentTotalVolume = dayRows.reduce((a, b) => a + b.totalExams, 0);
    const priorTotalVolume = priorDayRows.reduce((a, b) => a + b.totalExams, 0);
    const currentFinalizedCount = dayRows.reduce((a, b) => a + b.finalizedCount, 0);
    const priorFinalizedCount = priorDayRows.reduce((a, b) => a + b.finalizedCount, 0);

    const ay = anchor.getFullYear();
    const am = String(anchor.getMonth() + 1).padStart(2, "0");
    const ad = String(anchor.getDate()).padStart(2, "0");
    const anchorFormatted = `${ay}-${am}-${ad}`;

    return {
      dayRows,
      priorDayRows,
      currentAvgTatMinutes: Number(currentAvgTat.toFixed(1)),
      currentAvgTatHours: Number((currentAvgTat / 60).toFixed(1)),
      priorAvgTatMinutes: Number(priorAvgTat.toFixed(1)),
      priorAvgTatHours: Number((priorAvgTat / 60).toFixed(1)),
      currentTotalVolume,
      priorTotalVolume,
      currentFinalizedCount,
      priorFinalizedCount,
      pctChange,
      anchorFormatted,
      mode,
    };
  };

  return {
    all: computeTableForModality("ALL"),
    byModality: {
      [ModalityCode.XRAY]: computeTableForModality(ModalityCode.XRAY),
      [ModalityCode.US]: computeTableForModality(ModalityCode.US),
      [ModalityCode.CT]: computeTableForModality(ModalityCode.CT),
      [ModalityCode.MRI]: computeTableForModality(ModalityCode.MRI),
      [ModalityCode.MAMMO]: computeTableForModality(ModalityCode.MAMMO),
    },
  };
}

export async function fetchSevenDayAnalyticsAction(
  anchorDate?: string,
  mode: "rolling" | "static" = "rolling"
) {
  return await getSevenDayStaffAnalytics({ anchorDate, mode });
}



// ============================================================================
// 7. QUERY & ACTION: Multi-Year & 12-Month Historical TAT Trend (Annual Review)
// Aggregates monthly averages and YoY comparisons across any calendar year or rolling 12M
// ============================================================================
export interface MonthModalityTrend {
  avgTatHours: number;
  avgTatMinutes: number;
  totalFinalized: number;
  priorYearAvgTatHours: number;
  priorYearAvgTatMinutes: number;
  priorYearTotalFinalized: number;
}

export interface MonthTrendData {
  monthIndex: number;
  monthLabel: string;
  fullMonth: string;
  totalFinalized: number;
  avgTatHours: number;
  avgTatMinutes: number;
  priorYearAvgTatHours?: number;
  priorYearAvgTatMinutes?: number;
  priorYearTotalFinalized?: number;
  byModality?: Record<string, MonthModalityTrend>;
  [key: string]: any;
}

export interface ModalityAnnualSummary {
  modalityCode: string;
  annualTotalFinalized: number;
  annualAvgTatHours: number;
  annualAvgTatMinutes: number;
  priorAnnualTotalFinalized: number;
  priorAnnualAvgTatHours: number;
  priorAnnualAvgTatMinutes: number;
  pctChangeTat: number;
}

export interface TwelveMonthTrendResult {
  selectedPeriod: string;
  selectedPeriodLabel: string;
  priorPeriodLabel: string;
  availableYears: number[];
  months: MonthTrendData[];
  annualTotalFinalized: number;
  annualAvgTatHours: number;
  annualAvgTatMinutes: number;
  priorAnnualTotalFinalized: number;
  priorAnnualAvgTatHours: number;
  priorAnnualAvgTatMinutes: number;
  pctChangeTat: number;
  pctChangeVolume: number;
  fastestMonth: {
    monthLabel: string;
    avgTatHours: number;
    avgTatMinutes: number;
  } | null;
  peakVolumeMonth: {
    monthLabel: string;
    volume: number;
  } | null;
  byModalityAnnual?: Record<string, ModalityAnnualSummary>;
}

export async function getTwelveMonthTatTrend(
  period: string = "rolling", triageLevel: "ALL" | TriageLevel = "ALL"
): Promise<TwelveMonthTrendResult> {
  const now = new Date();
  const isRolling = period === "rolling";
  const targetYear = !isRolling && !isNaN(Number(period)) ? Number(period) : now.getFullYear();

  const monthsConfig: Array<{
    monthIndex: number;
    monthLabel: string;
    fullMonth: string;
    start: Date;
    end: Date;
    priStart: Date;
    priEnd: Date;
  }> = [];

  if (isRolling) {
    for (let i = 11; i >= 0; i--) {
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() - i;
      const start = new Date(curYear, curMonth, 1, 0, 0, 0, 0);
      const end = new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999);

      const priStart = new Date(start.getFullYear() - 1, start.getMonth(), 1, 0, 0, 0, 0);
      const priEnd = new Date(start.getFullYear() - 1, start.getMonth() + 1, 0, 23, 59, 59, 999);

      monthsConfig.push({
        monthIndex: 11 - i,
        monthLabel: start.toLocaleDateString("en-US", { month: "short" }),
        fullMonth: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        start,
        end,
        priStart,
        priEnd,
      });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const start = new Date(targetYear, m, 1, 0, 0, 0, 0);
      const end = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

      const priStart = new Date(targetYear - 1, m, 1, 0, 0, 0, 0);
      const priEnd = new Date(targetYear - 1, m + 1, 0, 23, 59, 59, 999);

      const d = new Date(targetYear, m, 1);
      monthsConfig.push({
        monthIndex: m,
        monthLabel: d.toLocaleDateString("en-US", { month: "short" }),
        fullMonth: `${d.toLocaleDateString("en-US", { month: "short" })} '${String(targetYear).slice(-2)}`,
        start,
        end,
        priStart,
        priEnd,
      });
    }
  }

  const allDateStarts = [
    ...monthsConfig.map((m) => m.start),
    ...monthsConfig.map((m) => m.priStart),
  ];
  const allDateEnds = [
    ...monthsConfig.map((m) => m.end),
    ...monthsConfig.map((m) => m.priEnd),
  ];

  const minQueryDate = new Date(Math.min(...allDateStarts.map((d) => d.getTime())));
  const maxQueryDate = new Date(Math.max(...allDateEnds.map((d) => d.getTime())));

  const examinationWhere: any = {
    studyDate: { gte: minQueryDate, lte: maxQueryDate },
    statusCode: { not: "CANCELLED" },
  };

  if (triageLevel && triageLevel !== "ALL") {
    examinationWhere.triageLevel = triageLevel;
  }

  const reports = await prisma.radiologyReport.findMany({
    where: {
      reportSignedAt: { not: null },
      examination: examinationWhere,
    },
    select: {
      tatExamToSignMinutes: true,
      examination: {
        select: { studyDate: true, modalityCode: true, triageLevel: true },
      },
    },
  });

  const modalityCodes = [
    ModalityCode.XRAY,
    ModalityCode.US,
    ModalityCode.CT,
    ModalityCode.MRI,
    ModalityCode.MAMMO,
  ];

  const allCurrentTats: number[] = [];
  const allPriorTats: number[] = [];
  let annualTotalFinalized = 0;
  let priorAnnualTotalFinalized = 0;

  const modalityCurrentTats: Record<string, number[]> = {
    [ModalityCode.XRAY]: [],
    [ModalityCode.US]: [],
    [ModalityCode.CT]: [],
    [ModalityCode.MRI]: [],
    [ModalityCode.MAMMO]: [],
  };
  const modalityPriorTats: Record<string, number[]> = {
    [ModalityCode.XRAY]: [],
    [ModalityCode.US]: [],
    [ModalityCode.CT]: [],
    [ModalityCode.MRI]: [],
    [ModalityCode.MAMMO]: [],
  };
  const modalityCurrentCounts: Record<string, number> = {
    [ModalityCode.XRAY]: 0,
    [ModalityCode.US]: 0,
    [ModalityCode.CT]: 0,
    [ModalityCode.MRI]: 0,
    [ModalityCode.MAMMO]: 0,
  };
  const modalityPriorCounts: Record<string, number> = {
    [ModalityCode.XRAY]: 0,
    [ModalityCode.US]: 0,
    [ModalityCode.CT]: 0,
    [ModalityCode.MRI]: 0,
    [ModalityCode.MAMMO]: 0,
  };

  const monthsData: MonthTrendData[] = monthsConfig.map((cfg) => {
    const curReports = reports.filter((r) => {
      const s = new Date(r.examination.studyDate);
      return s >= cfg.start && s <= cfg.end && r.tatExamToSignMinutes;
    });
    const curTatList = curReports.map((r) => r.tatExamToSignMinutes!).filter((v) => v > 0);
    const avgMinutes =
      curTatList.length > 0
        ? Number((curTatList.reduce((a, b) => a + b, 0) / curTatList.length).toFixed(1))
        : 0;
    const avgHours = Number((avgMinutes / 60).toFixed(1));

    allCurrentTats.push(...curTatList);
    annualTotalFinalized += curReports.length;

    const priReports = reports.filter((r) => {
      const s = new Date(r.examination.studyDate);
      return s >= cfg.priStart && s <= cfg.priEnd && r.tatExamToSignMinutes;
    });
    const priTatList = priReports.map((r) => r.tatExamToSignMinutes!).filter((v) => v > 0);
    const priAvgMinutes =
      priTatList.length > 0
        ? Number((priTatList.reduce((a, b) => a + b, 0) / priTatList.length).toFixed(1))
        : 0;
    const priAvgHours = Number((priAvgMinutes / 60).toFixed(1));

    allPriorTats.push(...priTatList);
    priorAnnualTotalFinalized += priReports.length;

    const byModality: Record<string, MonthModalityTrend> = {};
    const flatModalityProps: Record<string, number> = {};

    for (const mCode of modalityCodes) {
      const curModReports = curReports.filter((r) => r.examination.modalityCode === mCode);
      const curModTats = curModReports.map((r) => r.tatExamToSignMinutes!).filter((v) => v > 0);
      const curModAvgMin =
        curModTats.length > 0
          ? Number((curModTats.reduce((a, b) => a + b, 0) / curModTats.length).toFixed(1))
          : 0;
      const curModAvgHours = Number((curModAvgMin / 60).toFixed(1));

      modalityCurrentTats[mCode].push(...curModTats);
      modalityCurrentCounts[mCode] += curModReports.length;

      const priModReports = priReports.filter((r) => r.examination.modalityCode === mCode);
      const priModTats = priModReports.map((r) => r.tatExamToSignMinutes!).filter((v) => v > 0);
      const priModAvgMin =
        priModTats.length > 0
          ? Number((priModTats.reduce((a, b) => a + b, 0) / priModTats.length).toFixed(1))
          : 0;
      const priModAvgHours = Number((priModAvgMin / 60).toFixed(1));

      modalityPriorTats[mCode].push(...priModTats);
      modalityPriorCounts[mCode] += priModReports.length;

      byModality[mCode] = {
        avgTatHours: curModAvgHours,
        avgTatMinutes: curModAvgMin,
        totalFinalized: curModReports.length,
        priorYearAvgTatHours: priModAvgHours,
        priorYearAvgTatMinutes: priModAvgMin,
        priorYearTotalFinalized: priModReports.length,
      };

      flatModalityProps[`${mCode}_avgTatHours`] = curModAvgHours;
      flatModalityProps[`${mCode}_totalFinalized`] = curModReports.length;
      flatModalityProps[`prior_${mCode}_avgTatHours`] = priModAvgHours;
      flatModalityProps[`prior_${mCode}_totalFinalized`] = priModReports.length;
    }

    return {
      monthIndex: cfg.monthIndex,
      monthLabel: cfg.monthLabel,
      fullMonth: cfg.fullMonth,
      totalFinalized: curReports.length,
      avgTatHours: avgHours,
      avgTatMinutes: avgMinutes,
      priorYearAvgTatHours: priAvgHours,
      priorYearAvgTatMinutes: priAvgMinutes,
      priorYearTotalFinalized: priReports.length,
      byModality,
      ...flatModalityProps,
    };
  });

  const annualAvgTatMinutes =
    allCurrentTats.length > 0
      ? Number((allCurrentTats.reduce((a, b) => a + b, 0) / allCurrentTats.length).toFixed(1))
      : 0;
  const annualAvgTatHours = Number((annualAvgTatMinutes / 60).toFixed(1));

  const priorAnnualAvgTatMinutes =
    allPriorTats.length > 0
      ? Number((allPriorTats.reduce((a, b) => a + b, 0) / allPriorTats.length).toFixed(1))
      : 0;
  const priorAnnualAvgTatHours = Number((priorAnnualAvgTatMinutes / 60).toFixed(1));

  let pctChangeTat = 0;
  if (priorAnnualAvgTatMinutes > 0 && annualAvgTatMinutes > 0) {
    pctChangeTat = Number(
      (((annualAvgTatMinutes - priorAnnualAvgTatMinutes) / priorAnnualAvgTatMinutes) * 100).toFixed(1)
    );
  }

  let pctChangeVolume = 0;
  if (priorAnnualTotalFinalized > 0 && annualTotalFinalized > 0) {
    pctChangeVolume = Number(
      (
        ((annualTotalFinalized - priorAnnualTotalFinalized) / priorAnnualTotalFinalized) *
        100
      ).toFixed(1)
    );
  }

  const byModalityAnnual: Record<string, ModalityAnnualSummary> = {};
  for (const mCode of modalityCodes) {
    const curTats = modalityCurrentTats[mCode];
    const priTats = modalityPriorTats[mCode];
    const curAvgMin =
      curTats.length > 0 ? Number((curTats.reduce((a, b) => a + b, 0) / curTats.length).toFixed(1)) : 0;
    const curAvgHours = Number((curAvgMin / 60).toFixed(1));
    const priAvgMin =
      priTats.length > 0 ? Number((priTats.reduce((a, b) => a + b, 0) / priTats.length).toFixed(1)) : 0;
    const priAvgHours = Number((priAvgMin / 60).toFixed(1));
    let pctChange = 0;
    if (priAvgMin > 0 && curAvgMin > 0) {
      pctChange = Number((((curAvgMin - priAvgMin) / priAvgMin) * 100).toFixed(1));
    }
    byModalityAnnual[mCode] = {
      modalityCode: mCode,
      annualTotalFinalized: modalityCurrentCounts[mCode],
      annualAvgTatHours: curAvgHours,
      annualAvgTatMinutes: curAvgMin,
      priorAnnualTotalFinalized: modalityPriorCounts[mCode],
      priorAnnualAvgTatHours: priAvgHours,
      priorAnnualAvgTatMinutes: priAvgMin,
      pctChangeTat: pctChange,
    };
  }

  const activeMonths = monthsData.filter((m) => m.avgTatMinutes > 0);
  const fastestMonth =
    activeMonths.length > 0
      ? [...activeMonths].sort((a, b) => a.avgTatMinutes - b.avgTatMinutes)[0]
      : null;

  const activeVolMonths = monthsData.filter((m) => m.totalFinalized > 0);
  const peakVolumeMonth =
    activeVolMonths.length > 0
      ? [...activeVolMonths].sort((a, b) => b.totalFinalized - a.totalFinalized)[0]
      : null;

  const distinctExams = await prisma.examination.findMany({
    where: { statusCode: { not: "CANCELLED" } },
    select: { studyDate: true },
  });
  const yearSet = new Set(distinctExams.map((e) => new Date(e.studyDate).getFullYear()));
  const currentYear = now.getFullYear();
  for (let y = currentYear - 6; y <= currentYear + 1; y++) {
    yearSet.add(y);
  }
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  return {
    selectedPeriod: period,
    selectedPeriodLabel: isRolling
      ? "Past 12 Months (Rolling)"
      : `${targetYear} Calendar Year`,
    priorPeriodLabel: isRolling
      ? "Preceding 12 Months"
      : `${targetYear - 1} Calendar Year`,
    availableYears,
    months: monthsData,
    annualTotalFinalized,
    annualAvgTatHours,
    annualAvgTatMinutes,
    priorAnnualTotalFinalized,
    priorAnnualAvgTatHours,
    priorAnnualAvgTatMinutes,
    pctChangeTat,
    pctChangeVolume,
    fastestMonth: fastestMonth
      ? {
          monthLabel: fastestMonth.fullMonth,
          avgTatHours: fastestMonth.avgTatHours,
          avgTatMinutes: fastestMonth.avgTatMinutes,
        }
      : null,
    peakVolumeMonth: peakVolumeMonth
      ? {
          monthLabel: peakVolumeMonth.fullMonth,
          volume: peakVolumeMonth.totalFinalized,
        }
      : null,
    byModalityAnnual,
  };
}

export async function fetchYearlyTrendAction(period: string = "rolling", triageLevel: "ALL" | TriageLevel = "ALL") {
  return await getTwelveMonthTatTrend(period, triageLevel);
}

// ============================================================================
// 8. QUERY: Real Modality Turnaround Time (TAT) vs SLA Target Overview
// Calculates real-time average TAT per modality filtered by STAT vs Routine
// ============================================================================
export interface ModalityTatStats {
  avgTat: number;
  target: number;
  volume: number;
}

export type ModalityTemporalPeriod =
  | "ALL"
  | "7D"
  | "ROLLING_7D"
  | "WEEK"
  | "PAST_WEEK"
  | "LAST_WEEK"
  | "MONTH"
  | "YEAR";

export interface ModalityTatOverviewItem {
  modality: string;
  name: string;
  all: ModalityTatStats;
  emergency: ModalityTatStats;
  routine: ModalityTatStats;
  opd: ModalityTatStats;
  er: ModalityTatStats;
  inpatient: ModalityTatStats;
}

export interface MultiPeriodModalityTatOverview {
  currentPeriod: ModalityTemporalPeriod;
  periods: {
    ALL: ModalityTatOverviewItem[];
    "7D": ModalityTatOverviewItem[];
    ROLLING_7D?: ModalityTatOverviewItem[];
    WEEK?: ModalityTatOverviewItem[];
    PAST_WEEK?: ModalityTatOverviewItem[];
    LAST_WEEK?: ModalityTatOverviewItem[];
    MONTH: ModalityTatOverviewItem[];
    YEAR: ModalityTatOverviewItem[];
  };
}

export async function getModalityTatOverview(): Promise<MultiPeriodModalityTatOverview> {
  const modalities = await prisma.modality.findMany({
    include: {
      slaConfigs: true,
      examinations: {
        where: {
          report: { reportSignedAt: { not: null } },
          statusCode: { not: "CANCELLED" },
        },
        include: { report: true },
      },
    },
    orderBy: { modalityCode: "asc" },
  });

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const diffToMonday = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
  const startOfPastWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday - 7, 0, 0, 0, 0);
  const endOfPastWeek = new Date(startOfPastWeek);
  endOfPastWeek.setDate(startOfPastWeek.getDate() + 6);
  endOfPastWeek.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

  const buildPeriodData = (period: ModalityTemporalPeriod): ModalityTatOverviewItem[] => {
    return modalities.map((m) => {
      const periodExams = m.examinations.filter((e) => {
        if (period === "ALL") return true;
        const examDate = e.studyDate
          ? new Date(e.studyDate)
          : e.report?.reportSignedAt
          ? new Date(e.report.reportSignedAt)
          : null;
        if (!examDate) return false;
        if (period === "7D" || period === "ROLLING_7D") return examDate >= sevenDaysAgo && examDate <= now;
        if (period === "WEEK") return examDate >= startOfThisWeek && examDate <= now;
        if (period === "PAST_WEEK" || period === "LAST_WEEK") return examDate >= startOfPastWeek && examDate <= endOfPastWeek;
        if (period === "MONTH") return examDate >= startOfMonth && examDate <= now;
        if (period === "YEAR") return examDate >= startOfYear && examDate <= now;
        return true;
      });

      const calcStats = (
        exams: typeof m.examinations,
        filterType: "all" | "isStat" | "isRoutine" | "OPD" | "ER" | "IN"
      ): ModalityTatStats => {
        const filtered = exams.filter((e) => {
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
          sla =
            m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD && s.urgencyLevel === UrgencyLevel.ROUTINE) ||
            m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD) ||
            m.slaConfigs[0];
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
        all: calcStats(periodExams, "all"),
        emergency: calcStats(periodExams, "isStat"),
        routine: calcStats(periodExams, "isRoutine"),
        opd: calcStats(periodExams, "OPD"),
        er: calcStats(periodExams, "ER"),
        inpatient: calcStats(periodExams, "IN"),
      };
    });
  };

  const rolling7Data = buildPeriodData("7D");
  const weekData = buildPeriodData("WEEK");
  const pastWeekData = buildPeriodData("PAST_WEEK");

  return {
    currentPeriod: "ALL",
    periods: {
      ALL: buildPeriodData("ALL"),
      "7D": rolling7Data,
      ROLLING_7D: rolling7Data,
      WEEK: weekData,
      PAST_WEEK: pastWeekData,
      LAST_WEEK: pastWeekData,
      MONTH: buildPeriodData("MONTH"),
      YEAR: buildPeriodData("YEAR"),
    },
  };
}

// Action: Fetch Modality TAT Overview for Specific Period or Custom Range
export async function fetchModalityTatDataAction(options: {
  period: string;
  startDate?: string;
  endDate?: string;
}): Promise<ModalityTatOverviewItem[]> {
  const now = new Date();
  let start: Date | undefined;
  let end: Date = now;

  if (options.period === "7D" || options.period === "ROLLING_7D") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (options.period === "WEEK") {
    const day = now.getDay();
    const diffToMon = now.getDate() - (day === 0 ? 6 : day - 1);
    start = new Date(now.getFullYear(), now.getMonth(), diffToMon, 0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (options.period === "PAST_WEEK" || options.period === "LAST_WEEK") {
    const day = now.getDay();
    const diffToMon = now.getDate() - (day === 0 ? 6 : day - 1) - 7;
    start = new Date(now.getFullYear(), now.getMonth(), diffToMon, 0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (options.period === "MONTH") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (options.period === "YEAR") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else if (options.period === "CUSTOM" && options.startDate && options.endDate) {
    const sParts = options.startDate.split("-").map(Number);
    const eParts = options.endDate.split("-").map(Number);
    start = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
    end = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);
  }

  const modalities = await prisma.modality.findMany({
    include: {
      slaConfigs: true,
      examinations: {
        where: {
          report: { reportSignedAt: { not: null } },
          statusCode: { not: "CANCELLED" },
          studyDate: start ? { gte: start, lte: end } : undefined,
        },
        include: { report: true },
      },
    },
    orderBy: { modalityCode: "asc" },
  });

  return modalities.map((m) => {
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
        sla =
          m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD && s.urgencyLevel === UrgencyLevel.ROUTINE) ||
          m.slaConfigs.find((s) => s.triageLevel === TriageLevel.OPD) ||
          m.slaConfigs[0];
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
}

// 8B. ACTION: Fetch Modality TAT Overview for Custom Date Range
export async function fetchModalityTatCustomRangeAction(
  startDateStr: string,
  endDateStr: string
): Promise<ModalityTatOverviewItem[]> {
  return fetchModalityTatDataAction({
    period: "CUSTOM",
    startDate: startDateStr,
    endDate: endDateStr,
  });
}

