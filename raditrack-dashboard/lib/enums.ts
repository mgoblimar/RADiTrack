/**
 * Clinical and Operational Enums for RADiTrack (QCGH Radiology Department)
 * Aligned with QCGH Proposal & RIS Integration Specifications.
 */

// 1. Triage Level (Patient Origin) - Proposal Page 5 & 6
export enum TriageLevel {
  OPD = "OPD", // Outpatient Department
  IN = "IN",   // Inpatient (Admitted Wards / ICU)
  ER = "ER",   // Emergency Room
}

export const TRIAGE_CONFIG: Record<
  TriageLevel,
  { label: string; badgeClass: string; description: string }
> = {
  [TriageLevel.ER]: {
    label: "Emergency (ER)",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-800",
    description: "Emergency room patient requiring urgent triage",
  },
  [TriageLevel.OPD]: {
    label: "Outpatient (OPD)",
    badgeClass: "bg-sky-950/80 text-sky-300 border-sky-800",
    description: "Ambulatory outpatient scan",
  },
  [TriageLevel.IN]: {
    label: "Inpatient (IN)",
    badgeClass: "bg-amber-950/80 text-amber-300 border-amber-800",
    description: "Admitted ward or ICU patient",
  },
};

// 2. Clinical Urgency Level - Proposal Page 6 & SLA matrix
export enum UrgencyLevel {
  ROUTINE = "ROUTINE",
  STAT = "STAT", // Immediate / Emergency Rush
}

export const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; badgeClass: string }
> = {
  [UrgencyLevel.ROUTINE]: {
    label: "Routine",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  },
  [UrgencyLevel.STAT]: {
    label: "STAT (Rush)",
    badgeClass: "bg-red-600 text-white font-bold animate-pulse border-red-500",
  },
};

// 3. Modality Codes - Proposal Page 5 (The 5 Core QCGH Modalities)
export enum ModalityCode {
  XRAY = "XRAY",
  US = "US",
  CT = "CT",
  MRI = "MRI",
  MAMMO = "MAMMO",
}

export const MODALITY_CONFIG: Record<
  ModalityCode,
  { name: string; shortName: string; defaultRoom: string }
> = {
  [ModalityCode.XRAY]: {
    name: "General Radiography (X-ray)",
    shortName: "X-ray",
    defaultRoom: "X-Ray Room 1",
  },
  [ModalityCode.US]: {
    name: "Ultrasound",
    shortName: "Ultrasound",
    defaultRoom: "US Room 3",
  },
  [ModalityCode.CT]: {
    name: "Computed Tomography (CT-Scan)",
    shortName: "CT-Scan",
    defaultRoom: "CT Suite 1",
  },
  [ModalityCode.MRI]: {
    name: "Magnetic Resonance Imaging (MRI)",
    shortName: "MRI",
    defaultRoom: "MRI Basement",
  },
  [ModalityCode.MAMMO]: {
    name: "Mammography",
    shortName: "Mammogram",
    defaultRoom: "Breast Imaging Center",
  },
};

// 4. Stage Categories
export enum StageCategory {
  PRE_EXAM = "PRE_EXAM",
  READING_QUEUE = "READING_QUEUE",
  FINALIZED = "FINALIZED",
  CANCELLED = "CANCELLED",
}

// 5. Examination Workflow Status Codes
export enum ExaminationStatusCode {
  ARRIVED = "ARRIVED",
  IN_PROGRESS = "IN_PROGRESS",
  EXAM_COMPLETED = "EXAM_COMPLETED",
  PENDING_INTERPRETATION = "PENDING_INTERPRETATION",
  COMPLETED_SIGNED_OFF = "COMPLETED_SIGNED_OFF",
  CANCELLED = "CANCELLED",
}

export const STATUS_CONFIG: Record<
  ExaminationStatusCode,
  { label: string; stageCategory: StageCategory }
> = {
  [ExaminationStatusCode.ARRIVED]: {
    label: "Patient Arrived",
    stageCategory: StageCategory.PRE_EXAM,
  },
  [ExaminationStatusCode.IN_PROGRESS]: {
    label: "Scan In Progress",
    stageCategory: StageCategory.PRE_EXAM,
  },
  [ExaminationStatusCode.EXAM_COMPLETED]: {
    label: "Exam Completed (T1)",
    stageCategory: StageCategory.READING_QUEUE,
  },
  [ExaminationStatusCode.PENDING_INTERPRETATION]: {
    label: "Awaiting Radiologist",
    stageCategory: StageCategory.READING_QUEUE,
  },
  [ExaminationStatusCode.COMPLETED_SIGNED_OFF]: {
    label: "Report Finalized (T2)",
    stageCategory: StageCategory.FINALIZED,
  },
  [ExaminationStatusCode.CANCELLED]: {
    label: "Cancelled / Void",
    stageCategory: StageCategory.CANCELLED,
  },
};

// 6. Radiology Report Status
export enum ReportStatusCode {
  DRAFT = "DRAFT",
  PRELIMINARY = "PRELIMINARY",
  FINALIZED = "FINALIZED",
  CORRECTED = "CORRECTED",
}
