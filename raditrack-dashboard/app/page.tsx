import {
  getDashboardData,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
  getModalityTatOverview,
} from "./actions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, sevenDayAnalytics, twelveMonthTrend, modalityTatOverview] =
    await Promise.all([
      getDashboardData(),
      getSevenDayStaffAnalytics(),
      getTwelveMonthTatTrend(),
      getModalityTatOverview(),
    ]);

  const prevMonth =
    twelveMonthTrend.length >= 2
      ? twelveMonthTrend[twelveMonthTrend.length - 2]
      : null;

  return (
    <DashboardShell
      data={data}
      sevenDayAnalytics={sevenDayAnalytics}
      twelveMonthTrend={twelveMonthTrend}
      modalityTatOverview={modalityTatOverview}
      prevMonth={prevMonth}
    />
  );
}