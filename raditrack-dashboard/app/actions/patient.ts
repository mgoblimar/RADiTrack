"use server";

import prisma from "@/lib/prisma";
import { TriageLevel, ModalityCode } from "@/lib/enums";

// ============================================================================
// QUERY: Public Patient Activity Display Data (/patient)
// Aligned with Proposal Page 5: Today vs Yesterday volume by Modality and Triage
// ============================================================================
type ModalityConfigSelect = {
  modalityCode: string;
  departmentRoom?: string | null;
  isActive?: boolean | null;
};

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

  // 1. Fetch room configurations directly from the Modality model
  const rawConfigs = await prisma.modality.findMany({
    select: {
      modalityCode: true,
      departmentRoom: true,
      isActive: true,
    },
  });

  const configMap = new Map<string, ModalityConfigSelect>(
    (rawConfigs as unknown as ModalityConfigSelect[]).map((c) => [
      c.modalityCode,
      c,
    ])
  );

  // 2. Fetch recent exams (only selects valid Examination columns)
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
    const examsForMod = recentExams.filter((e) => e.modalityCode === m.code);

    const todayExams = examsForMod.filter(
      (e) => new Date(e.studyDate) >= todayStart
    );
    const yesterdayExams = examsForMod.filter(
      (e) =>
        new Date(e.studyDate) >= yesterdayStart &&
        new Date(e.studyDate) <= yesterdayEnd
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

    // Look up live configuration from Modality model configMap
    const roomConfig = configMap.get(m.code);

    return {
      modalityCode: m.code,
      modalityName: m.name,
      departmentRoom: roomConfig?.departmentRoom || `${m.code} Suite`,
      isActive: roomConfig?.isActive ?? true,
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
