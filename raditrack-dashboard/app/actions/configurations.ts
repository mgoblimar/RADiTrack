"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  TriageLevel,
  UrgencyLevel,
  ModalityCode,
} from "@/lib/enums";

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

  if (targetTatMinutes > 10080) {
    return { success: false, message: "SLA target benchmark cannot exceed 7 days (10,080 minutes)." };
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
    // CT Standards (IN/ER: 2 days, OPD: 3 days)
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 4320 },
    { modalityCode: ModalityCode.CT, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    // XRAY Standards (IN/ER: 2 days, OPD: 3 days)
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 4320 },
    { modalityCode: ModalityCode.XRAY, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    // US Standards (IN/ER: 2 days, OPD: 3 days)
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 4320 },
    { modalityCode: ModalityCode.US, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    // MRI Standards (IN/ER: 2 days, OPD: 3 days)
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 4320 },
    { modalityCode: ModalityCode.MRI, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
    // MAMMO Standards (IN/ER: 2 days, OPD: 3 days)
    { modalityCode: ModalityCode.MAMMO, triageLevel: TriageLevel.ER, urgencyLevel: UrgencyLevel.STAT, targetTatMinutes: 2880 },
    { modalityCode: ModalityCode.MAMMO, triageLevel: TriageLevel.OPD, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 4320 },
    { modalityCode: ModalityCode.MAMMO, triageLevel: TriageLevel.IN, urgencyLevel: UrgencyLevel.ROUTINE, targetTatMinutes: 2880 },
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
