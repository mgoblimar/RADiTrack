import type {
  ModalityTatOverviewItem,
  MultiPeriodModalityTatOverview,
  ModalityTemporalPeriod,
} from "@/app/actions";

export interface TatOverviewChartProps {
  data?:
    | ModalityTatOverviewItem[]
    | MultiPeriodModalityTatOverview;
}

export type ExtendedTemporalPeriod =
  | ModalityTemporalPeriod
  | "CUSTOM";

export type PatientCategoryFilter =
  | "ALL"
  | "OPD"
  | "ER"
  | "IN";

export interface ModalityTatDisplayItem {
  modality: string;
  name?: string;
  avgTatMinutes: number;
  avgTat: number;
  targetMinutes: number | null;
  target: number | null;
  volume: number;
}

/* =========================================================
   RADiTrack palette
========================================================= */
export const QC_NAVY = "#050E40";
export const QC_BLUE = "#18298C";
export const QC_YELLOW = "#F2CB49";
export const QC_RED = "#A60808";
export const QC_MUTED = "#94A3B8";
export const QC_GRID = "#E2E8F0";
export const QC_EMPTY = "#CBD5E1";

export const TEMPORAL_LABELS: Record<ExtendedTemporalPeriod, string> = {
  ALL: "All time",
  ROLLING_7D: "Rolling 7 days",
  "7D": "Past 7 days",
  WEEK: "This week",
  PAST_WEEK: "Past week",
  LAST_WEEK: "Past week",
  MONTH: "This month",
  YEAR: "This year",
  CUSTOM: "Custom range",
};
