import {
  getDashboardData,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
  getModalityTatOverview,
  getConfigurationsAction,
} from "./actions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    data,
    sevenDayAnalytics,
    twelveMonthTrend,
    modalityTatOverview,
    configurationsData,
  ] = await Promise.all([
    getDashboardData(),
    getSevenDayStaffAnalytics(),
    getTwelveMonthTatTrend(),
    getModalityTatOverview(),
    getConfigurationsAction(),
  ]);

  const prevMonth =
    twelveMonthTrend.months.length >= 2
      ? twelveMonthTrend.months[twelveMonthTrend.months.length - 2]
      : null;

  return (
    <DashboardShell
      data={data}
      sevenDayAnalytics={sevenDayAnalytics}
      twelveMonthTrend={twelveMonthTrend}
      modalityTatOverview={modalityTatOverview}
      prevMonth={prevMonth}
      configurationsData={configurationsData}
    />
  );
}