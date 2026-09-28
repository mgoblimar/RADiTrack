import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL || "file:./radiology.db"}`;

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting RADiTrack database seed...");

  // 1. Modalities
  const modalities = [
    {
      modalityCode: "CT",
      modalityName: "Computed Tomography",
      departmentRoom: "CT Suite 1",
    },
    {
      modalityCode: "XRAY",
      modalityName: "General Radiography",
      departmentRoom: "X-Ray Room 1",
    },
    {
      modalityCode: "MRI",
      modalityName: "Magnetic Resonance Imaging",
      departmentRoom: "MRI Basement",
    },
    {
      modalityCode: "US",
      modalityName: "Ultrasound",
      departmentRoom: "US Room 3",
    },
    {
      modalityCode: "MAMMO",
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
      statusCode: "ARRIVED",
      statusName: "Patient Arrived",
      stageCategory: "PRE_EXAM",
      sequenceOrder: 1,
    },
    {
      statusCode: "IN_PROGRESS",
      statusName: "Scanning",
      stageCategory: "PRE_EXAM",
      sequenceOrder: 2,
    },
    {
      statusCode: "EXAM_COMPLETED",
      statusName: "Scan Completed",
      stageCategory: "READING_QUEUE",
      sequenceOrder: 3,
    },
    {
      statusCode: "PENDING_INTERPRETATION",
      statusName: "Awaiting Radiologist",
      stageCategory: "READING_QUEUE",
      sequenceOrder: 4,
    },
    {
      statusCode: "COMPLETED_SIGNED_OFF",
      statusName: "Report Finalized",
      stageCategory: "FINALIZED",
      sequenceOrder: 6,
    },
    {
      statusCode: "CANCELLED",
      statusName: "Cancelled",
      stageCategory: "CANCELLED",
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
      modalityCode: "CT",
      triageLevel: "ER",
      urgencyLevel: "STAT",
      targetTatMinutes: 60,
    },
    {
      modalityCode: "CT",
      triageLevel: "OPD",
      urgencyLevel: "ROUTINE",
      targetTatMinutes: 1440,
    },
    {
      modalityCode: "XRAY",
      triageLevel: "ER",
      urgencyLevel: "STAT",
      targetTatMinutes: 30,
    },
    {
      modalityCode: "XRAY",
      triageLevel: "OPD",
      urgencyLevel: "ROUTINE",
      targetTatMinutes: 480,
    },
    {
      modalityCode: "MRI",
      triageLevel: "IN",
      urgencyLevel: "ROUTINE",
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
