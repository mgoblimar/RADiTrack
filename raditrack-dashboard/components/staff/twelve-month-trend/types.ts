import { ModalityCode, TriageLevel } from "@/lib/enums";
import type { TwelveMonthTrendResult } from "@/app/actions";

export interface TwelveMonthTrendChartProps {
  data: TwelveMonthTrendResult;
}

export const QC_NAVY = "#050E40";
export const QC_BLUE = "#18298C";
export const QC_PURPLE = "#7652B8";
export const QC_MUTED = "#64748B";
export const QC_GRID = "#E2E8F0";
export const QC_RED = "#A60808";

export interface ModalityConfig {
  code: ModalityCode;
  label: string;
  color: string;
  lightColor: string;
  dotClass: string;
}

export const MODALITIES: ModalityConfig[] = [
  { code: ModalityCode.XRAY, label: "X-ray", color: "#2563EB", lightColor: "#93C5FD", dotClass: "bg-blue-500" },
  { code: ModalityCode.US, label: "Ultrasound", color: "#059669", lightColor: "#6EE7B7", dotClass: "bg-emerald-500" },
  { code: ModalityCode.CT, label: "CT-Scan", color: "#D97706", lightColor: "#FCD34D", dotClass: "bg-amber-500" },
  { code: ModalityCode.MRI, label: "MRI", color: "#7C3AED", lightColor: "#C4B5FD", dotClass: "bg-purple-500" },
  { code: ModalityCode.MAMMO, label: "Mammogram", color: "#DB2777", lightColor: "#F9A8D4", dotClass: "bg-pink-500" },
];

export const TRIAGE_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  { value: TriageLevel.OPD, label: "Outpatient (OPD)" },
  { value: TriageLevel.IN, label: "Inpatient (IN)" },
  { value: TriageLevel.ER, label: "Emergency (ER)" },
];
