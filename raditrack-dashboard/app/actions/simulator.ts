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
// ACTION: RIS Workflow Simulator Scenarios & Instant Actions
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
