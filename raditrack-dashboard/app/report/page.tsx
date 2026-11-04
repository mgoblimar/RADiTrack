import type { Metadata } from "next";
import {
  fetchFilteredExecutiveKpiAction,
  fetchModalityTatDataAction,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
} from "@/app/actions";
import { parseReportParams, resolveReportRange } from "@/lib/report-params";
import { PrintToolbar } from "@/components/report/PrintToolbar";
import { ReportDocument } from "@/components/report/ReportDocument";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RADiTrack Report",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const config = parseReportParams(await searchParams);
  const range = resolveReportRange(config);
  const wants = (id: (typeof config.sections)[number]) => config.sections.includes(id);

  const [kpi, modalityTat, daily, trend] = await Promise.all([
    wants("kpi")
      ? fetchFilteredExecutiveKpiAction({
          preset: config.preset,
          startDate: config.startDate,
          endDate: config.endDate,
          modalityCode: config.modality,
          triageLevel: config.triage,
        })
      : null,
    wants("modality") || wants("sla")
      ? fetchModalityTatDataAction({
          period: "CUSTOM",
          startDate: range.startIso,
          endDate: range.endIso,
        })
      : null,
    wants("daily")
      ? getSevenDayStaffAnalytics({ anchorDate: range.endIso, mode: "rolling" })
      : null,
    wants("trend")
      ? getTwelveMonthTatTrend("rolling", config.triage, range.endIso)
      : null,
  ]);

  return (
    <main className="report-page min-h-screen bg-slate-100 print:bg-white">
      <PrintToolbar />
      <ReportDocument
        config={config}
        rangeLabel={range.isAllTime ? "All recorded scans" : range.dateRangeFormatted}
        generatedAt={new Date()}
        kpi={kpi}
        modalityTat={modalityTat}
        daily={daily}
        trend={trend}
      />
    </main>
  );
}
