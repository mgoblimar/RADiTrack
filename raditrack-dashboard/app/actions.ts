"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  TriageLevel,
  UrgencyLevel,
  ModalityCode,
  ExaminationStatusCode,
  ReportStatusCode,
} from "@/lib/enums";

// Calculates the median of an array of numbers
export async function calculatedMedian(numbers: number[]): Promise<number> {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
}

// 1. ACTION: Log New Examination (Manual Ingestion)
export async function createExaminationAction(formData: FormData) {
  const examinationIdentifier = formData.get("examinationIdentifier") as string;
  const modalityCode = (formData.get("modalityCode") as string) || ModalityCode.CT;
  const triageLevel = (formData.get("triageLevel") as string) || TriageLevel.OPD;
  const urgencyLevel = (formData.get("urgencyLevel") as string) || UrgencyLevel.ROUTINE;
  const statusCode =
    (formData.get("statusCode") as string) || ExaminationStatusCode.EXAM_COMPLETED;

  const now = new Date();

  await prisma.examination.create({
    data: {
      examinationIdentifier,
      modalityCode,
      statusCode,
      triageLevel,
      urgencyLevel,
      studyDate: now,
      examCompletedAt: now,
    },
  });

  revalidatePath("/");
}

// 2. ACTION: Sign Off Report (TAT & SLA Engine)
export async function signOffReportAction(formData: FormData) {
  const examId = formData.get("examId") as string;
  const now = new Date();

  const exam = await prisma.examination.findUnique({
    where: { examId },
    include: { modality: { include: { slaConfigs: true } } },
  });

  if (!exam || !exam.examCompletedAt) {
    throw new Error("Exam not found or completion time missing.");
  }

  // Turnaround Time in minutes: (ReportSigned - ExamCompleted)
  const diffMs = now.getTime() - new Date(exam.examCompletedAt).getTime();
  const tatMinutes = Number((diffMs / (1000 * 60)).toFixed(2));

  // Match SLA Target Rule
  const targetRule = exam.modality.slaConfigs.find(
    (s) =>
      s.triageLevel === exam.triageLevel &&
      s.urgencyLevel === exam.urgencyLevel,
  );
  const isSlaBreached = targetRule
    ? tatMinutes > targetRule.targetTatMinutes
    : false;

  await prisma.$transaction([
    prisma.radiologyReport.upsert({
      where: { examId },
      update: {
        reportSignedAt: now,
        tatExamToSignMinutes: tatMinutes,
        isSlaBreached,
        reportStatus: ReportStatusCode.FINALIZED,
      },
      create: {
        examId,
        reportSignedAt: now,
        tatExamToSignMinutes: tatMinutes,
        isSlaBreached,
        reportStatus: ReportStatusCode.FINALIZED,
      },
    }),
    prisma.examination.update({
      where: { examId },
      data: { statusCode: ExaminationStatusCode.COMPLETED_SIGNED_OFF },
    }),
  ]);

  revalidatePath("/");
}

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

  return {
    totalVolume: allExams.length,
    finalizedCount: allReports.length,
    pendingReadingCount: pendingReadingExams.length,
    avgTatMinutes: avgTat,
    medianTatMinutes: medianTat,
    pctOnTime,
    pendingReadingQueue: pendingReadingExams.map((e) => {
      const dwellMinutes = Number(
        (
          (now.getTime() - new Date(e.examCompletedAt!).getTime()) /
          (1000 * 60)
        ).toFixed(1),
      );
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
        targetTat: targetRule?.targetTatMinutes ?? null,
        isBreached,
        isCarryOver,
        notes: e.notes ?? "",
      };
    }),
  };
}


// ============================================================================
// 4. QUERY: Public Patient Activity Display Data (/patient)
// Aligned with Proposal Page 5: Today vs Yesterday volume by Modality and Triage
// ============================================================================
export async function getPublicActivityData() {
  const now = new Date();
  
  // Define Today bounds
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Define Yesterday bounds
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  // Fetch all exams from yesterday onwards
  const recentExams = await prisma.examination.findMany({
    where: {
      studyDate: { gte: yesterdayStart, lte: todayEnd },
      statusCode: { not: "CANCELLED" },
    },
    select: {
      modalityCode: true,
      triageLevel: true,
      studyDate: true,
    },
  });

  const modalities: Array<{ code: ModalityCode; name: string }> = [
    { code: ModalityCode.XRAY, name: "General Radiography (X-ray)" },
    { code: ModalityCode.US, name: "Ultrasound" },
    { code: ModalityCode.CT, name: "Computed Tomography (CT-Scan)" },
    { code: ModalityCode.MRI, name: "Magnetic Resonance Imaging (MRI)" },
    { code: ModalityCode.MAMMO, name: "Mammography" },
  ];

  let todayGrandTotal = 0;
  let yesterdayGrandTotal = 0;

  const modalityData = modalities.map((m) => {
    // Filter exams for this modality
    const examsForMod = recentExams.filter((e) => e.modalityCode === m.code);

    const todayExams = examsForMod.filter(
      (e) => new Date(e.studyDate) >= todayStart
    );
    const yesterdayExams = examsForMod.filter(
      (e) => new Date(e.studyDate) >= yesterdayStart && new Date(e.studyDate) <= yesterdayEnd
    );

    const countByTriage = (list: typeof examsForMod) => ({
      opd: list.filter((e) => e.triageLevel === TriageLevel.OPD).length,
      in: list.filter((e) => e.triageLevel === TriageLevel.IN).length,
      er: list.filter((e) => e.triageLevel === TriageLevel.ER).length,
      total: list.length,
    });

    const todayCounts = countByTriage(todayExams);
    const yesterdayCounts = countByTriage(yesterdayExams);

    todayGrandTotal += todayCounts.total;
    yesterdayGrandTotal += yesterdayCounts.total;

    return {
      modalityCode: m.code,
      modalityName: m.name,
      today: todayCounts,
      yesterday: yesterdayCounts,
    };
  });

  return {
    asOfDate: now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    lastUpdatedTime: now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    todayGrandTotal,
    yesterdayGrandTotal,
    modalities: modalityData,
  };
}

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
// 6. ACTION: Client Request - Export Raw De-Identified Data to CSV
// Used by hospital staff to audit timestamps against RIS and monthly reports
// ============================================================================
export async function exportExaminationsCSVAction(): Promise<string> {
  const exams = await prisma.examination.findMany({
    include: {
      report: true,
      modality: { include: { slaConfigs: true } },
    },
    orderBy: { studyDate: "desc" },
  });
  const headers = [
    "Accession_Number",
    "Modality_Code",
    "Triage_Origin",
    "Clinical_Urgency",
    "Study_Date",
    "Exam_Completed_T1",
    "Report_Signed_T2",
    "Turnaround_Time_Minutes",
    "Turnaround_Time_Hours",
    "Target_SLA_Minutes",
    "SLA_Breach_Status",
    "Workflow_Status",
  ];
  const rows = exams.map((e) => {
    const targetRule = e.modality.slaConfigs.find(
      (s) => s.triageLevel === e.triageLevel && s.urgencyLevel === e.urgencyLevel
    );
    const tatMinutes = e.report?.tatExamToSignMinutes ?? "";
    const tatHours = tatMinutes !== "" ? (Number(tatMinutes) / 60).toFixed(2) : "";
    const isBreached = e.report ? (e.report.isSlaBreached ? "BREACHED" : "MET_SLA") : "PENDING";
    return [
      e.examinationIdentifier,
      e.modalityCode,
      e.triageLevel,
      e.urgencyLevel,
      e.studyDate.toISOString().split("T")[0],
      e.examCompletedAt ? e.examCompletedAt.toISOString() : "",
      e.report?.reportSignedAt ? e.report.reportSignedAt.toISOString() : "",
      tatMinutes,
      tatHours,
      targetRule?.targetTatMinutes ?? "",
      isBreached,
      e.statusCode,
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

// ============================================================================
// 7. QUERY & ACTION: Multi-Year & 12-Month Historical TAT Trend (Annual Review)
// Aggregates monthly averages and YoY comparisons across any calendar year or rolling 12M
// ============================================================================
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
}

export async function getTwelveMonthTatTrend(
  period: string = "rolling"
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

  const reports = await prisma.radiologyReport.findMany({
    where: {
      reportSignedAt: { not: null },
      examination: {
        studyDate: { gte: minQueryDate, lte: maxQueryDate },
        statusCode: { not: "CANCELLED" },
      },
    },
    select: {
      tatExamToSignMinutes: true,
      examination: {
        select: { studyDate: true },
      },
    },
  });

  const allCurrentTats: number[] = [];
  const allPriorTats: number[] = [];
  let annualTotalFinalized = 0;
  let priorAnnualTotalFinalized = 0;

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
  };
}

export async function fetchYearlyTrendAction(period: string = "rolling") {
  return await getTwelveMonthTatTrend(period);
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

export type ModalityTemporalPeriod = "ALL" | "7D" | "MONTH" | "YEAR";

export interface ModalityTatOverviewItem {
  modality: string;
  name: string;
  all: ModalityTatStats;
  emergency: ModalityTatStats;
  routine: ModalityTatStats;
}

export interface MultiPeriodModalityTatOverview {
  currentPeriod: ModalityTemporalPeriod;
  periods: {
    ALL: ModalityTatOverviewItem[];
    "7D": ModalityTatOverviewItem[];
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
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

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
        if (period === "7D") return examDate >= sevenDaysAgo && examDate <= now;
        if (period === "MONTH") return examDate >= startOfMonth && examDate <= now;
        if (period === "YEAR") return examDate >= startOfYear && examDate <= now;
        return true;
      });

      const calcStats = (exams: typeof m.examinations, isStat: boolean | null): ModalityTatStats => {
        const filtered = exams.filter((e) => {
          if (isStat === true) return e.urgencyLevel === UrgencyLevel.STAT || e.triageLevel === TriageLevel.ER;
          if (isStat === false) return e.urgencyLevel === UrgencyLevel.ROUTINE && e.triageLevel !== TriageLevel.ER;
          return true;
        });

        const tatList = filtered
          .map((e) => e.report?.tatExamToSignMinutes || 0)
          .filter((v) => v > 0);

        const avgTat =
          tatList.length > 0
            ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
            : 0;

        // Select matching target from SLA rules
        const sla = m.slaConfigs.find((s) => {
          if (isStat === true) return s.urgencyLevel === UrgencyLevel.STAT || s.triageLevel === TriageLevel.ER;
          if (isStat === false) return s.urgencyLevel === UrgencyLevel.ROUTINE;
          return true;
        });

        // Default fallback targets if specific rule not matched
        const defaultTarget =
          m.modalityCode === ModalityCode.CT
            ? (isStat ? 60 : 1440)
            : m.modalityCode === ModalityCode.XRAY
            ? (isStat ? 30 : 480)
            : 120;

        return {
          avgTat,
          target: sla?.targetTatMinutes || defaultTarget,
          volume: filtered.length,
        };
      };

      return {
        modality: m.modalityCode,
        name: m.modalityName,
        all: calcStats(periodExams, null),
        emergency: calcStats(periodExams, true),
        routine: calcStats(periodExams, false),
      };
    });
  };

  return {
    currentPeriod: "ALL",
    periods: {
      ALL: buildPeriodData("ALL"),
      "7D": buildPeriodData("7D"),
      MONTH: buildPeriodData("MONTH"),
      YEAR: buildPeriodData("YEAR"),
    },
  };
}

// 8B. ACTION: Fetch Modality TAT Overview for Custom Date Range
export async function fetchModalityTatCustomRangeAction(
  startDateStr: string,
  endDateStr: string
): Promise<ModalityTatOverviewItem[]> {
  const partsStart = startDateStr.split("-").map(Number);
  const start = new Date(partsStart[0], partsStart[1] - 1, partsStart[2], 0, 0, 0, 0);

  const partsEnd = endDateStr.split("-").map(Number);
  const end = new Date(partsEnd[0], partsEnd[1] - 1, partsEnd[2], 23, 59, 59, 999);

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

  return modalities.map((m) => {
    const periodExams = m.examinations.filter((e) => {
      const examDate = e.studyDate
        ? new Date(e.studyDate)
        : e.report?.reportSignedAt
        ? new Date(e.report.reportSignedAt)
        : null;
      if (!examDate) return false;
      return examDate >= start && examDate <= end;
    });

    const calcStats = (exams: typeof m.examinations, isStat: boolean | null): ModalityTatStats => {
      const filtered = exams.filter((e) => {
        if (isStat === true) return e.urgencyLevel === UrgencyLevel.STAT || e.triageLevel === TriageLevel.ER;
        if (isStat === false) return e.urgencyLevel === UrgencyLevel.ROUTINE && e.triageLevel !== TriageLevel.ER;
        return true;
      });

      const tatList = filtered
        .map((e) => e.report?.tatExamToSignMinutes || 0)
        .filter((v) => v > 0);

      const avgTat =
        tatList.length > 0
          ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
          : 0;

      const sla = m.slaConfigs.find((s) => {
        if (isStat === true) return s.urgencyLevel === UrgencyLevel.STAT || s.triageLevel === TriageLevel.ER;
        if (isStat === false) return s.urgencyLevel === UrgencyLevel.ROUTINE;
        return true;
      });

      const defaultTarget =
        m.modalityCode === ModalityCode.CT
          ? (isStat ? 60 : 1440)
          : m.modalityCode === ModalityCode.XRAY
          ? (isStat ? 30 : 480)
          : 120;

      return {
        avgTat,
        target: sla?.targetTatMinutes || defaultTarget,
        volume: filtered.length,
      };
    };

    return {
      modality: m.modalityCode,
      name: m.modalityName,
      all: calcStats(periodExams, null),
      emergency: calcStats(periodExams, true),
      routine: calcStats(periodExams, false),
    };
  });
}

// ============================================================================
// 9. AGENDA 4 ACTIONS: Examination Record Lifecycle Management
// ============================================================================

/**
 * 9A. ACTION: Update Unfinalized Examination Details
 * Corrects manual entry mistakes (Accession ID, Modality, Triage, Urgency, Notes)
 */
export async function updateExaminationAction(formData: FormData) {
  const examId = formData.get("examId") as string;
  const examinationIdentifier = (formData.get("examinationIdentifier") as string)?.trim();
  const modalityCode = formData.get("modalityCode") as string;
  const triageLevel = formData.get("triageLevel") as string;
  const urgencyLevel = formData.get("urgencyLevel") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!examId || !examinationIdentifier || !modalityCode || !triageLevel || !urgencyLevel) {
    throw new Error("Missing required examination update fields.");
  }

  // Safety check: Prevent modifying core parameters if already finalized
  const existing = await prisma.examination.findUnique({
    where: { examId },
    include: { report: true },
  });

  if (!existing) {
    throw new Error("Examination not found.");
  }

  if (existing.report?.reportSignedAt) {
    throw new Error("Finalized examination parameters cannot be modified to preserve audit integrity.");
  }

  await prisma.examination.update({
    where: { examId },
    data: {
      examinationIdentifier,
      modalityCode,
      triageLevel,
      urgencyLevel,
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/patient");
}

/**
 * 9B. ACTION: Soft Cancel Examination (Clinical Standard for Aborted Procedures)
 * Sets status to CANCELLED, removing from queue & TAT while preserving medical-legal logs
 */
export async function cancelExaminationAction(formData: FormData) {
  const examId = formData.get("examId") as string;
  if (!examId) throw new Error("Missing examId for cancellation.");

  await prisma.examination.update({
    where: { examId },
    data: {
      statusCode: ExaminationStatusCode.CANCELLED,
    },
  });

  revalidatePath("/");
  revalidatePath("/patient");
}

/**
 * 9C. ACTION: Hard Delete Examination (Administrative Duplicate Cleanup)
 * Permanently removes mistaken double entries from database (cascades report)
 */
export async function deleteExaminationAction(formData: FormData) {
  const examId = formData.get("examId") as string;
  if (!examId) throw new Error("Missing examId for deletion.");

  await prisma.examination.delete({
    where: { examId },
  });

  revalidatePath("/");
  revalidatePath("/patient");
}

// ============================================================================
// 10. ACTION: Advanced Filtered Examinations Query (Examinations Hub)
// Supports filtering exact exams by Status, Date Presets, Custom Range, Modality, etc.
// ============================================================================
export interface ExaminationFilterOptions {
  statusType?: "all" | "backlog" | "finalized";
  datePreset?: "all" | "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  modalityCode?: string;
  triageLevel?: string;
  urgencyLevel?: string;
  searchTerm?: string;
}

export interface FilteredExaminationItem {
  examId: string;
  identifier: string;
  modalityCode: string;
  triageLevel: string;
  urgencyLevel: string;
  studyDateFormatted: string;
  isoDate: string;
  examCompletedAtFormatted: string | null;
  reportSignedAtFormatted: string | null;
  dwellMinutes: number | null;
  tatMinutes: number | null;
  tatHours: number | null;
  targetTatMinutes: number | null;
  isBreached: boolean;
  isCarryOver: boolean;
  isFinalized: boolean;
  statusCode: string;
  notes: string;
}

export interface FilteredExaminationsResult {
  items: FilteredExaminationItem[];
  totalCount: number;
  summary: {
    totalFinalized: number;
    totalBacklog: number;
    avgTatMinutes: number;
    avgTatHours: number;
    totalBreached: number;
  };
}

export async function fetchFilteredExaminationsAction(
  options: ExaminationFilterOptions
): Promise<FilteredExaminationsResult> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const datePreset = options.datePreset || "all";
  let dateFilter: { gte?: Date; lte?: Date } | undefined = undefined;

  if (datePreset === "today") {
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  } else if (datePreset === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const diffToMon = d.getDate() - (day === 0 ? 6 : day - 1);
    const mon = new Date(d);
    mon.setDate(diffToMon);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    dateFilter = { gte: mon, lte: sun };
  } else if (datePreset === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  } else if (datePreset === "year") {
    const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  } else if (datePreset === "custom" && options.startDate && options.endDate) {
    const sParts = options.startDate.split("-").map(Number);
    const eParts = options.endDate.split("-").map(Number);
    const s = new Date(sParts[0], sParts[1] - 1, sParts[2], 0, 0, 0, 0);
    const e = new Date(eParts[0], eParts[1] - 1, eParts[2], 23, 59, 59, 999);
    dateFilter = { gte: s, lte: e };
  }

  const whereClause: any = {
    statusCode: { not: "CANCELLED" },
  };

  if (dateFilter) {
    whereClause.studyDate = dateFilter;
  }

  if (options.statusType === "backlog") {
    whereClause.report = { is: null };
  } else if (options.statusType === "finalized") {
    whereClause.report = { reportSignedAt: { not: null } };
  }

  if (options.modalityCode && options.modalityCode !== "ALL") {
    whereClause.modalityCode = options.modalityCode;
  }

  if (options.triageLevel && options.triageLevel !== "ALL") {
    whereClause.triageLevel = options.triageLevel;
  }

  if (options.urgencyLevel && options.urgencyLevel !== "ALL") {
    whereClause.urgencyLevel = options.urgencyLevel;
  }

  if (options.searchTerm && options.searchTerm.trim() !== "") {
    whereClause.examinationIdentifier = { contains: options.searchTerm.trim() };
  }

  const exams = await prisma.examination.findMany({
    where: whereClause,
    include: {
      report: true,
      modality: { include: { slaConfigs: true } },
    },
    orderBy: { studyDate: "desc" },
  });

  const tatList: number[] = [];
  let totalBreached = 0;
  let totalFinalized = 0;
  let totalBacklog = 0;

  const items: FilteredExaminationItem[] = exams.map((e) => {
    const isFinalized = Boolean(e.report && e.report.reportSignedAt);
    const targetRule = e.modality.slaConfigs.find(
      (s) => s.triageLevel === e.triageLevel && s.urgencyLevel === e.urgencyLevel
    );
    const targetTat = targetRule?.targetTatMinutes ?? null;

    let dwellMinutes: number | null = null;
    let tatMinutes: number | null = null;
    let tatHours: number | null = null;
    let isBreached = false;
    let isCarryOver = false;

    if (isFinalized) {
      totalFinalized++;
      tatMinutes = e.report?.tatExamToSignMinutes ?? null;
      if (tatMinutes && tatMinutes > 0) {
        tatList.push(tatMinutes);
        tatHours = Number((tatMinutes / 60).toFixed(1));
      }
      isBreached = Boolean(e.report?.isSlaBreached);
      if (isBreached) totalBreached++;
    } else {
      totalBacklog++;
      isCarryOver = new Date(e.studyDate) < todayStart;
      if (e.examCompletedAt) {
        dwellMinutes = Number(
          ((now.getTime() - new Date(e.examCompletedAt).getTime()) / (1000 * 60)).toFixed(1)
        );
        if (targetTat && dwellMinutes > targetTat) {
          isBreached = true;
          totalBreached++;
        }
      }
    }

    return {
      examId: e.examId,
      identifier: e.examinationIdentifier,
      modalityCode: e.modalityCode,
      triageLevel: e.triageLevel,
      urgencyLevel: e.urgencyLevel,
      studyDateFormatted: new Date(e.studyDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      isoDate: new Date(e.studyDate).toISOString().split("T")[0],
      examCompletedAtFormatted: e.examCompletedAt
        ? new Date(e.examCompletedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      reportSignedAtFormatted: e.report?.reportSignedAt
        ? new Date(e.report.reportSignedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      dwellMinutes,
      tatMinutes,
      tatHours,
      targetTatMinutes: targetTat,
      isBreached,
      isCarryOver,
      isFinalized,
      statusCode: e.statusCode,
      notes: e.notes ?? "",
    };
  });

  const avgTatMinutes =
    tatList.length > 0
      ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
      : 0;
  const avgTatHours = Number((avgTatMinutes / 60).toFixed(1));

  return {
    items,
    totalCount: items.length,
    summary: {
      totalFinalized,
      totalBacklog,
      avgTatMinutes,
      avgTatHours,
      totalBreached,
    },
  };
}

// ============================================================================
// 11. ACTION: RIS Workflow Simulator Scenarios & Instant Actions
// Used exclusively on the dedicated /simulator page
// ============================================================================
export async function simulateScenarioAction(
  scenario: "stat_ct" | "stat_xray" | "opd_us" | "in_mri"
) {
  const count = await prisma.examination.count();
  const nextId = `ACC-QCGH-${1000 + count + 1}`;
  const now = new Date();

  let modalityCode: ModalityCode = ModalityCode.CT;
  let triageLevel: TriageLevel = TriageLevel.ER;
  let urgencyLevel: UrgencyLevel = UrgencyLevel.STAT;
  let notes = "Simulated ER Trauma Scan";

  if (scenario === "stat_xray") {
    modalityCode = ModalityCode.XRAY;
    triageLevel = TriageLevel.ER;
    urgencyLevel = UrgencyLevel.STAT;
    notes = "Simulated Acute Chest X-Ray";
  } else if (scenario === "opd_us") {
    modalityCode = ModalityCode.US;
    triageLevel = TriageLevel.OPD;
    urgencyLevel = UrgencyLevel.ROUTINE;
    notes = "Simulated Outpatient Abdominal Ultrasound";
  } else if (scenario === "in_mri") {
    modalityCode = ModalityCode.MRI;
    triageLevel = TriageLevel.IN;
    urgencyLevel = UrgencyLevel.ROUTINE;
    notes = "Simulated Inpatient Brain MRI Scan";
  }

  await prisma.examination.create({
    data: {
      examinationIdentifier: nextId,
      modalityCode,
      statusCode: ExaminationStatusCode.EXAM_COMPLETED,
      triageLevel,
      urgencyLevel,
      studyDate: now,
      examCompletedAt: now,
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/simulator");
  revalidatePath("/patient");
  return { success: true, identifier: nextId };
}

export async function autoSignOldestBacklogAction() {
  const oldest = await prisma.examination.findFirst({
    where: {
      statusCode: { not: "CANCELLED" },
      report: { is: null },
      examCompletedAt: { not: null },
    },
    include: {
      modality: { include: { slaConfigs: true } },
    },
    orderBy: { examCompletedAt: "asc" },
  });

  if (!oldest || !oldest.examCompletedAt) {
    return { success: false, message: "No pending unfinalized studies found in queue." };
  }

  const now = new Date();
  const tatMinutes = Number(
    ((now.getTime() - new Date(oldest.examCompletedAt).getTime()) / (1000 * 60)).toFixed(1)
  );

  const targetRule = oldest.modality.slaConfigs.find(
    (s) => s.triageLevel === oldest.triageLevel && s.urgencyLevel === oldest.urgencyLevel
  );
  const isBreached = targetRule ? tatMinutes > targetRule.targetTatMinutes : false;

  await prisma.$transaction([
    prisma.radiologyReport.create({
      data: {
        examId: oldest.examId,
        reportStatus: ReportStatusCode.FINALIZED,
        reportSignedAt: now,
        tatExamToSignMinutes: tatMinutes,
        isSlaBreached: isBreached,
      },
    }),
    prisma.examination.update({
      where: { examId: oldest.examId },
      data: { statusCode: ExaminationStatusCode.COMPLETED_SIGNED_OFF },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/simulator");
  revalidatePath("/patient");
  return {
    success: true,
    identifier: oldest.examinationIdentifier,
    tatMinutes,
    isBreached,
  };
}

// ============================================================================
// CONFIGURATIONS & SLA BENCHMARKS SUITE
// ============================================================================

export interface SlaRuleItem {
  slaId: string;
  modalityCode: string;
  triageLevel: string;
  urgencyLevel: string;
  targetTatMinutes: number;
}

export interface ModalityConfigItem {
  modalityCode: string;
  modalityName: string;
  departmentRoom: string | null;
  isActive: boolean;
  totalExams: number;
  slaConfigs: SlaRuleItem[];
}

export interface RadiologistItem {
  radiologistId: string;
  fullName: string;
  subspecialty: string | null;
  licenseNumber: string | null;
  isActive: boolean;
  totalReports: number;
}

export interface ConfigurationsData {
  modalities: ModalityConfigItem[];
  radiologists: RadiologistItem[];
  hospitalGovernance: {
    hospitalName: string;
    department: string;
    phiZeroCompliance: boolean;
    dohAccreditation: string;
    systemVersion: string;
  };
}

// 17. ACTION: Get All Configurations, Modalities, SLAs & Radiologist Roster
export async function getConfigurationsAction(): Promise<ConfigurationsData> {
  // Ensure default radiologists exist if database has none
  const radCount = await prisma.radiologist.count();
  if (radCount === 0) {
    const defaultRads = [
      { fullName: "Dr. Maria Corazon Santos, MD, FPCR", subspecialty: "Neuroradiology & Head CT/MRI", licenseNumber: "PRC-0098412" },
      { fullName: "Dr. Rafael Antonio Cruz, MD, FPCR", subspecialty: "Trauma, MSK & General Radiography", licenseNumber: "PRC-0104781" },
      { fullName: "Dr. Angela Teresa Reyes, MD, DPBR", subspecialty: "Thoracic & Emergency Imaging", licenseNumber: "PRC-0112940" },
      { fullName: "Dr. Jose Gabriel Lim, MD, FPCR", subspecialty: "Abdominal & High-Resolution Ultrasound", licenseNumber: "PRC-0087634" },
      { fullName: "Dr. Christine Joy Bernardo, MD, FPCR", subspecialty: "Breast Imaging & Mammography", licenseNumber: "PRC-0120519" },
    ];
    for (const r of defaultRads) {
      await prisma.radiologist.create({ data: r });
    }
  }

  // Fetch modalities with their SLAs and examination counts
  const modalitiesRaw = await prisma.modality.findMany({
    include: {
      slaConfigs: true,
      _count: { select: { examinations: true } },
    },
    orderBy: { modalityCode: "asc" },
  });

  // Fetch radiologists with report counts
  const radiologistsRaw = await prisma.radiologist.findMany({
    include: {
      _count: { select: { reports: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const modalities: ModalityConfigItem[] = modalitiesRaw.map((m) => ({
    modalityCode: m.modalityCode,
    modalityName: m.modalityName,
    departmentRoom: m.departmentRoom,
    isActive: m.isActive,
    totalExams: m._count.examinations,
    slaConfigs: m.slaConfigs.map((s) => ({
      slaId: s.slaId,
      modalityCode: s.modalityCode,
      triageLevel: s.triageLevel,
      urgencyLevel: s.urgencyLevel,
      targetTatMinutes: s.targetTatMinutes,
    })),
  }));

  const radiologists: RadiologistItem[] = radiologistsRaw.map((r) => ({
    radiologistId: r.radiologistId,
    fullName: r.fullName,
    subspecialty: r.subspecialty,
    licenseNumber: r.licenseNumber,
    isActive: r.isActive,
    totalReports: r._count.reports,
  }));

  return {
    modalities,
    radiologists,
    hospitalGovernance: {
      hospitalName: "Quezon City General Hospital (QCGH)",
      department: "Department of Radiology & Medical Imaging",
      phiZeroCompliance: true,
      dohAccreditation: "Tertiary Level III Hospital Center",
      systemVersion: "RADiTrack v1.4.0 (Build 2026)",
    },
  };
}

// 18. ACTION: Update or Upsert SLA Benchmark
export async function updateSlaTargetAction(formData: FormData) {
  const modalityCode = formData.get("modalityCode") as string;
  const triageLevel = (formData.get("triageLevel") as string) || "OPD";
  const urgencyLevel = (formData.get("urgencyLevel") as string) || "ROUTINE";
  const targetTatMinutes = Number(formData.get("targetTatMinutes"));

  if (!modalityCode || isNaN(targetTatMinutes) || targetTatMinutes <= 0) {
    return { success: false, message: "Invalid modality or target TAT duration." };
  }

  await prisma.slaConfiguration.upsert({
    where: {
      modalityCode_triageLevel_urgencyLevel: {
        modalityCode,
        triageLevel,
        urgencyLevel,
      },
    },
    update: { targetTatMinutes },
    create: {
      modalityCode,
      triageLevel,
      urgencyLevel,
      targetTatMinutes,
    },
  });

  revalidatePath("/");
  revalidatePath("/simulator");
  return {
    success: true,
    modalityCode,
    triageLevel,
    urgencyLevel,
    targetTatMinutes,
  };
}

// 19. ACTION: Reset All SLA Benchmarks to Hospital Standards
export async function resetDefaultSlasAction() {
  const standardSlas = [
    // CT Standards
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 60 },
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 1440 },
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 1440 },
    // XRAY Standards
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 30 },
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 480 },
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 720 },
    // US Standards
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 45 },
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 720 },
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 1440 },
    // MRI Standards
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 120 },
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    // MAMMO Standards
    { modalityCode: ModalityCode.MAMMO, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 1440 },
    { modalityCode: ModalityCode.MAMMO, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 1440 },
  ];

  for (const s of standardSlas) {
    await prisma.slaConfiguration.upsert({
      where: {
        modalityCode_triageLevel_urgencyLevel: {
          modalityCode: s.modalityCode,
          triageLevel: s.triageLevel,
          urgencyLevel: s.urgencyLevel,
        },
      },
      update: { targetTatMinutes: s.targetTatMinutes },
      create: s,
    });
  }

  revalidatePath("/");
  revalidatePath("/simulator");
  return { success: true, count: standardSlas.length };
}

// 20. ACTION: Update Modality Department Room Location & Details
export async function updateModalityDetailsAction(formData: FormData) {
  const modalityCode = formData.get("modalityCode") as string;
  const departmentRoom = (formData.get("departmentRoom") as string) || "";
  const isActive = formData.get("isActive") === "true";

  if (!modalityCode) {
    return { success: false, message: "Missing modality code." };
  }

  await prisma.modality.update({
    where: { modalityCode },
    data: {
      departmentRoom: departmentRoom.trim() || null,
      isActive,
    },
  });

  revalidatePath("/");
  revalidatePath("/simulator");
  return { success: true, modalityCode, departmentRoom, isActive };
}

// 21. ACTION: Fast Toggle Modality Operational Status
export async function toggleModalityStatusAction(modalityCode: string, isActive: boolean) {
  if (!modalityCode) return { success: false };

  await prisma.modality.update({
    where: { modalityCode },
    data: { isActive },
  });

  revalidatePath("/");
  revalidatePath("/simulator");
  return { success: true, modalityCode, isActive };
}

// 22. ACTION: Register New Interpreting Radiologist
export async function createRadiologistAction(formData: FormData) {
  const fullName = (formData.get("fullName") as string)?.trim();
  const subspecialty = (formData.get("subspecialty") as string)?.trim() || null;
  const licenseNumber = (formData.get("licenseNumber") as string)?.trim() || null;

  if (!fullName) {
    return { success: false, message: "Physician name is required." };
  }

  const created = await prisma.radiologist.create({
    data: {
      fullName,
      subspecialty,
      licenseNumber,
      isActive: true,
    },
  });

  revalidatePath("/");
  return { success: true, radiologistId: created.radiologistId };
}

// 23. ACTION: Toggle Radiologist Duty Status
export async function toggleRadiologistStatusAction(radiologistId: string, isActive: boolean) {
  if (!radiologistId) return { success: false };

  await prisma.radiologist.update({
    where: { radiologistId },
    data: { isActive },
  });

  revalidatePath("/");
  return { success: true, radiologistId, isActive };
}

// ============================================================================
// 24. ACTION: Unified Top-Level Temporal Filtering for Executive KPIs
// Computes dynamic Executive KPIs, prior period baselines, and modality stats
// ============================================================================

export type KpiPreset =
  | "ALL"
  | "TODAY"
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
      select: { examId: true, studyDate: true },
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

  const totalVolume = currentExams.length;
  const finalizedExams = currentExams.filter((e) => e.report && e.report.reportSignedAt);
  const finalizedCount = finalizedExams.length;

  const pendingReadingCount = isAllTime
    ? allActivePendingExams.length
    : currentExams.filter((e) => !e.report || !e.report.reportSignedAt).length;

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
  const priorTotalVolume = priorExams.length;
  const priorFinalizedExams = priorExams.filter((e) => e.report && e.report.reportSignedAt);
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
    const calcStats = (exams: typeof m.examinations, isStat: boolean | null): ModalityTatStats => {
      const filtered = exams.filter((e) => {
        if (isStat === true) return e.urgencyLevel === UrgencyLevel.STAT || e.triageLevel === TriageLevel.ER;
        if (isStat === false) return e.urgencyLevel === UrgencyLevel.ROUTINE && e.triageLevel !== TriageLevel.ER;
        return true;
      });

      const tatList = filtered
        .map((e) => e.report?.tatExamToSignMinutes || 0)
        .filter((v) => v > 0);

      const avgTat =
        tatList.length > 0
          ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
          : 0;

      const sla = m.slaConfigs.find((s) => {
        if (isStat === true) return s.urgencyLevel === UrgencyLevel.STAT || s.triageLevel === TriageLevel.ER;
        if (isStat === false) return s.urgencyLevel === UrgencyLevel.ROUTINE;
        return true;
      });

      const defaultTarget =
        m.modalityCode === ModalityCode.CT
          ? (isStat ? 60 : 1440)
          : m.modalityCode === ModalityCode.XRAY
          ? (isStat ? 30 : 480)
          : 120;

      return {
        avgTat,
        target: sla?.targetTatMinutes || defaultTarget,
        volume: filtered.length,
      };
    };

    return {
      modality: m.modalityCode,
      name: m.modalityName,
      all: calcStats(m.examinations, null),
      emergency: calcStats(m.examinations, true),
      routine: calcStats(m.examinations, false),
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
  };
}

