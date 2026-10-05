import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";
import {
  ModalityCode,
  ExaminationStatusCode,
  StageCategory,
  TriageLevel,
  UrgencyLevel,
} from "../lib/enums";

const connectionString = `${process.env.DATABASE_URL || "file:./radiology.db"}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting RADiTrack database seed...");

  // 1. Modalities
  const modalities = [
    {
      modalityCode: ModalityCode.CT,
      modalityName: "Computed Tomography",
      departmentRoom: "CT Suite 1",
    },
    {
      modalityCode: ModalityCode.XRAY,
      modalityName: "General Radiography",
      departmentRoom: "X-Ray Room 1",
    },
    {
      modalityCode: ModalityCode.MRI,
      modalityName: "Magnetic Resonance Imaging",
      departmentRoom: "MRI Basement",
    },
    {
      modalityCode: ModalityCode.US,
      modalityName: "Ultrasound",
      departmentRoom: "US Room 3",
    },
    {
      modalityCode: ModalityCode.MAMMO,
      modalityName: "Mammography",
      departmentRoom: "Breast Imaging Center",
    },
  ];

  for (const m of modalities) {
    await prisma.modality.upsert({
      where: { modalityCode: m.modalityCode },
      update: {},
      create: m,
    });
  }

  // 2. Statuses
  const statuses = [
    {
      statusCode: ExaminationStatusCode.ARRIVED,
      statusName: "Patient Arrived",
      stageCategory: StageCategory.PRE_EXAM,
      sequenceOrder: 1,
    },
    {
      statusCode: ExaminationStatusCode.IN_PROGRESS,
      statusName: "Scanning",
      stageCategory: StageCategory.PRE_EXAM,
      sequenceOrder: 2,
    },
    {
      statusCode: ExaminationStatusCode.EXAM_COMPLETED,
      statusName: "Scan Completed",
      stageCategory: StageCategory.READING_QUEUE,
      sequenceOrder: 3,
    },
    {
      statusCode: ExaminationStatusCode.PENDING_INTERPRETATION,
      statusName: "Awaiting Radiologist",
      stageCategory: StageCategory.READING_QUEUE,
      sequenceOrder: 4,
    },
    {
      statusCode: ExaminationStatusCode.COMPLETED_SIGNED_OFF,
      statusName: "Report Finalized",
      stageCategory: StageCategory.FINALIZED,
      sequenceOrder: 6,
    },
    {
      statusCode: ExaminationStatusCode.CANCELLED,
      statusName: "Cancelled",
      stageCategory: StageCategory.CANCELLED,
      sequenceOrder: 99,
    },
  ];

  for (const s of statuses) {
    await prisma.examinationStatus.upsert({
      where: { statusCode: s.statusCode },
      update: {},
      create: s,
    });
  }

  // 3. SLA Targets
  const slas = [
    {
      modalityCode: ModalityCode.CT,
      triageLevel: TriageLevel.ER,
      urgencyLevel: UrgencyLevel.STAT,
      targetTatMinutes: 60,
    },
    {
      modalityCode: ModalityCode.CT,
      triageLevel: TriageLevel.OPD,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 1440,
    },
    {
      modalityCode: ModalityCode.XRAY,
      triageLevel: TriageLevel.ER,
      urgencyLevel: UrgencyLevel.STAT,
      targetTatMinutes: 30,
    },
    {
      modalityCode: ModalityCode.XRAY,
      triageLevel: TriageLevel.OPD,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 480,
    },
    {
      modalityCode: ModalityCode.MRI,
      triageLevel: TriageLevel.IN,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 2880,
    },
  ];

  for (const sla of slas) {
    await prisma.slaConfiguration.upsert({
      where: {
        modalityCode_triageLevel_urgencyLevel: {
          modalityCode: sla.modalityCode,
          triageLevel: sla.triageLevel,
          urgencyLevel: sla.urgencyLevel,
        },
      },
      update: { targetTatMinutes: sla.targetTatMinutes },
      create: sla,
    });
  }
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
