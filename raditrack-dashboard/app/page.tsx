import {
  getDashboardData,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
  getModalityTatOverview,
  getConfigurationsAction,
  getDatasetStatusAction,
} from "./actions";
import { TestModeBanner } from "@/components/test-data/TestModeBanner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AutoRefresh } from "@/components/common/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    data,
    sevenDayAnalytics,
    twelveMonthTrend,
    modalityTatOverview,
    configurationsData,
    datasetStatus,
  ] = await Promise.all([
    getDashboardData(),
    getSevenDayStaffAnalytics(),
    getTwelveMonthTatTrend(),
    getModalityTatOverview(),
    getConfigurationsAction(),
    getDatasetStatusAction(),
  ]);

  const prevMonth =
    twelveMonthTrend.months.length >= 2
      ? twelveMonthTrend.months[twelveMonthTrend.months.length - 2]
      : null;

  return (
    <>
      <AutoRefresh intervalMs={10000} />
      {datasetStatus.isTestActive && (
        <TestModeBanner backupCount={datasetStatus.backupCount} />
      )}
      <DashboardShell
        data={data}
        sevenDayAnalytics={sevenDayAnalytics}
        twelveMonthTrend={twelveMonthTrend}
        modalityTatOverview={modalityTatOverview}
        prevMonth={prevMonth}
        configurationsData={configurationsData}
      />
    </>
  );
}