"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { Sidebar, ActiveTab, SIDEBAR_OFFSET } from "@/components/navigation/Sidebar";
import { HospitalHeader } from "@/components/navigation/HospitalHeader";
import { ExaminationsHub } from "@/components/examinations/ExaminationsHub";
import { ConfigurationsHub } from "@/components/config/ConfigurationsHub";
import { TatOverviewChart } from "@/components/charts/TatOverviewChart";
import { SevenDayTatTable } from "@/components/staff/SevenDayTatTable";
import { TwelveMonthTrendChart } from "@/components/staff/TwelveMonthTrendChart";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";

import type {
  ConfigurationsData,
  DashboardData,
  DashboardFilters,
  ModalityTatOverviewData,
  SevenDayAnalyticsData,
  TwelveMonthTrendData,
} from "@/lib/dashboard-types";

import { capAtToday, resolveKpiRange, toIsoDate } from "@/lib/kpi-range";
import { usePersistedBoolean } from "@/hooks/use-persisted-boolean";
import { ReportBuilderDialog } from "@/components/report/ReportBuilderDialog";
import { MyModalitiesBar } from "@/components/dashboard/MyModalitiesBar";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { isAdmin, type CurrentUser } from "@/lib/auth/roles";

import {
  fetchFilteredExecutiveKpiAction,
  type KpiPreset,
  type FilteredKpiResult,
} from "@/app/actions";

import {
  ModalityCode,
  MODALITY_CONFIG,
  MODALITY_ORDER,
  TriageLevel,
  TRIAGE_CONFIG,
} from "@/lib/enums";

import { CalendarDays } from "lucide-react";

const MODALITIES_LIST = [
  { code: ModalityCode.XRAY, label: "X-ray", color: "bg-blue-500" },
  { code: ModalityCode.MAMMO, label: "Mammogram", color: "bg-pink-500" },
  { code: ModalityCode.US, label: "Ultrasound", color: "bg-emerald-500" },
  { code: ModalityCode.CT, label: "CT-Scan", color: "bg-amber-500" },
  { code: ModalityCode.MRI, label: "MRI", color: "bg-purple-500" },
];

interface DashboardShellProps {
  data: DashboardData;
  sevenDayAnalytics: SevenDayAnalyticsData;
  twelveMonthTrend: TwelveMonthTrendData;
  modalityTatOverview: ModalityTatOverviewData;
  prevMonth: TwelveMonthTrendData["months"][number] | null;
  configurationsData: ConfigurationsData;
  currentUser: CurrentUser;
}

export function DashboardShell({
  data,
  sevenDayAnalytics,
  twelveMonthTrend,
  modalityTatOverview,
  prevMonth,
  configurationsData,
  currentUser,
}: DashboardShellProps) {
  const isAdminUser = isAdmin(currentUser);

  // The doctor's assigned modalities (known codes only, in assigned order).
  const myModalities = useMemo(
    () =>
      currentUser.assignedModalities.filter((code): code is ModalityCode =>
        (MODALITY_ORDER as readonly string[]).includes(code),
      ),
    [currentUser.assignedModalities],
  );

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("overview");

  /* =========================================================
     Sidebar
  ========================================================= */

  const [isSidebarCollapsed, handleToggleSidebar] =
    usePersistedBoolean("raditrack_sidebar_collapsed", false);

  /* =========================================================
     Dashboard filter (Default set to SEVEN_DAYS)
  ========================================================= */

  const [filterPreset, setFilterPreset] =
    useState<KpiPreset>("ROLLING_7D");

  const [isKpiPending, startKpiTransition] =
    useTransition();

  /* =========================================================
     Date defaults
  ========================================================= */

  const todayIso = useMemo(() => {
    const now = new Date();

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }, []);

  const defaultStartIso = useMemo(() => {
    const now = new Date();

    now.setDate(now.getDate() - 6);

    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }, []);

  const [customStart, setCustomStart] =
    useState(defaultStartIso);

  const [customEnd, setCustomEnd] =
    useState(todayIso);

  /* =========================================================
     Dynamic KPI / modality state
  ========================================================= */

  // Starts on the doctor's first assigned modality; they can switch freely.
  const [selectedModality, setSelectedModality] =
    useState<"ALL" | ModalityCode>(() => myModalities[0] ?? "ALL");

  const [selectedTriage, setSelectedTriage] =
    useState<"ALL" | TriageLevel>("ALL");

  // Server KPI result, tagged with the filter it was fetched for so a stale
  // result is never shown for a different (or default) filter.
  const [kpiResult, setKpiResult] = useState<{
    filterKey: string;
    data: FilteredKpiResult;
  } | null>(null);

  // Only true "All time" with no filters matches the page's initial data;
  // every other combination (including the 7-day default) is fetched.
  const isDefaultFilter =
    filterPreset === "ALL" &&
    selectedModality === "ALL" &&
    selectedTriage === "ALL";

  // Same dates the server uses, for card subtitles and the instant estimate.
  const kpiRange = useMemo(
    () => resolveKpiRange(filterPreset, new Date(), customStart, customEnd),
    [filterPreset, customStart, customEnd],
  );

  const filterKey = [
    filterPreset,
    filterPreset === "CUSTOM" ? customStart : "",
    filterPreset === "CUSTOM" ? customEnd : "",
    selectedModality,
    selectedTriage,
  ].join("|");

  const kpiData =
    !isDefaultFilter && kpiResult?.filterKey === filterKey
      ? kpiResult.data
      : null;

  /* =========================================================
     KPI filter
  ========================================================= */

  const handlePresetChange = (preset: KpiPreset) => {
    setFilterPreset(preset);
  };

  /* =========================================================
     Custom date range
  ========================================================= */

  const handleCustomRangeApply = (
    startDate: string,
    endDate: string,
  ) => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
    setFilterPreset("CUSTOM");
  };

  useEffect(() => {
    if (isDefaultFilter) return;

    let isCancelled = false;

    startKpiTransition(async () => {
      try {
        const result =
          await fetchFilteredExecutiveKpiAction({
            preset: filterPreset,
            startDate:
              filterPreset === "CUSTOM"
                ? customStart
                : undefined,
            endDate:
              filterPreset === "CUSTOM"
                ? customEnd
                : undefined,
            modalityCode: selectedModality,
            triageLevel: selectedTriage,
          });

        if (!isCancelled) {
          setKpiResult({ filterKey, data: result });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(
            "Failed to re-sync filtered KPIs:",
            error,
          );
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    data,
    isDefaultFilter,
    filterKey,
    filterPreset,
    customStart,
    customEnd,
    selectedModality,
    selectedTriage,
  ]);

  /* =========================================================
     Instant Reactive & Server-Synced KPI Metrics
  ========================================================= */

  const liveKpiMetrics = useMemo(() => {
    if (kpiData) return kpiData;

    if (isDefaultFilter) {
      return null;
    }

    // Instant local estimate from allExamsSummary while the server result
    // loads. It uses the same date window, so the cards never flash
    // all-time numbers under a 7-day label.
    const all = data.allExamsSummary;
    const rangeStartMs = kpiRange.start.getTime();
    const rangeEndMs = kpiRange.end.getTime();

    // Window + patient category (what the per-modality breakdowns use).
    const inWindowAndCategory = all.filter((e) => {
      if (!kpiRange.isAllTime) {
        const studyMs = new Date(e.studyDate).getTime();
        if (studyMs < rangeStartMs || studyMs > rangeEndMs) {
          return false;
        }
      }

      return (
        selectedTriage === "ALL" ||
        e.triageLevel === selectedTriage
      );
    });

    const scoped = inWindowAndCategory.filter(
      (e) =>
        selectedModality === "ALL" ||
        e.modalityCode === selectedModality,
    );

    const countByModality = (
      rows: typeof inWindowAndCategory,
    ): Record<string, number> => {
      const counts: Record<string, number> = Object.fromEntries(
        MODALITY_ORDER.map((code) => [code, 0]),
      );

      for (const row of rows) {
        if (counts[row.modalityCode] !== undefined) {
          counts[row.modalityCode] += 1;
        }
      }

      return counts;
    };

    const finalized = scoped.filter(
      (e) => e.isFinalized,
    );

    const tatValues = finalized
      .map((e) => e.tatMinutes || 0)
      .filter((value: number) => value > 0);

    const avgMinutes =
      tatValues.length > 0
        ? Number(
            (
              tatValues.reduce(
                (a: number, b: number) => a + b,
                0,
              ) / tatValues.length
            ).toFixed(1),
          )
        : 0;

    const avgHours = Number(
      (avgMinutes / 60).toFixed(1),
    );

    const sortedTat = [...tatValues].sort(
      (a, b) => a - b,
    );

    const mid = Math.floor(sortedTat.length / 2);

    const medianMinutes =
      sortedTat.length === 0
        ? 0
        : sortedTat.length % 2 !== 0
          ? sortedTat[mid]
          : (sortedTat[mid - 1] + sortedTat[mid]) / 2;

    const breached = finalized.filter(
      (e) => e.isSlaBreached,
    ).length;

    const pct =
      finalized.length > 0
        ? Number(
            (
              ((finalized.length - breached) /
                finalized.length) *
              100
            ).toFixed(1),
          )
        : 100;

    const pending = scoped.filter(
      (e) =>
        !e.isFinalized &&
        e.statusCode !== "CANCELLED",
    ).length;

    return {
      totalVolume: scoped.length,
      finalizedCount: finalized.length,
      pendingReadingCount: pending,
      avgTatMinutes: avgMinutes,
      avgTatHours: avgHours,
      medianTatMinutes: medianMinutes,
      pctOnTime: pct,
      tatDeltaPercent: null,
      volumeDeltaPercent: null,
      volumeByModality: countByModality(inWindowAndCategory),
      pendingByModality: countByModality(
        inWindowAndCategory.filter(
          (e) =>
            !e.isFinalized &&
            e.statusCode !== "CANCELLED",
        ),
      ),
      modalityOverview: null,
    };
  }, [
    data.allExamsSummary,
    isDefaultFilter,
    kpiRange,
    selectedModality,
    selectedTriage,
    kpiData,
  ]);

  const activeMetrics = kpiData || liveKpiMetrics;

  const displayVolume = activeMetrics
    ? activeMetrics.totalVolume
    : data.totalVolume;

  const displayAvgMinutes = activeMetrics
    ? activeMetrics.avgTatMinutes
    : data.avgTatMinutes;

  const displayAvgHours = activeMetrics
    ? activeMetrics.avgTatHours
    : Number((data.avgTatMinutes / 60).toFixed(1));

  const displayMedianMinutes = activeMetrics
    ? activeMetrics.medianTatMinutes
    : data.medianTatMinutes;

  const displayMedianHours = Number(
    ((displayMedianMinutes ?? 0) / 60).toFixed(1),
  );

  const displayPctOnTime = activeMetrics
    ? activeMetrics.pctOnTime
    : data.pctOnTime;

  const displayFinalized = activeMetrics
    ? activeMetrics.finalizedCount
    : data.finalizedCount;

  const displayPending = activeMetrics
    ? activeMetrics.pendingReadingCount
    : data.pendingReadingCount;

  /* =========================================================
     Modality breakdown & KPI filtering
  ========================================================= */

  const activeVolumeByModality: Record<string, number> =
    useMemo(() => {
      return (
        kpiData?.volumeByModality ??
        liveKpiMetrics?.volumeByModality ??
        data?.volumeByModality ?? {
          XRAY: 0,
          US: 0,
          CT: 0,
          MRI: 0,
          MAMMO: 0,
        }
      );
    }, [kpiData, liveKpiMetrics, data]);

  const activePendingByModality: Record<string, number> =
    useMemo(() => {
      return (
        kpiData?.pendingByModality ??
        liveKpiMetrics?.pendingByModality ??
        data?.pendingByModality ?? {
          XRAY: 0,
          US: 0,
          CT: 0,
          MRI: 0,
          MAMMO: 0,
        }
      );
    }, [kpiData, liveKpiMetrics, data]);

  // Hover breakdowns list every modality (within the date range and patient
  // category), so their percentages use these totals, not the picked modality's.
  const sumCounts = (counts: Record<string, number>) =>
    Object.values(counts).reduce((sum, count) => sum + count, 0);

  const volumeBreakdownTotal = sumCounts(activeVolumeByModality);
  const pendingBreakdownTotal = sumCounts(activePendingByModality);

  const filterScopeSubtitle = useMemo(() => {
    const modalityLabel =
      selectedModality === "ALL"
        ? "All modalities"
        : MODALITY_CONFIG[selectedModality]?.shortName || selectedModality;

    const patientCategoryLabel =
      selectedTriage === "ALL"
        ? "All patients"
        : TRIAGE_CONFIG[selectedTriage]?.label || selectedTriage;

    return `${modalityLabel} · ${patientCategoryLabel}`;
  }, [selectedModality, selectedTriage]);

  /* =========================================================
     Single filter bar shared by every section
  ========================================================= */

  const dashboardFilters: DashboardFilters = useMemo(
    () => ({
      preset: filterPreset,
      rangeStart: toIsoDate(kpiRange.start),
      // Capped at today so time-shaped charts never end on empty future days.
      rangeEnd: toIsoDate(capAtToday(kpiRange.end, kpiRange.isAllTime)),
      isAllTime: kpiRange.isAllTime,
      modality: selectedModality,
      triage: selectedTriage,
    }),
    [filterPreset, kpiRange, selectedModality, selectedTriage],
  );

  const [isReportOpen, setIsReportOpen] = useState(false);

  const chartScopeLabel = [
    kpiRange.isAllTime ? "All time" : kpiRange.dateRangeFormatted,
    selectedTriage !== "ALL"
      ? TRIAGE_CONFIG[selectedTriage]?.label || selectedTriage
      : "All patients",
  ].join(" · ");

  /* =========================================================
     Date Range Formatting & Card Subtitles
  ========================================================= */

  const dateRangeLabel = kpiRange.isAllTime
    ? "All time"
    : kpiRange.dateRangeFormatted;

  const displayVolumeForCard = displayVolume;

  const displayPendingForCard = displayPending;

  /* =========================================================
     Recent analytics and date range
  ========================================================= */

  const recentAnalytics = sevenDayAnalytics?.all;

  const recentDateRange = useMemo(() => {
    const rows = recentAnalytics?.dayRows ?? [];

    if (rows.length === 0) {
      return "Latest 7-day window";
    }

    const oldestIso = rows[rows.length - 1]?.isoDate;
    const newestIso = rows[0]?.isoDate;

    const parseIsoDate = (value?: string) => {
      if (!value) return null;

      const [year, month, day] = value
        .split("-")
        .map(Number);

      if (!year || !month || !day) return null;

      return new Date(year, month - 1, day);
    };

    const oldestDate = parseIsoDate(oldestIso);
    const newestDate = parseIsoDate(newestIso);

    if (!oldestDate || !newestDate) {
      const first =
        rows[rows.length - 1]?.formattedDate;

      const last = rows[0]?.formattedDate;

      return first && last
        ? `${first} – ${last}`
        : "Latest 7-day window";
    }

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
      }).format(date);

    if (
      oldestDate.getFullYear() ===
      newestDate.getFullYear()
    ) {
      return `${formatDate(oldestDate)} – ${formatDate(newestDate)}, ${newestDate.getFullYear()}`;
    }

    return `${formatDate(oldestDate)}, ${oldestDate.getFullYear()} – ${formatDate(newestDate)}, ${newestDate.getFullYear()}`;
  }, [recentAnalytics?.dayRows]);

  const recentAvgHours =
    recentAnalytics?.currentAvgTatHours ?? 0;

  const priorAvgHours =
    recentAnalytics?.priorAvgTatHours ?? 0;

  const recentPctChange =
    recentAnalytics?.pctChange ?? 0;

  const recentTotalVolume =
    recentAnalytics?.currentTotalVolume ?? 0;

  /* =========================================================
     Shared styles
  ========================================================= */

  const softCard =
    "rounded-[26px] border border-border/80 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)]";

  // KPI and card labels: 12px minimum so they stay readable.
  const compactLabel =
    "text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground";

  /* =========================================================
     Shared header: active page identity
  ========================================================= */

  const activeTabTitle: Record<ActiveTab, string> = {
    overview: "Dashboard",
    examinations: "Examinations",
    config: "Configurations",
    settings: "Settings",
  };

  return (
    <div className="relative min-h-screen overflow-clip bg-[#F7F9FC] text-foreground">
      {/* overflow-clip (not overflow-hidden) keeps sticky bars working inside */}
      {/* Global QCGH background */}

      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.34] saturate-[0.82]"
          style={{
            backgroundImage: "url('/qcgh-background.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-white/[0.34]" />

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,249,252,0.08)_0%,rgba(247,249,252,0.02)_38%,rgba(247,249,252,0.16)_100%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(0,53,122,0.045),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(255,210,48,0.055),transparent_26%)]" />
      </div>

      {/* Sidebar */}

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={data.pendingReadingQueue.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        currentUser={currentUser}
      />

      {/* Main viewport */}

      <div
        className={`relative z-10 min-w-0 flex-1 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed
            ? SIDEBAR_OFFSET.collapsed
            : SIDEBAR_OFFSET.expanded
        }`}
      >
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7 2xl:px-10">

          {/* Shared hospital header */}

          <HospitalHeader
            pageTitle={activeTabTitle[activeTab]}
            className="mb-5"
          />

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Filters */}

              <section
                aria-label="Dashboard filters"
                className="flex flex-col gap-2 lg:flex-row lg:items-center"
              >
                <div className="min-w-0 flex-1">
                  <DateRangeFilter
                    currentPreset={filterPreset}
                    startDate={customStart}
                    endDate={customEnd}
                    onPresetChange={handlePresetChange}
                    onCustomRangeApply={handleCustomRangeApply}
                    isPending={isKpiPending}
                    selectedModality={selectedModality}
                    onModalityChange={setSelectedModality}
                    selectedTriage={selectedTriage}
                    onTriageChange={setSelectedTriage}
                  />
                  <MyModalitiesBar
                    modalities={myModalities}
                    selected={selectedModality}
                    onSelect={setSelectedModality}
                  />

                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  {/* Compact date coverage, aligned with the filter controls */}
                  <div className="inline-flex h-11 w-fit max-w-full shrink-0 items-center gap-2.5 rounded-2xl border border-qc-navy/10 bg-white/80 px-3.5 shadow-sm backdrop-blur-sm">
                    <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                      Date coverage
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-4 w-px shrink-0 bg-qc-navy/15"
                    />
                    <span className="whitespace-nowrap text-xs font-extrabold text-qc-navy sm:text-[13px]">
                      {dateRangeLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReportOpen(true)}
                    className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-qc-navy px-5 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(0,53,122,0.18)] transition-colors hover:bg-qc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow sm:w-fit"
                  >
                    Generate Report
                  </button>
                </div>

                <ReportBuilderDialog
                  isOpen={isReportOpen}
                  onClose={() => setIsReportOpen(false)}
                  filters={dashboardFilters}
                />
              </section>

              {/* KPI cards */}

              <section
                aria-label="Key performance indicators"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {/* Total scans */}

                <div className="group relative isolate flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-qc-navy/20 bg-qc-navy px-5 py-4 text-center shadow-[0_10px_26px_rgba(0,53,122,0.10)] transition-all duration-300 hover:z-30 hover:-translate-y-1 hover:border-qc-blue/40 hover:shadow-[0_18px_34px_rgba(0,53,122,0.16)]">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                    <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-qc-blue/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />

                    <div className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-qc-yellow/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />

                    <div className="absolute inset-x-8 top-0 h-px bg-white/20" />
                  </div>

                  <div className="relative z-10 flex w-full flex-col items-center">
                    <div className="mb-1.5 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-qc-yellow shadow-[0_0_8px_rgba(255,210,48,0.55)] motion-safe:animate-pulse" />

                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-white/75">
                        Total scans
                      </p>
                    </div>

                    <div className="text-4xl font-extrabold leading-none tracking-tight text-white transition-transform duration-300 group-hover:scale-[1.03]">
                      {displayVolumeForCard}
                    </div>
                  </div>

                  {/* Scan breakdown popover */}

                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-2xl border border-white/20 bg-[#003064]/95 p-3.5 text-left text-white shadow-[0_20px_50px_rgba(0,53,122,0.35)] backdrop-blur-xl">
                      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[13px] font-bold uppercase tracking-wider text-white/70">
                          Scans by Modality
                        </span>

                        <span className="text-[13px] font-extrabold text-qc-yellow">
                          {volumeBreakdownTotal} Total
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {MODALITIES_LIST.map((m) => {
                          const count =
                            activeVolumeByModality[m.code] ?? 0;

                          const pct =
                            volumeBreakdownTotal > 0
                              ? Math.round(
                                  (count / volumeBreakdownTotal) * 100,
                                )
                              : 0;

                          const isSelected =
                            selectedModality === m.code;

                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();

                                setSelectedModality(
                                  isSelected ? "ALL" : m.code,
                                );
                              }}
                              className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors lg:min-h-0 hover:bg-white/15 ${
                                isSelected
                                  ? "bg-white/20 font-bold ring-1 ring-qc-yellow"
                                  : "bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${m.color}`}
                                />

                                <span className="text-white/95">
                                  {m.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span className="font-extrabold text-white">
                                  {count}
                                </span>

                                <span className="w-10 text-right text-xs text-white/70">
                                  {pct}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-white/70">
                        <span>Click row to filter</span>

                        {selectedModality !== "ALL" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModality("ALL");
                            }}
                            className="font-bold text-qc-yellow hover:underline"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average Turnaround Time */}

                <div
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/15 hover:shadow-[0_16px_30px_rgba(0,53,122,0.09)]`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.055] opacity-70 blur-2xl transition-all duration-500 group-hover:scale-125 group-hover:opacity-100" />

                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-qc-blue/10 to-transparent" />

                  <div className="relative z-10">
                    <p className={compactLabel}>
                      Average Turnaround Time
                    </p>

                    <div className="mt-1.5 flex items-baseline justify-center gap-1.5 transition-transform duration-300 group-hover:scale-[1.03]">
                      <span className="text-4xl font-extrabold leading-none tracking-tight text-qc-navy">
                        {displayAvgHours}
                      </span>

                      <span className="text-sm font-bold text-muted-foreground">
                        hrs
                      </span>
                    </div>

                    <p className="mt-2.5 text-[13px] text-muted-foreground">
                      Median{" "}
                      <span className="font-extrabold text-qc-navy">
                        {displayMedianHours} hrs
                      </span>
                    </p>
                  </div>
                </div>

                {/* SLA compliance */}

                <div
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] border-qc-blue/10 bg-[linear-gradient(145deg,#FFFFFF_0%,#F7F9FF_100%)] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/20 hover:shadow-[0_16px_30px_rgba(0,53,122,0.10)]`}
                >
                  <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.055] transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative z-10">
                    <p className={compactLabel}>
                      SLA compliance
                    </p>

                    <div className="mt-1.5 text-4xl font-extrabold leading-none tracking-tight text-qc-blue transition-transform duration-300 group-hover:scale-[1.03]">
                      {displayPctOnTime}%
                    </div>

                    <p className="mt-2.5 text-[13px] text-muted-foreground">
                      <span className="font-extrabold text-qc-navy">
                        {displayFinalized}
                      </span>{" "}
                      finalized
                    </p>
                  </div>
                </div>

                {/* Reading backlog */}

                <div
                  className={`group relative isolate flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border px-5 py-4 text-center transition-all duration-300 hover:z-30 ${
                    displayPendingForCard > 0
                      ? "border-orange-100 bg-[linear-gradient(145deg,#FFFDFC_0%,#FFF8F2_100%)] shadow-[0_6px_18px_rgba(234,88,12,0.045)] hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_30px_rgba(234,88,12,0.09)]"
                      : "border-border/80 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:border-qc-blue/15 hover:shadow-[0_16px_30px_rgba(0,53,122,0.08)]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                    <div
                      className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${
                        displayPendingForCard > 0
                          ? "bg-qc-orange/[0.10]"
                          : "bg-qc-blue/[0.05]"
                      }`}
                    />
                  </div>

                  <div className="relative z-10 flex w-full flex-col items-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {displayPendingForCard > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-qc-orange shadow-[0_0_8px_rgba(234,88,12,0.35)] motion-safe:animate-pulse" />
                      )}

                      <p className={compactLabel}>
                        Reading backlog
                      </p>
                    </div>

                    <div
                      className={`mt-1.5 text-4xl font-extrabold leading-none tracking-tight transition-transform duration-300 group-hover:scale-[1.03] ${
                        displayPendingForCard > 0
                          ? "text-qc-orange"
                          : "text-qc-blue"
                      }`}
                    >
                      {displayPendingForCard}
                    </div>

                    <p
                      className={`mt-2 text-[13px] font-semibold ${
                        displayPendingForCard > 0
                          ? "text-qc-orange"
                          : "text-qc-blue"
                      }`}
                    >
                      Awaiting sign-off
                    </p>
                  </div>

                  {/* Pending breakdown popover */}

                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-2xl border border-border bg-card/95 p-3.5 text-left text-foreground shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                      <div className="mb-2.5 flex items-center justify-between border-b border-border/80 pb-2">
                        <span className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                          Pending by Modality
                        </span>

                        <span className="text-[13px] font-extrabold text-qc-orange">
                          {pendingBreakdownTotal} Pending
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {MODALITIES_LIST.map((m) => {
                          const count =
                            activePendingByModality[m.code] ?? 0;

                          const pct =
                            pendingBreakdownTotal > 0
                              ? Math.round(
                                  (count / pendingBreakdownTotal) * 100,
                                )
                              : 0;

                          const isSelected =
                            selectedModality === m.code;

                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();

                                setSelectedModality(
                                  isSelected ? "ALL" : m.code,
                                );
                              }}
                              className={`flex min-h-10 w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors lg:min-h-0 hover:bg-muted ${
                                isSelected
                                  ? "bg-orange-500/15 font-bold text-qc-orange ring-1 ring-qc-orange"
                                  : "bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${m.color}`}
                                />

                                <span className="font-medium text-foreground">
                                  {m.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`font-extrabold ${
                                    count > 0
                                      ? "text-qc-orange"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {count}
                                </span>

                                <span className="w-10 text-right text-xs text-muted-foreground">
                                  {count > 0 ? `${pct}%` : "—"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-border/80 pt-2 text-xs text-muted-foreground">
                        <span>Click row to filter</span>

                        {selectedModality !== "ALL" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedModality("ALL");
                            }}
                            className="font-bold text-qc-orange hover:underline"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Primary analytics */}

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,0.75fr)]">
                <div className="min-w-0">
                  <TatOverviewChart
                    data={modalityTatOverview}
                    filters={dashboardFilters}
                    scopeLabel={chartScopeLabel}
                  />
                </div>

                {/* Recent Pulse */}

                <div
                  className={`${softCard} relative flex min-h-[360px] flex-col overflow-hidden px-6 py-6 sm:px-7 sm:py-7`}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-qc-blue/[0.04]" />

                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-qc-navy">
                    7-DAY TURNAROUND TIME
                  </h2>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-white/75 px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 text-qc-blue" />
                      {recentDateRange}
                    </span>

                    <span className="inline-flex items-center rounded-lg bg-qc-blue/[0.06] px-2.5 py-1.5 text-[13px] font-bold text-qc-blue">
                      For all Modalities
                    </span>
                  </div>

                  <div className="relative mt-9 text-center">
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                      Current average
                    </p>

                    <div className="mt-2 flex items-baseline justify-center gap-1.5">
                      <span className="text-[52px] font-extrabold leading-none tracking-tight text-qc-navy">
                        {recentAvgHours}
                      </span>

                      <span className="text-sm font-bold text-muted-foreground">
                        hrs
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {recentTotalVolume} exams in the current window
                    </p>
                  </div>

                  <div className="relative mt-8 rounded-[22px] border border-white/80 bg-[#F7F4EE] px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Previous
                      </span>

                      <span className="text-sm font-extrabold text-qc-navy">
                        {priorAvgHours} hrs
                      </span>
                    </div>

                    <div className="my-3 h-px bg-qc-navy/8" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Change
                      </span>

                      {recentPctChange !== 0 ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            recentPctChange < 0
                              ? "bg-qc-blue/10 text-qc-blue"
                              : "bg-red-50 text-qc-red"
                          }`}
                        >
                          {Math.abs(recentPctChange)}%{" "}
                          {recentPctChange < 0
                            ? "faster"
                            : "slower"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold text-muted-foreground">
                          No change
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-auto pt-6 text-center">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                      Compared with previous 7 days
                    </span>
                  </div>
                </div>
              </section>

              {/* 7-Day Turnaround Time performance */}

              <section className="overflow-hidden rounded-[28px] border border-[#DDE3F2] bg-[#FBFCFF] shadow-[0_4px_18px_rgba(0,53,122,0.05)]">
                <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-5 sm:px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

                  <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-2xl font-extrabold tracking-tight text-qc-blue">
                      7-DAY TURNAROUND TIME PERFORMANCE
                    </h2>

                    <button
                      type="button"
                      onClick={() => setActiveTab("examinations")}
                      className="group inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3.5 py-2 text-[13px] font-extrabold text-qc-blue lg:min-h-0 shadow-sm transition-all hover:border-qc-blue/10 hover:bg-white hover:text-qc-blue"
                    >
                      Open examinations

                      <span className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-[linear-gradient(180deg,#FCFCFE_0%,#FFFFFF_100%)]">
                  <SevenDayTatTable
                    analytics={sevenDayAnalytics}
                    filters={dashboardFilters}
                  />
                </div>
              </section>

              {/* 12-Month Turnaround Time trend */}

              <section className="overflow-hidden rounded-[28px] border border-[#DDE3F2] bg-[#FBFCFF] shadow-[0_4px_18px_rgba(0,53,122,0.05)]">
                <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-5 sm:px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

                  <div className="relative flex items-center">
                    <h2 className="text-2xl font-extrabold tracking-tight text-qc-blue">
                      12-MONTH TURNAROUND TIME TREND
                    </h2>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6">
                  <TwelveMonthTrendChart
                    data={twelveMonthTrend}
                    filters={dashboardFilters}
                    onModalityChange={setSelectedModality}
                  />
                </div>
              </section>
            </div>
          )}

          {/* =====================================================
              EXAMINATIONS
          ===================================================== */}

          {activeTab === "examinations" && (
            <div className="space-y-4">
              <ExaminationsHub
                queue={data.pendingReadingQueue}
                finalizedCount={data.finalizedCount}
                defaultModalities={myModalities}
                canManageExams={isAdminUser}
              />
            </div>
          )}

          {/* =====================================================
              CONFIGURATIONS
          ===================================================== */}

          {activeTab === "config" && (
            <div className="space-y-4">
              <ConfigurationsHub
                initialData={configurationsData}
                isAdmin={isAdminUser}
                currentUserId={currentUser.userId}
              />
            </div>
          )}

          {/* =====================================================
              SETTINGS (the signed-in user's own account)
          ===================================================== */}

          {activeTab === "settings" && <AccountSettings currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}