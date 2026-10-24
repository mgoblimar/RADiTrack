/**
 * RADiTrack Server Actions Suite (Unified Aggregator)
 *
 * Decomposed into modular domain action modules for clarity and maintainability:
 * - ./actions/utils: Math, TAT & statistical helpers
 * - ./actions/examinations: Ingestion, sign-off, lifecycle & filtering
 * - ./actions/dashboard: Core dashboard metrics & executive KPI temporal filtering
 * - ./actions/patient: Public activity display metrics (/patient)
 * - ./actions/analytics: 7-day staff table, 12-month annual review, modality benchmarks
 * - ./actions/configurations: SLA thresholds, modality rooms, radiologist rosters
 * - ./actions/simulator: RIS workflow simulator actions (/simulator)
 *
 * All exports are re-exported here to ensure 100% backwards compatibility
 * across all existing imports throughout the entire codebase.
 */

// 1. Utilities
export {
  calculatedMedian,
} from "./actions/utils";

// 2. Examinations & Ingestion
export {
  createExaminationAction,
  signOffReportAction,
  exportExaminationsCSVAction,
  updateExaminationAction,
  cancelExaminationAction,
  deleteExaminationAction,
  fetchFilteredExaminationsAction,
  type ExaminationFilterOptions,
  type FilteredExaminationItem,
  type FilteredExaminationsResult,
} from "./actions/examinations";

// 3. Executive Dashboard & KPIs
export {
  getDashboardData,
  fetchFilteredExecutiveKpiAction,
  type KpiPreset,
  type FilteredKpiOptions,
  type FilteredKpiResult,
} from "./actions/dashboard";

// 4. Public Patient Activity
export {
  getPublicActivityData,
} from "./actions/patient";

// 5. Staff & Modality Analytics
export {
  getSevenDayStaffAnalytics,
  fetchSevenDayAnalyticsAction,
  getTwelveMonthTatTrend,
  fetchYearlyTrendAction,
  getModalityTatOverview,
  fetchModalityTatDataAction,
  fetchModalityTatCustomRangeAction,
  type SevenDayAnalyticsOptions,
  type MonthModalityTrend,
  type MonthTrendData,
  type ModalityAnnualSummary,
  type TwelveMonthTrendResult,
  type ModalityTatStats,
  type ModalityTemporalPeriod,
  type ModalityTatOverviewItem,
  type MultiPeriodModalityTatOverview,
} from "./actions/analytics";

// 6. Configurations & Hospital Administration
export {
  getConfigurationsAction,
  updateSlaTargetAction,
  resetDefaultSlasAction,
  updateModalityDetailsAction,
  toggleModalityStatusAction,
  createRadiologistAction,
  toggleRadiologistStatusAction,
  type SlaRuleItem,
  type ModalityConfigItem,
  type RadiologistItem,
  type ConfigurationsData,
} from "./actions/configurations";

// 7. Workflow Simulator
export {
  simulateScenarioAction,
  autoSignOldestBacklogAction,
} from "./actions/simulator";
