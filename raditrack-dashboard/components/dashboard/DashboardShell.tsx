"use client";

import {
  useState,
  useEffect,
  useTransition,
  useMemo,
} from "react";

import { Sidebar, ActiveTab } from "@/components/navigation/Sidebar";
import { ExaminationsHub } from "@/components/examinations/ExaminationsHub";
import { ConfigurationsHub } from "@/components/config/ConfigurationsHub";
import { TatOverviewChart } from "@/components/charts/TatOverviewChart";
import { SevenDayTatTable } from "@/components/staff/SevenDayTatTable";
import { TwelveMonthTrendChart } from "@/components/staff/TwelveMonthTrendChart";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { QuickIngestionModal } from "@/components/dashboard/QuickIngestionModal";

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
  TrendingDown,
  TrendingUp,
  ClipboardList,
  BarChart3,
  ArrowRight,
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
  const [activeTab, setActiveTab] =
    useState<ActiveTab>("overview");

  // =========================================================
  // Sidebar
  // =========================================================

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "raditrack_sidebar_collapsed",
      );

      if (saved !== null) {
        setIsSidebarCollapsed(
          saved === "true",
        );
      }
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(
          "raditrack_sidebar_collapsed",
          String(next),
        );
      } catch {
        // Ignore localStorage errors.
      }

      return next;
    });
  };

  // =========================================================
  // Unified dashboard filter
  // =========================================================

  const [filterPreset, setFilterPreset] =
    useState<KpiPreset>("ALL");

  const [isKpiPending, startKpiTransition] =
    useTransition();

  // =========================================================
  // Date defaults
  // =========================================================

  const todayIso = useMemo(() => {
    const now = new Date();

    const y = now.getFullYear();
    const m = String(
      now.getMonth() + 1,
    ).padStart(2, "0");
    const d = String(
      now.getDate(),
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }, []);

  const defaultStartIso = useMemo(() => {
    const now = new Date();

    now.setDate(
      now.getDate() - 14,
    );

    const y = now.getFullYear();
    const m = String(
      now.getMonth() + 1,
    ).padStart(2, "0");
    const d = String(
      now.getDate(),
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }, []);

  const [customStart, setCustomStart] =
    useState(defaultStartIso);

  const [customEnd, setCustomEnd] =
    useState(todayIso);

  // =========================================================
  // Dynamic KPI / modality state
  // =========================================================

  const [kpiData, setKpiData] =
    useState<FilteredKpiResult | null>(null);

  const [
    filteredModalityData,
    setFilteredModalityData,
  ] = useState<
    ModalityTatOverviewItem[] | null
  >(null);

  // =========================================================
  // KPI filter
  // =========================================================

  const handlePresetChange = (
    preset: KpiPreset,
  ) => {
    setFilterPreset(preset);

    startKpiTransition(async () => {
      try {
        if (preset === "CUSTOM") {
          const result =
            await fetchFilteredExecutiveKpiAction({
              preset: "CUSTOM",
              startDate: customStart,
              endDate: customEnd,
            });

          setKpiData(result);
          setFilteredModalityData(
            result.modalityOverview,
          );

          return;
        }

        const result =
          await fetchFilteredExecutiveKpiAction({
            preset,
          });

        setKpiData(result);
        setFilteredModalityData(
          result.modalityOverview,
        );
      } catch (error) {
        console.error(
          "Failed to fetch filtered executive KPIs:",
          error,
        );
      }
    });
  };

  // =========================================================
  // Custom date range
  // =========================================================

  const handleCustomRangeApply = (
    startDate: string,
    endDate: string,
  ) => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
    setFilterPreset("CUSTOM");

    startKpiTransition(async () => {
      try {
        const result =
          await fetchFilteredExecutiveKpiAction({
            preset: "CUSTOM",
            startDate,
            endDate,
          });

        setKpiData(result);
        setFilteredModalityData(
          result.modalityOverview,
        );
      } catch (error) {
        console.error(
          "Failed to fetch custom executive KPIs:",
          error,
        );
      }
    });
  };

  // =========================================================
  // Telemetry summary
  // =========================================================

  const telemetrySummary = kpiData
    ? {
        presetLabel: kpiData.presetLabel,
        dateRangeFormatted:
          kpiData.dateRangeFormatted,
        totalVolume: kpiData.totalVolume,
        finalizedCount:
          kpiData.finalizedCount,
        pendingReadingCount:
          kpiData.pendingReadingCount,
        pctOnTime: kpiData.pctOnTime,
      }
    : {
        presetLabel: "All Time",
        dateRangeFormatted:
          "All Recorded Scans",
        totalVolume: data.totalVolume,
        finalizedCount:
          data.finalizedCount,
        pendingReadingCount:
          data.pendingReadingCount,
        pctOnTime: data.pctOnTime,
      };

  // =========================================================
  // Resolved metrics
  // =========================================================

  const displayVolume = kpiData
    ? kpiData.totalVolume
    : data.totalVolume;

  const displayAvgMinutes = kpiData
    ? kpiData.avgTatMinutes
    : data.avgTatMinutes;

  const displayAvgHours = kpiData
    ? kpiData.avgTatHours
    : Number(
        (
          data.avgTatMinutes / 60
        ).toFixed(1),
      );

  const displayMedianMinutes =
    kpiData
      ? kpiData.medianTatMinutes
      : data.medianTatMinutes;

  const displayPctOnTime = kpiData
    ? kpiData.pctOnTime
    : data.pctOnTime;

  const displayFinalized = kpiData
    ? kpiData.finalizedCount
    : data.finalizedCount;

  const displayPending = kpiData
    ? kpiData.pendingReadingCount
    : data.pendingReadingCount;

  // =========================================================
  // Recent analytics snapshot
  // =========================================================

  const recentAnalytics =
    sevenDayAnalytics?.all;

  const recentAvgHours =
    recentAnalytics?.currentAvgTatHours ??
    0;

  const recentAvgMinutes =
    recentAnalytics?.currentAvgTatMinutes ??
    0;

  const priorAvgHours =
    recentAnalytics?.priorAvgTatHours ??
    0;

  const priorAvgMinutes =
    recentAnalytics?.priorAvgTatMinutes ??
    0;

  const recentPctChange =
    recentAnalytics?.pctChange ??
    0;

  const recentTotalVolume =
    recentAnalytics?.currentTotalVolume ??
    0;

  // =========================================================
  // Shared layout styles
  // =========================================================

  const softCard =
    "rounded-3xl border border-border bg-card shadow-sm";

  const sectionEyebrow =
    "text-[11px] font-extrabold uppercase tracking-[0.12em] text-qc-blue";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={
          data.pendingReadingQueue.length
        }
        isCollapsed={
          isSidebarCollapsed
        }
        onToggleCollapse={
          handleToggleSidebar
        }
      />

      {/* =====================================================
          MAIN VIEWPORT
          ===================================================== */}

      <div
        className={`min-w-0 flex-1 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed
            ? "lg:pl-20"
            : "lg:pl-64"
        }`}
      >
        <main className="mx-auto w-full max-w-[1560px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          {/* =================================================
              OVERVIEW
              ================================================= */}

          {activeTab === "overview" && (
            <div className="space-y-7">
              {/* =================================================
                  TOP HEADER
                  ================================================= */}

              <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-qc-yellow/30 text-qc-navy">
                      <Activity className="h-3.5 w-3.5" />
                    </span>

                    <span className="text-xs font-extrabold text-qc-blue">
                      Radiology operations
                    </span>
                  </div>

                  <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy sm:text-4xl">
                    Dashboard
                  </h1>

                  <p className="mt-1 text-sm text-muted-foreground">
                    A clear view of today&apos;s
                    workload, turnaround, and SLA
                    performance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {isKpiPending && (
                    <span className="rounded-full border border-qc-blue/15 bg-qc-blue/5 px-3 py-2 text-xs font-bold text-qc-blue">
                      Updating…
                    </span>
                  )}

                  <QuickIngestionModal />
                </div>
              </header>

              {/* =================================================
                  FILTER BAR
                  ================================================= */}

              <section
                className={softCard}
                aria-label="Dashboard date filters"
              >
                <DateRangeFilter
                  currentPreset={
                    filterPreset
                  }
                  startDate={customStart}
                  endDate={customEnd}
                  onPresetChange={
                    handlePresetChange
                  }
                  onCustomRangeApply={
                    handleCustomRangeApply
                  }
                  isPending={
                    isKpiPending
                  }
                  telemetrySummary={
                    telemetrySummary
                  }
                />
              </section>

              {/* =================================================
                  KPI GRID
                  Four primary KPIs instead of five
                  ================================================= */}

              <section
                aria-label="Key performance indicators"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                {/* Volume */}
                <div className="rounded-3xl bg-qc-navy p-5 text-white shadow-[0_12px_32px_rgba(5,14,64,0.10)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-white/60">
                        Total scans
                      </p>

                      <div className="mt-3 text-4xl font-extrabold tracking-tight">
                        {displayVolume}
                      </div>

                      <p className="mt-2 text-xs font-medium text-white/55">
                        {filterPreset ===
                        "ALL"
                          ? "All recorded"
                          : telemetrySummary.presetLabel}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-yellow text-qc-navy">
                      <Activity className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Average TAT */}
                <div
                  className={`${softCard} p-5`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">
                        Average TAT
                      </p>

                      <div className="mt-3 text-4xl font-extrabold tracking-tight text-qc-navy">
                        {displayAvgHours >=
                        1
                          ? displayAvgHours
                          : displayAvgMinutes}

                        <span className="ml-1.5 text-base font-bold text-muted-foreground">
                          {displayAvgHours >=
                          1
                            ? "hrs"
                            : "mins"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Median{" "}
                        <strong className="text-qc-navy">
                          {displayMedianMinutes}
                          m
                        </strong>

                        {filterPreset ===
                          "ALL" &&
                          prevMonth && (
                            <>
                              {" "}
                              · Prior month{" "}
                              <strong className="text-qc-navy">
                                {prevMonth.avgTatHours >=
                                1
                                  ? `${prevMonth.avgTatHours}h`
                                  : `${prevMonth.avgTatMinutes}m`}
                              </strong>
                            </>
                          )}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* SLA */}
                <div
                  className={`${softCard} p-5`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">
                        SLA compliance
                      </p>

                      <div className="mt-3 text-4xl font-extrabold tracking-tight text-qc-blue">
                        {displayPctOnTime}%
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {displayFinalized} finalized
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-yellow/20 text-qc-blue">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Backlog */}
                <div
                  className={`${softCard} p-5`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">
                        Reading backlog
                      </p>

                      <div
                        className={`mt-3 text-4xl font-extrabold tracking-tight ${
                          displayPending > 0
                            ? "text-qc-orange"
                            : "text-qc-blue"
                        }`}
                      >
                        {displayPending}
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {displayPending > 0
                          ? "Awaiting sign-off"
                          : "Queue is clear"}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        displayPending > 0
                          ? "bg-orange-50 text-qc-orange"
                          : "bg-qc-blue/10 text-qc-blue"
                      }`}
                    >
                      {displayPending > 0 ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* =================================================
                  PRIMARY PERFORMANCE AREA
                  ================================================= */}

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.85fr)]">
                {/* Main chart */}
                <div className="min-w-0">
                  <TatOverviewChart
                    key={`tat-${filterPreset}-${customStart}-${customEnd}`}
                    data={
                      filteredModalityData ||
                      modalityTatOverview
                    }
                  />
                </div>

                {/* =================================================
                    7-DAY PULSE
                    ================================================= */}

                <div
                  className={`${softCard} flex flex-col p-5 sm:p-6`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={sectionEyebrow}>
                        Recent pulse
                      </p>

                      <h2 className="mt-1 text-xl font-extrabold tracking-tight text-qc-navy">
                        7-day TAT
                      </h2>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-yellow/25 text-qc-navy">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-bold text-muted-foreground">
                      Current average
                    </p>

                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold tracking-tight text-qc-navy">
                        {recentAvgHours >=
                        1
                          ? recentAvgHours
                          : recentAvgMinutes}
                      </span>

                      <span className="text-sm font-bold text-muted-foreground">
                        {recentAvgHours >=
                        1
                          ? "hrs"
                          : "mins"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {recentTotalVolume} exams
                      in the active window
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Prior 7-day average
                      </span>

                      <span className="text-sm font-extrabold text-qc-navy">
                        {priorAvgHours >=
                        1
                          ? `${priorAvgHours}h`
                          : `${priorAvgMinutes}m`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Change
                      </span>

                      {recentPctChange !==
                      0 ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            recentPctChange <
                            0
                              ? "bg-qc-blue/5 text-qc-blue"
                              : "bg-red-50 text-qc-red"
                          }`}
                        >
                          {recentPctChange <
                          0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}

                          {Math.abs(
                            recentPctChange,
                          )}
                          %
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                          No change
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "examinations",
                        )
                      }
                      className="group inline-flex items-center gap-2 text-xs font-extrabold text-qc-blue transition-colors hover:text-qc-navy"
                    >
                      View examination activity

                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </section>

              {/* =================================================
                  RECENT PERFORMANCE
                  ================================================= */}

              <section className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className={sectionEyebrow}>
                      Recent performance
                    </p>

                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-qc-navy">
                      7-day activity
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "examinations",
                      )
                    }
                    className="group inline-flex w-fit items-center gap-2 text-xs font-extrabold text-qc-blue hover:text-qc-navy"
                  >
                    Open examinations
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <SevenDayTatTable
                  analytics={
                    sevenDayAnalytics
                  }
                />
              </section>

              {/* =================================================
                  HISTORICAL ANALYTICS
                  ================================================= */}

              <section className="space-y-4">
                <div>
                  <p className={sectionEyebrow}>
                    Historical analytics
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-qc-navy">
                    Long-term TAT trend
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Use the historical view when
                    you need deeper trend analysis
                    beyond the current operational
                    window.
                  </p>
                </div>

                <TwelveMonthTrendChart
                  data={twelveMonthTrend}
                />
              </section>
            </div>
          )}

          {/* =====================================================
              EXAMINATIONS
              ===================================================== */}

          {activeTab ===
            "examinations" && (
            <div className="space-y-6">
              <header>
                <p className={sectionEyebrow}>
                  Workflow operations
                </p>

                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy sm:text-4xl">
                      Examinations
                    </h1>

                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Manage active reading work and
                      review finalized studies.
                    </p>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5 text-qc-blue" />

                    {data.pendingReadingQueue.length}{" "}
                    pending
                  </div>
                </div>
              </header>

              <ExaminationsHub
                queue={
                  data.pendingReadingQueue
                }
                finalizedCount={
                  data.finalizedCount
                }
              />
            </div>
          )}

          {/* =====================================================
              CONFIGURATIONS
              ===================================================== */}

          {activeTab === "config" && (
            <div className="space-y-6">
              <header>
                <p className={sectionEyebrow}>
                  System configuration
                </p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-qc-navy sm:text-4xl">
                  Configurations
                </h1>

                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Manage modalities, SLA targets,
                  rooms, and radiologist settings.
                </p>
              </header>

              <ConfigurationsHub
                initialData={
                  configurationsData
                }
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}