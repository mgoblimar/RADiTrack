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
export async function getSevenDayStaffAnalytics() {
  const now = new Date();

  // Build rolling 14 days (7 days current week, 7 days prior week for comparison)
  const currentWeekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    currentWeekDays.push(d);
  }

  const priorWeekStart = new Date(now);
  priorWeekStart.setDate(priorWeekStart.getDate() - 14);
  priorWeekStart.setHours(0, 0, 0, 0);

  // Fetch all exams in the 14-day window with their reports
  const all14DayExams = await prisma.examination.findMany({
    where: {
      studyDate: { gte: priorWeekStart },
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

    const dayRows = currentWeekDays.map((dayDate, index) => {
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

      return {
        dayLabel: index === 0 ? "Today" : index === 1 ? "Yesterday" : `Day -${index}`,
        formattedDate: dayDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          weekday: "short",
        }),
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

    // Compute weekly comparison
    // Current 7-day average TAT
    const current7DayFinalized = filteredExams.filter((e) => {
      const s = new Date(e.studyDate);
      return s >= currentWeekDays[6] && e.report?.tatExamToSignMinutes;
    });
    const currentTatList = current7DayFinalized.map((e) => e.report!.tatExamToSignMinutes!);
    const currentAvgTat =
      currentTatList.length > 0
        ? currentTatList.reduce((a, b) => a + b, 0) / currentTatList.length
        : 0;

    // Prior 7-day average TAT (Days 8 to 14)
    const prior7DayFinalized = filteredExams.filter((e) => {
      const s = new Date(e.studyDate);
      return s < currentWeekDays[6] && e.report?.tatExamToSignMinutes;
    });
    const priorTatList = prior7DayFinalized.map((e) => e.report!.tatExamToSignMinutes!);
    const priorAvgTat =
      priorTatList.length > 0
        ? priorTatList.reduce((a, b) => a + b, 0) / priorTatList.length
        : 0;

    let pctChange = 0;
    if (priorAvgTat > 0) {
      pctChange = Number((((currentAvgTat - priorAvgTat) / priorAvgTat) * 100).toFixed(1));
    }

    return {
      dayRows,
      currentAvgTatMinutes: Number(currentAvgTat.toFixed(1)),
      currentAvgTatHours: Number((currentAvgTat / 60).toFixed(1)),
      priorAvgTatMinutes: Number(priorAvgTat.toFixed(1)),
      pctChange, // positive = longer TAT, negative = faster TAT
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
