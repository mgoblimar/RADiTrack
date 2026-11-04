import type { ModalityCode, TriageLevel } from "@/lib/enums";
import type { KpiPreset } from "@/lib/kpi-range";
import type {
  getDashboardData,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
  getModalityTatOverview,
  getConfigurationsAction,
} from "@/app/actions";

// Shapes returned by the dashboard server actions, shared by client components.
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type SevenDayAnalyticsData = Awaited<ReturnType<typeof getSevenDayStaffAnalytics>>;
export type TwelveMonthTrendData = Awaited<ReturnType<typeof getTwelveMonthTatTrend>>;
export type ModalityTatOverviewData = Awaited<ReturnType<typeof getModalityTatOverview>>;
export type ConfigurationsData = Awaited<ReturnType<typeof getConfigurationsAction>>;
export type PendingReadingQueueItem = DashboardData["pendingReadingQueue"][number];

/**
 * The staff dashboard's single filter bar, passed down to every section.
 * Dates are local "YYYY-MM-DD" strings for the selected window.
 */
export interface DashboardFilters {
  preset: KpiPreset;
  rangeStart: string;
  rangeEnd: string;
  isAllTime: boolean;
  modality: "ALL" | ModalityCode;
  triage: "ALL" | TriageLevel;
}
