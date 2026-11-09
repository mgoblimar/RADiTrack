import type {
  ModalityTatOverviewItem,
  MultiPeriodModalityTatOverview,
  ModalityTemporalPeriod,
} from "@/app/actions";
import type { DashboardFilters } from "@/lib/dashboard-types";

export interface TatOverviewChartProps {
  data?:
    | ModalityTatOverviewItem[]
    | MultiPeriodModalityTatOverview;
  /** Date window, patient category and modality from the dashboard filter bar. */
  filters: DashboardFilters;
  /** Human-readable scope shown in the header, e.g. "Oct 29 – Nov 4 · ER". */
  scopeLabel: string;
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
   RADiTrack OFFICIAL BRAND PALETTE

   Blue:   #00357a
   Red:    #7a0000
   Yellow: #ffd230

   QC_NAVY is retained as a compatibility alias for
   existing chart components that import the old constant.
========================================================= */

export const QC_NAVY = "#00357a";
export const QC_BLUE = "#00357a";
export const QC_YELLOW = "#ffd230";
export const QC_RED = "#7a0000";

// Neutral chart colors
export const QC_MUTED = "#94A3B8";
export const QC_GRID = "#E2E8F0";
export const QC_EMPTY = "#CBD5E1";

/* =========================================================
   TEMPORAL LABELS
========================================================= */

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