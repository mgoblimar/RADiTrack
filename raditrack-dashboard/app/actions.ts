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
