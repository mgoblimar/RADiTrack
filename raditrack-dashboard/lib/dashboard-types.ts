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
