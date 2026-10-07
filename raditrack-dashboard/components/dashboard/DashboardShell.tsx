"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { Sidebar, ActiveTab } from "@/components/navigation/Sidebar";
import { ExaminationsHub } from "@/components/examinations/ExaminationsHub";
import { ConfigurationsHub } from "@/components/config/ConfigurationsHub";
import { TatOverviewChart } from "@/components/charts/TatOverviewChart";
import { SevenDayTatTable } from "@/components/staff/SevenDayTatTable";
import { TwelveMonthTrendChart } from "@/components/staff/TwelveMonthTrendChart";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import {
  fetchFilteredExecutiveKpiAction,
  type KpiPreset,
  type FilteredKpiResult,
  type ModalityTatOverviewItem,
} from "@/app/actions";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface DashboardShellProps {
  data: any;
  sevenDayAnalytics: any;
  twelveMonthTrend: any;
  modalityTatOverview: any;
  prevMonth: any;
  configurationsData: any;
}

export function DashboardShell({
  data,
  sevenDayAnalytics,
  twelveMonthTrend,
  modalityTatOverview,
  prevMonth,
  configurationsData,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Desktop Collapsible Sidebar State with localStorage Persistence (0 lag)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("raditrack_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("raditrack_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Top-Level Unified Temporal Filter State
  const [filterPreset, setFilterPreset] = useState<KpiPreset>("ALL");
  const [isKpiPending, startKpiTransition] = useTransition();

  // Local ISO strings for custom date range picker defaults
  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const defaultStartIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 14);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [customStart, setCustomStart] = useState(defaultStartIso);
  const [customEnd, setCustomEnd] = useState(todayIso);

  // Dynamic KPI & Modality State
  const [kpiData, setKpiData] = useState<FilteredKpiResult | null>(null);
  const [filteredModalityData, setFilteredModalityData] = useState<
    ModalityTatOverviewItem[] | null
  >(null);

  const handlePresetChange = (preset: KpiPreset) => {
    setFilterPreset(preset);
    if (preset === "CUSTOM") {
      startKpiTransition(async () => {
        try {
          const res = await fetchFilteredExecutiveKpiAction({
            preset: "CUSTOM",
            startDate: customStart,
            endDate: customEnd,
          });
          setKpiData(res);
          setFilteredModalityData(res.modalityOverview);
        } catch (err) {
          console.error("Failed to fetch filtered executive KPIs:", err);
        }
      });
      return;
    }

    startKpiTransition(async () => {
      try {
        const res = await fetchFilteredExecutiveKpiAction({ preset });
        setKpiData(res);
        setFilteredModalityData(res.modalityOverview);
      } catch (err) {
        console.error("Failed to fetch filtered executive KPIs:", err);
      }
    });
  };

  const handleCustomRangeApply = (s: string, e: string) => {
    setCustomStart(s);
    setCustomEnd(e);
    setFilterPreset("CUSTOM");
    startKpiTransition(async () => {
      try {
        const res = await fetchFilteredExecutiveKpiAction({
          preset: "CUSTOM",
          startDate: s,
          endDate: e,
        });
        setKpiData(res);
        setFilteredModalityData(res.modalityOverview);
      } catch (err) {
        console.error("Failed to fetch filtered executive KPIs:", err);
      }
    });
  };

  // Telemetry Summary for DateRangeFilter
  const telemetrySummary = kpiData
    ? {
        presetLabel: kpiData.presetLabel,
        dateRangeFormatted: kpiData.dateRangeFormatted,
        totalVolume: kpiData.totalVolume,
        finalizedCount: kpiData.finalizedCount,
        pendingReadingCount: kpiData.pendingReadingCount,
        pctOnTime: kpiData.pctOnTime,
      }
    : {
        presetLabel: "All Time",
        dateRangeFormatted: "All Recorded Scans",
        totalVolume: data.totalVolume,
        finalizedCount: data.finalizedCount,
        pendingReadingCount: data.pendingReadingCount,
        pctOnTime: data.pctOnTime,
      };

  // Resolved Display Metrics
  const displayVolume = kpiData ? kpiData.totalVolume : data.totalVolume;
  const displayAvgMinutes = kpiData ? kpiData.avgTatMinutes : data.avgTatMinutes;
  const displayAvgHours = kpiData
    ? kpiData.avgTatHours
    : Number((data.avgTatMinutes / 60).toFixed(1));
  const displayMedianMinutes = kpiData ? kpiData.medianTatMinutes : data.medianTatMinutes;
  const displayPctOnTime = kpiData ? kpiData.pctOnTime : data.pctOnTime;
  const displayFinalized = kpiData ? kpiData.finalizedCount : data.finalizedCount;
  const displayPending = kpiData
    ? kpiData.pendingReadingCount
    : data.pendingReadingCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={data.pendingReadingQueue.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Viewport Content Area */}
      <div
        className={`flex-1 min-w-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          {/* TAB 1: OVERVIEW & ANALYTICS DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Header Bar */}
              <header className="border-b border-slate-800 pb-5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  RADiTrack Dashboard
                </h1>
              </header>

              {/* UNIFIED TOP-LEVEL DATE FILTER */}
              <DateRangeFilter
                currentPreset={filterPreset}
                startDate={customStart}
                endDate={customEnd}
                onPresetChange={handlePresetChange}
                onCustomRangeApply={handleCustomRangeApply}
                isPending={isKpiPending}
                telemetrySummary={telemetrySummary}
              />

              {/* Executive KPI Summary Cards (5-Card Responsive Suite) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* 1. Total Volume */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Total Volume</span>
                    <Activity className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {displayVolume}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                    {filterPreset === "ALL" ? (
                      <span>All recorded scans</span>
                    ) : kpiData?.volumeDeltaPercent !== null &&
                      kpiData?.volumeDeltaPercent !== undefined ? (
                      <span>
                        <strong
                          className={
                            kpiData.volumeDeltaPercent >= 0
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }
                        >
                          {kpiData.volumeDeltaPercent >= 0 ? "+" : ""}
                          {kpiData.volumeDeltaPercent}%
                        </strong>{" "}
                        vs {kpiData.priorPeriodLabel}
                      </span>
                    ) : (
                      <span>{telemetrySummary.presetLabel} window</span>
                    )}
                  </div>
                </div>

                {/* 2. Average TAT */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Average TAT</span>
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {displayAvgHours >= 1 ? (
                      <>
                        {displayAvgHours}{" "}
                        <span className="text-lg font-normal text-slate-400">hrs</span>
                      </>
                    ) : (
                      <>
                        {displayAvgMinutes}{" "}
                        <span className="text-lg font-normal text-slate-400">mins</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Median:{" "}
                    <strong className="text-slate-200">
                      {displayMedianMinutes} mins
                    </strong>
                  </div>
                </div>

                {/* 3. SLA Compliance */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>SLA Compliance</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-2">
                    {displayPctOnTime}%
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {displayFinalized} reports finalized
                  </div>
                </div>

                {/* 4. Reading Backlog */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Reading Backlog</span>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-amber-400 mt-2">
                    {displayPending}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {filterPreset === "ALL"
                      ? "Pending Radiologist Sign-off"
                      : `From cohort • ${data.pendingReadingCount} active total`}
                  </div>
                </div>

                {/* 5. Comparative Baseline / Prior Period TAT */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>
                      {filterPreset === "ALL"
                        ? "Prev Month TAT"
                        : `${kpiData?.priorPeriodLabel || "Prior Period"} TAT`}
                    </span>
                    <Calendar className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-purple-300 mt-2">
                    {filterPreset === "ALL" ? (
                      prevMonth ? (
                        prevMonth.avgTatHours >= 1 ? (
                          <>
                            {prevMonth.avgTatHours}{" "}
                            <span className="text-lg font-normal text-slate-400">hrs</span>
                          </>
                        ) : (
                          <>
                            {prevMonth.avgTatMinutes}{" "}
                            <span className="text-lg font-normal text-slate-400">mins</span>
                          </>
                        )
                      ) : (
                        <span className="text-lg text-slate-500 font-normal">N/A</span>
                      )
                    ) : kpiData && kpiData.priorAvgTatMinutes > 0 ? (
                      kpiData.priorAvgTatHours >= 1 ? (
                        <>
                          {kpiData.priorAvgTatHours}{" "}
                          <span className="text-lg font-normal text-slate-400">hrs</span>
                        </>
                      ) : (
                        <>
                          {kpiData.priorAvgTatMinutes}{" "}
                          <span className="text-lg font-normal text-slate-400">mins</span>
                        </>
                      )
                    ) : (
                      <span className="text-lg text-slate-500 font-normal">N/A</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                    {filterPreset === "ALL" ? (
                      <span>
                        {prevMonth
                          ? `${prevMonth.fullMonth} • ${prevMonth.totalFinalized} finalized`
                          : "No prior month data"}
                      </span>
                    ) : (
                      <>
                        <span>
                          {kpiData
                            ? `${kpiData.priorFinalizedCount} finalized`
                            : "Baseline"}
                        </span>
                        {kpiData?.tatDeltaPercent !== null &&
                          kpiData?.tatDeltaPercent !== undefined && (
                            <span
                              className={`font-semibold flex items-center gap-0.5 ${
                                kpiData.tatDeltaPercent < 0
                                  ? "text-emerald-400"
                                  : kpiData.tatDeltaPercent > 0
                                  ? "text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {kpiData.tatDeltaPercent < 0
                                ? `⬇️ ${Math.abs(kpiData.tatDeltaPercent)}% faster`
                                : kpiData.tatDeltaPercent > 0
                                ? `⬆️ ${kpiData.tatDeltaPercent}% longer`
                                : "Equal"}
                            </span>
                          )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Proposal 7-Day Performance Table */}
              <SevenDayTatTable analytics={sevenDayAnalytics} />

              {/* Recharts Analytics Suite */}
              <div className="space-y-6">
                <TatOverviewChart
                  key={`tat-${filterPreset}-${customStart}-${customEnd}`}
                  data={filteredModalityData || modalityTatOverview}
                />
                <TwelveMonthTrendChart data={twelveMonthTrend} />
              </div>
            </div>
          )}

          {/* TAB 2: EXAMINATIONS HUB */}
          {activeTab === "examinations" && (
            <ExaminationsHub
              queue={data.pendingReadingQueue}
              finalizedCount={data.finalizedCount}
            />
          )}

          {/* TAB 3: CONFIGURATIONS & SLA */}
          {activeTab === "config" && (
            <ConfigurationsHub initialData={configurationsData} />
          )}
        </main>
      </div>
    </div>
  );
}
