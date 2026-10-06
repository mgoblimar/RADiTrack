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
// 7. QUERY: Client Request - 12-Month Historical TAT Trend (Annual Review)
// Aggregates monthly averages across past 12 months for departmental meetings
// ============================================================================
export async function getTwelveMonthTatTrend() {
  const now = new Date();
  const monthsData = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthReports = await prisma.radiologyReport.findMany({
      where: {
        reportSignedAt: { not: null },
        examination: {
          studyDate: { gte: start, lte: end },
          statusCode: { not: "CANCELLED" },
        },
      },
      select: { tatExamToSignMinutes: true },
    });
    const tatList = monthReports.map((r) => r.tatExamToSignMinutes || 0).filter((v) => v > 0);
    const avgMinutes =
      tatList.length > 0
        ? Number((tatList.reduce((a, b) => a + b, 0) / tatList.length).toFixed(1))
        : 0;
    const avgHours = Number((avgMinutes / 60).toFixed(1));
    monthsData.push({
      monthLabel: start.toLocaleDateString("en-US", { month: "short" }),
      fullMonth: start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      totalFinalized: monthReports.length,
      avgTatHours: avgHours,
      avgTatMinutes: avgMinutes,
    });
  }
  return monthsData;
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

export interface ModalityTatOverviewItem {
  modality: string;
  name: string;
  all: ModalityTatStats;
  emergency: ModalityTatStats;
  routine: ModalityTatStats;
}

export async function getModalityTatOverview(): Promise<ModalityTatOverviewItem[]> {
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
      all: calcStats(m.examinations, null),
      emergency: calcStats(m.examinations, true),
      routine: calcStats(m.examinations, false),
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

