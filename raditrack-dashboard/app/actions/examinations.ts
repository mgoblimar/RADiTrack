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

// ============================================================================
// 1. ACTION: Log New Examination (Manual Ingestion)
// ============================================================================
export async function createExaminationAction(formData: FormData) {
  const examinationIdentifier = formData.get("examinationIdentifier") as string;
  const modalityCode = (formData.get("modalityCode") as string) || ModalityCode.CT;
  const triageLevel = (formData.get("triageLevel") as string) || TriageLevel.OPD;
  const statusCode =
    (formData.get("statusCode") as string) || ExaminationStatusCode.EXAM_COMPLETED;

  const now = new Date();

  await prisma.examination.create({
    data: {
      examinationIdentifier,
      modalityCode,
      statusCode,
      triageLevel,
      studyDate: now,
      examCompletedAt: now,
    },
  });

  revalidatePath("/");
}

// ============================================================================
// 2. ACTION: Sign Off Report (TAT & SLA Engine)
// ============================================================================
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
    (s) => s.triageLevel === exam.triageLevel,
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
      (s) => s.triageLevel === e.triageLevel
    );
    const tatMinutes = e.report?.tatExamToSignMinutes ?? "";
    const tatHours = tatMinutes !== "" ? (Number(tatMinutes) / 60).toFixed(2) : "";
    const isBreached = e.report ? (e.report.isSlaBreached ? "BREACHED" : "MET_SLA") : "PENDING";
    return [
      e.examinationIdentifier,
      e.modalityCode,
      e.triageLevel,
      e.triageLevel === "ER" ? "STAT" : "ROUTINE",
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
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!examId || !examinationIdentifier || !modalityCode || !triageLevel) {
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
  modalityCodes?: string[];
  triageLevel?: string;
  triageLevels?: string[];
  patientCategories?: string[];
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
  dwellHours: number | null;
  tatMinutes: number | null;
  tatHours: number | null;
  targetTatMinutes: number | null;
  targetTatHours: number | null;
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

  // Modality filter: supports multiple codes or "ALL"
  if (options.modalityCodes !== undefined) {
    if (options.modalityCodes.includes("ALL")) {
      // All modalities selected -> no filter restriction
    } else if (options.modalityCodes.length === 0) {
      whereClause.modalityCode = { in: [] };
    } else {
      const expandedCodes = [...options.modalityCodes];
      if (expandedCodes.includes("XRAY") && !expandedCodes.includes("XR")) {
        expandedCodes.push("XR");
      }
      whereClause.modalityCode = { in: expandedCodes };
    }
  } else if (options.modalityCode && options.modalityCode !== "ALL") {
    if (options.modalityCode === "XRAY") {
      whereClause.modalityCode = { in: ["XRAY", "XR"] };
    } else {
      whereClause.modalityCode = options.modalityCode;
    }
  }

  // Patient Category / Triage Level filter (OPD, ER, IN): supports multiple or "ALL"
  const catList = options.triageLevels ?? options.patientCategories;
  if (catList !== undefined) {
    if (catList.includes("ALL")) {
      // All patient categories selected -> no filter restriction
    } else if (catList.length === 0) {
      whereClause.triageLevel = { in: [] };
    } else {
      whereClause.triageLevel = { in: catList };
    }
  } else if (options.triageLevel && options.triageLevel !== "ALL") {
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
      (s) => s.triageLevel === e.triageLevel
    );
    const targetTat = targetRule?.targetTatMinutes ?? null;

    const targetTatHours = targetTat !== null 
      ? Number((targetTat / 60).toFixed(2)) 
      : null;

    let dwellMinutes: number | null = null;
    let dwellHours: number | null = null;
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
        dwellHours = Number((dwellMinutes / 60).toFixed(1));
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
      urgencyLevel: e.triageLevel === "ER" ? "STAT" : "ROUTINE",
      studyDateFormatted: new Date(e.studyDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      isoDate: new Date(e.studyDate).toISOString().split("T")[0],
      examCompletedAtFormatted: e.examCompletedAt
        ? new Date(e.examCompletedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      reportSignedAtFormatted: e.report?.reportSignedAt
        ? new Date(e.report.reportSignedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      dwellMinutes,
      dwellHours,
      tatMinutes,
      tatHours,
      targetTatMinutes: targetTat,
      targetTatHours,
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
