import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";
import {
  ModalityCode,
  ExaminationStatusCode,
  StageCategory,
  TriageLevel,
  UrgencyLevel,
  ReportStatusCode,
} from "../lib/enums";

const connectionString = `${process.env.DATABASE_URL || "file:./radiology.db"}`;
const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting Comprehensive RADiTrack Realistic Seeding...");

  // ==========================================================================
  // 1. MASTER MODALITIES
  // ==========================================================================
  const modalities = [
    {
      modalityCode: ModalityCode.XRAY,
      modalityName: "General Radiography (X-ray)",
      departmentRoom: "X-Ray Room 1",
    },
    {
      modalityCode: ModalityCode.US,
      modalityName: "Ultrasound",
      departmentRoom: "US Room 3",
    },
    {
      modalityCode: ModalityCode.CT,
      modalityName: "Computed Tomography (CT-Scan)",
      departmentRoom: "CT Suite 1",
    },
    {
      modalityCode: ModalityCode.MRI,
      modalityName: "Magnetic Resonance Imaging (MRI)",
      departmentRoom: "MRI Basement",
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

  // ==========================================================================
  // 2. MASTER STATUSES
  // ==========================================================================
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

  // ==========================================================================
  // 3. MASTER SLA CONFIGURATIONS
  // ==========================================================================
  const slas = [
    {
      modalityCode: ModalityCode.CT,
      triageLevel: TriageLevel.ER,
      urgencyLevel: UrgencyLevel.STAT,
      targetTatMinutes: 60, // 1 hour
    },
    {
      modalityCode: ModalityCode.CT,
      triageLevel: TriageLevel.OPD,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 1440, // 24 hours
    },
    {
      modalityCode: ModalityCode.XRAY,
      triageLevel: TriageLevel.ER,
      urgencyLevel: UrgencyLevel.STAT,
      targetTatMinutes: 30, // 30 mins
    },
    {
      modalityCode: ModalityCode.XRAY,
      triageLevel: TriageLevel.OPD,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 480, // 8 hours
    },
    {
      modalityCode: ModalityCode.MRI,
      triageLevel: TriageLevel.IN,
      urgencyLevel: UrgencyLevel.ROUTINE,
      targetTatMinutes: 2880, // 48 hours (2 days)
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

  console.log("✅ Master reference data initialized.");

  // ==========================================================================
  // 4. GENERATING 250+ REALISTIC HISTORICAL EXAMINATIONS & REPORTS
  // ==========================================================================
  console.log("⏳ Seeding 250+ clinical examinations spanning 14 months to present...");

  const now = new Date();

  // Weighted modality pool to mirror real hospital distribution
  const modalityPool: ModalityCode[] = [
    ModalityCode.XRAY, ModalityCode.XRAY, ModalityCode.XRAY, ModalityCode.XRAY, ModalityCode.XRAY, // 45%
    ModalityCode.US, ModalityCode.US, ModalityCode.US,                                              // 27%
    ModalityCode.CT, ModalityCode.CT,                                                               // 18%
    ModalityCode.MRI,                                                                               // 9%
    ModalityCode.MAMMO,                                                                            // ~5%
  ];

  const triagePool: TriageLevel[] = [
    TriageLevel.OPD, TriageLevel.OPD, TriageLevel.OPD, // ~50%
    TriageLevel.IN, TriageLevel.IN,                   // ~33%
    TriageLevel.ER,                                    // ~17%
  ];

  let examCounter = 1000;

  // Generate 240 historical finalized examinations across past 365 days
  for (let i = 0; i < 240; i++) {
    examCounter++;
    const identifier = `ACC-QCGH-${examCounter}`;

    // Distribute evenly across past 380 days (with denser distribution in recent months)
    const daysAgo = Math.floor(Math.pow(Math.random(), 0.7) * 380);
    const studyDate = new Date(now);
    studyDate.setDate(studyDate.getDate() - daysAgo);
    studyDate.setHours(8 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60), 0, 0);

    const modality = modalityPool[Math.floor(Math.random() * modalityPool.length)];
    const triage = triagePool[Math.floor(Math.random() * triagePool.length)];
    const isStat = triage === TriageLevel.ER || Math.random() < 0.15;
    const urgency = isStat ? UrgencyLevel.STAT : UrgencyLevel.ROUTINE;

    // Realistic Turnaround Time (TAT) Calculation:
    let tatMinutes: number;

    if (isStat) {
      // STAT emergency cases: 25 to 80 minutes (occasionally breaching 60m SLA)
      tatMinutes = Number((25 + Math.random() * 55).toFixed(1));
    } else if (modality === ModalityCode.MRI || (modality === ModalityCode.CT && triage === TriageLevel.IN)) {
      // Inpatient complex MRI / CT scans: interpreted and signed off after 1 to 2 days (24 to 48 hrs)
      // Some take 28 hrs, 36 hrs, or up to 46 hrs!
      const hoursDelay = 20 + Math.random() * 28; // between 20 to 48 hours
      tatMinutes = Number((hoursDelay * 60 + Math.random() * 30).toFixed(1));
    } else if (triage === TriageLevel.IN) {
      // General Inpatient scans: 14 to 28 hours (1 to 1.2 days)
      const hoursDelay = 14 + Math.random() * 14;
      tatMinutes = Number((hoursDelay * 60 + Math.random() * 20).toFixed(1));
    } else {
      // Routine Outpatient (OPD): 4 to 18 hours
      const hoursDelay = 4 + Math.random() * 14;
      tatMinutes = Number((hoursDelay * 60 + Math.random() * 20).toFixed(1));
    }

    const reportSignedAt = new Date(studyDate.getTime() + tatMinutes * 60000);

    // Evaluate SLA target breach
    let targetMinutes = 1440;
    if (modality === ModalityCode.XRAY) targetMinutes = isStat ? 30 : 480;
    else if (modality === ModalityCode.CT) targetMinutes = isStat ? 60 : 1440;
    else if (modality === ModalityCode.MRI) targetMinutes = 2880; // 48 hours
    else if (modality === ModalityCode.US) targetMinutes = isStat ? 45 : 720;
    else if (modality === ModalityCode.MAMMO) targetMinutes = 1440;

    const isSlaBreached = tatMinutes > targetMinutes;

    const exam = await prisma.examination.upsert({
      where: { examinationIdentifier: identifier },
      update: {},
      create: {
        examinationIdentifier: identifier,
        modalityCode: modality,
        triageLevel: triage,
        urgencyLevel: urgency,
        statusCode: ExaminationStatusCode.COMPLETED_SIGNED_OFF,
        studyDate,
        examCompletedAt: studyDate,
      },
    });

    await prisma.radiologyReport.upsert({
      where: { examId: exam.examId },
      update: {},
      create: {
        examId: exam.examId,
        reportSignedAt,
        tatExamToSignMinutes: tatMinutes,
        isSlaBreached,
        reportStatus: ReportStatusCode.FINALIZED,
      },
    });
  }

  // ==========================================================================
  // 5. GENERATING ACTIVE READING QUEUE & RECENT UNFINALIZED EXAMS (Today & Yesterday)
  // ==========================================================================
  console.log("⏳ Seeding active backlog reading queue for Today & Yesterday...");

  const recentPendingScans = [
    { mod: ModalityCode.CT, triage: TriageLevel.ER, urgency: UrgencyLevel.STAT, hoursAgo: 1.2 },
    { mod: ModalityCode.XRAY, triage: TriageLevel.ER, urgency: UrgencyLevel.STAT, hoursAgo: 0.6 },
    { mod: ModalityCode.US, triage: TriageLevel.OPD, urgency: UrgencyLevel.ROUTINE, hoursAgo: 2.5 },
    { mod: ModalityCode.MRI, triage: TriageLevel.IN, urgency: UrgencyLevel.ROUTINE, hoursAgo: 18.0 },
    { mod: ModalityCode.CT, triage: TriageLevel.IN, urgency: UrgencyLevel.ROUTINE, hoursAgo: 26.0 }, // Carry-Over
    { mod: ModalityCode.XRAY, triage: TriageLevel.OPD, urgency: UrgencyLevel.ROUTINE, hoursAgo: 3.1 },
    { mod: ModalityCode.MAMMO, triage: TriageLevel.OPD, urgency: UrgencyLevel.ROUTINE, hoursAgo: 4.0 },
    { mod: ModalityCode.XRAY, triage: TriageLevel.ER, urgency: UrgencyLevel.STAT, hoursAgo: 0.4 },
    { mod: ModalityCode.US, triage: TriageLevel.IN, urgency: UrgencyLevel.ROUTINE, hoursAgo: 5.5 },
    { mod: ModalityCode.CT, triage: TriageLevel.ER, urgency: UrgencyLevel.STAT, hoursAgo: 1.8 }, // Breaching STAT SLA
    { mod: ModalityCode.MRI, triage: TriageLevel.IN, urgency: UrgencyLevel.ROUTINE, hoursAgo: 30.0 }, // Carry-Over
  ];

  for (const scan of recentPendingScans) {
    examCounter++;
    const identifier = `ACC-QCGH-${examCounter}`;
    const studyDate = new Date(now.getTime() - scan.hoursAgo * 3600000);

    await prisma.examination.upsert({
      where: { examinationIdentifier: identifier },
      update: {},
      create: {
        examinationIdentifier: identifier,
        modalityCode: scan.mod,
        triageLevel: scan.triage,
        urgencyLevel: scan.urgency,
        statusCode: ExaminationStatusCode.EXAM_COMPLETED,
        studyDate,
        examCompletedAt: studyDate,
      },
    });
  }

  console.log(`🎉 Successfully seeded ${examCounter - 1000} examinations and reports!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });