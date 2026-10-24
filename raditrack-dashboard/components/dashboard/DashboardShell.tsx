"use client";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

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
} from "@/app/actions";

import {
  ModalityCode,
  MODALITY_CONFIG,
  TriageLevel,
  TRIAGE_CONFIG,
} from "@/lib/enums";

import {
  BarChart3,
  CalendarDays,
} from "lucide-react";

const MODALITIES_LIST = [
  { code: ModalityCode.XRAY, label: "X-ray", color: "bg-blue-500" },
  { code: ModalityCode.US, label: "Ultrasound", color: "bg-emerald-500" },
  { code: ModalityCode.CT, label: "CT-Scan", color: "bg-amber-500" },
  { code: ModalityCode.MRI, label: "MRI", color: "bg-purple-500" },
  { code: ModalityCode.MAMMO, label: "Mammogram", color: "bg-pink-500" },
];

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

  /* =========================================================
     Sidebar
  ========================================================= */

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "raditrack_sidebar_collapsed",
      );

      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
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

  /* =========================================================
     Dashboard filter
  ========================================================= */

  const [filterPreset, setFilterPreset] =
    useState<KpiPreset>("ALL");

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

    now.setDate(now.getDate() - 14);

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

  const [kpiData, setKpiData] =
    useState<FilteredKpiResult | null>(null);

  const [selectedModality, setSelectedModality] =
    useState<"ALL" | ModalityCode>("ALL");

  const [selectedTriage, setSelectedTriage] =
    useState<"ALL" | TriageLevel>("ALL");

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
    let isCancelled = false;

    if (
      filterPreset !== "ALL" ||
      selectedModality !== "ALL" ||
      selectedTriage !== "ALL"
    ) {
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
            setKpiData(result);
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
    } else {
      setKpiData(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    data,
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

    if (
      filterPreset === "ALL" &&
      selectedModality === "ALL" &&
      selectedTriage === "ALL"
    ) {
      return null;
    }

    // Instant local calculation from allExamsSummary.
    const all = data?.allExamsSummary || [];

    const scoped = all.filter((e: any) => {
      if (
        selectedModality !== "ALL" &&
        e.modalityCode !== selectedModality
      ) {
        return false;
      }

      if (
        selectedTriage !== "ALL" &&
        e.triageLevel !== selectedTriage
      ) {
        return false;
      }

      return true;
    });

    const finalized = scoped.filter(
      (e: any) => e.isFinalized,
    );

    const tatValues = finalized
      .map((e: any) => e.tatMinutes || 0)
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
      (e: any) => e.isSlaBreached,
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
      (e: any) =>
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
      volumeByModality: null,
      pendingByModality: null,
      modalityOverview: null,
    };
  }, [
    data?.allExamsSummary,
    filterPreset,
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
        data?.volumeByModality ?? {
          XRAY: 0,
          US: 0,
          CT: 0,
          MRI: 0,
          MAMMO: 0,
        }
      );
    }, [kpiData, data]);

  const activePendingByModality: Record<string, number> =
    useMemo(() => {
      return (
        kpiData?.pendingByModality ??
        data?.pendingByModality ?? {
          XRAY: 0,
          US: 0,
          CT: 0,
          MRI: 0,
          MAMMO: 0,
        }
      );
    }, [kpiData, data]);

  const filterScopeSubtitle = useMemo(() => {
    const parts: string[] = [];

    if (selectedModality !== "ALL") {
      parts.push(
        MODALITY_CONFIG[selectedModality]?.shortName ||
          selectedModality,
      );
    }

    if (selectedTriage !== "ALL") {
      parts.push(
        TRIAGE_CONFIG[selectedTriage]?.label ||
          selectedTriage,
      );
    }

    return parts.length > 0
      ? parts.join(" · ")
      : "";
  }, [selectedModality, selectedTriage]);

  const displayVolumeForCard = displayVolume;
  const volumeSubtitle = filterScopeSubtitle;

  const displayPendingForCard = displayPending;
  const pendingSubtitle =
    `${filterScopeSubtitle} Awaiting sign-off`;

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

  const recentAvgMinutes =
    recentAnalytics?.currentAvgTatMinutes ?? 0;

  const priorAvgHours =
    recentAnalytics?.priorAvgTatHours ?? 0;

  const priorAvgMinutes =
    recentAnalytics?.priorAvgTatMinutes ?? 0;

  const recentPctChange =
    recentAnalytics?.pctChange ?? 0;

  const recentTotalVolume =
    recentAnalytics?.currentTotalVolume ?? 0;

  /* =========================================================
     Shared styles
  ========================================================= */

  const softCard =
    "rounded-[26px] border border-border/80 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)]";

  const compactLabel =
    "text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F9FC] text-foreground">
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

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(24,41,140,0.045),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(242,203,73,0.055),transparent_26%)]" />
      </div>

      {/* Sidebar */}

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={data.pendingReadingQueue.length}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main viewport */}

      <div
        className={`relative z-10 min-w-0 flex-1 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed
            ? "lg:pl-[76px]"
            : "lg:pl-[248px]"
        }`}
      >
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7 2xl:px-10">
          {/* Shared hospital and department header */}

          <header
            aria-label="Quezon City General Hospital Department of Radiology"
            className="mb-6 flex flex-col gap-4 rounded-[24px] border border-[#DDE3F2]/90 bg-white/90 px-4 py-4 shadow-[0_4px_18px_rgba(5,14,64,0.06)] backdrop-blur-sm sm:flex-row sm:items-center sm:px-5 sm:py-4"
          >
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[#E7EAF2] bg-white p-1.5">
                <Image
                  src="/qcgh-hospital-logo.png"
                  alt="Quezon City General Hospital logo"
                  width={58}
                  height={58}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[#E7EAF2] bg-white p-1.5">
                <Image
                  src="/qcgh-radiology-logo.png"
                  alt="Quezon City General Hospital Department of Radiology logo"
                  width={58}
                  height={58}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="min-w-0 border-t border-[#E5E9F2] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-qc-blue sm:text-sm">
                Quezon City General Hospital
              </p>

              <p className="mt-0.5 text-xl font-extrabold leading-tight tracking-tight text-qc-navy sm:text-2xl">
                Department of Radiology
              </p>
            </div>

            <div className="sm:ml-auto sm:pl-4">
              
            </div>
          </header>

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeTab === "overview" && (
            <div className="space-y-4">
              

              {/* Filters */}

              <section aria-label="Dashboard date filters">
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
              </section>

              {/* KPI cards */}

              <section
                aria-label="Key performance indicators"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {/* Total scans */}

                <div className="group relative isolate flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-qc-navy/20 bg-qc-navy px-5 py-4 text-center shadow-[0_10px_26px_rgba(5,14,64,0.10)] transition-all duration-300 hover:z-30 hover:-translate-y-1 hover:border-qc-blue/40 hover:shadow-[0_18px_34px_rgba(5,14,64,0.16)]">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                    <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-qc-blue/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />

                    <div className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-qc-yellow/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />

                    <div className="absolute inset-x-8 top-0 h-px bg-white/20" />
                  </div>

                  <div className="relative z-10 flex w-full flex-col items-center">
                    <div className="mb-1.5 flex items-center justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-qc-yellow shadow-[0_0_8px_rgba(242,203,73,0.55)] motion-safe:animate-pulse" />

                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">
                        Total scans
                      </p>
                    </div>

                    <div className="text-4xl font-extrabold leading-none tracking-tight text-white transition-transform duration-300 group-hover:scale-[1.03]">
                      {displayVolumeForCard}
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-white/60">
                      {volumeSubtitle}
                    </p>
                  </div>

                  {/* Scan breakdown popover */}

                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-2xl border border-white/20 bg-[#061148]/95 p-3.5 text-left text-white shadow-[0_20px_50px_rgba(5,14,64,0.40)] backdrop-blur-xl">
                      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                          Scans by Modality
                        </span>

                        <span className="text-[11px] font-extrabold text-qc-yellow">
                          {displayVolume} Total
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {MODALITIES_LIST.map((m) => {
                          const count =
                            activeVolumeByModality[m.code] ?? 0;

                          const pct =
                            displayVolume > 0
                              ? Math.round(
                                  (count / displayVolume) * 100,
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
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/15 ${
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

                                <span className="w-7 text-right text-[10px] text-white/50">
                                  {pct}%
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/50">
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
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/15 hover:shadow-[0_16px_30px_rgba(24,41,140,0.09)]`}
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

                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      Median{" "}
                      <span className="font-extrabold text-qc-navy">
                        {displayMedianHours} hrs
                      </span>
                    </p>

                    <p className="mt-1 max-w-[200px] truncate text-[10px] font-medium text-muted-foreground/80">
                      {volumeSubtitle}
                    </p>
                  </div>
                </div>

                {/* SLA compliance */}

                <div
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] border-qc-blue/10 bg-[linear-gradient(145deg,#FFFFFF_0%,#F7F9FF_100%)] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/20 hover:shadow-[0_16px_30px_rgba(24,41,140,0.10)]`}
                >
                  <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.055] transition-transform duration-500 group-hover:scale-125" />

                  <div className="relative z-10">
                    <p className={compactLabel}>
                      SLA compliance
                    </p>

                    <div className="mt-1.5 text-4xl font-extrabold leading-none tracking-tight text-qc-blue transition-transform duration-300 group-hover:scale-[1.03]">
                      {displayPctOnTime}%
                    </div>

                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      <span className="font-extrabold text-qc-navy">
                        {displayFinalized}
                      </span>{" "}
                      finalized
                    </p>

                    <p className="mt-1 max-w-[200px] truncate text-[10px] font-medium text-muted-foreground/80">
                      {volumeSubtitle}
                    </p>
                  </div>
                </div>

                {/* Reading backlog */}

                <div
                  className={`group relative isolate flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border px-5 py-4 text-center transition-all duration-300 hover:z-30 ${
                    displayPendingForCard > 0
                      ? "border-orange-100 bg-[linear-gradient(145deg,#FFFDFC_0%,#FFF8F2_100%)] shadow-[0_6px_18px_rgba(234,88,12,0.045)] hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_16px_30px_rgba(234,88,12,0.09)]"
                      : "border-border/80 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:border-qc-blue/15 hover:shadow-[0_16px_30px_rgba(24,41,140,0.08)]"
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
                      className={`mt-2 text-[11px] font-semibold ${
                        displayPendingForCard > 0
                          ? "text-qc-orange"
                          : "text-qc-blue"
                      }`}
                    >
                      {pendingSubtitle}
                    </p>
                  </div>

                  {/* Pending breakdown popover */}

                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="rounded-2xl border border-border bg-card/95 p-3.5 text-left text-foreground shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
                      <div className="mb-2.5 flex items-center justify-between border-b border-border/80 pb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Pending by Modality
                        </span>

                        <span className="text-[11px] font-extrabold text-qc-orange">
                          {displayPending} Pending
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {MODALITIES_LIST.map((m) => {
                          const count =
                            activePendingByModality[m.code] ?? 0;

                          const pct =
                            displayPending > 0
                              ? Math.round(
                                  (count / displayPending) * 100,
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
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-muted ${
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

                                <span className="w-7 text-right text-[10px] text-muted-foreground">
                                  {count > 0 ? `${pct}%` : "—"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-border/80 pt-2 text-[10px] text-muted-foreground">
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
                  <TatOverviewChart data={modalityTatOverview} />
                </div>

                {/* Recent Pulse */}

                <div
                  className={`${softCard} relative flex min-h-[360px] flex-col overflow-hidden px-6 py-6 sm:px-7 sm:py-7`}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-qc-blue/[0.04]" />

                  <div className="relative">
                    <p className={compactLabel}>
                      Recent pulse
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold tracking-tight text-qc-navy">
                      7-Day Turnaround Time
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-white/75 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-qc-blue" />
                        {recentDateRange}
                      </span>

                      <span className="inline-flex items-center rounded-lg bg-qc-blue/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-qc-blue">
                        For all Modalities
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-9 text-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
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
                          className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${
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
                        <span className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-extrabold text-muted-foreground">
                          No change
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-auto pt-6 text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                      Compared with previous 7 days
                    </span>
                  </div>
                </div>
              </section>

              {/* 7-Day Turnaround Time performance */}

              <section className="overflow-hidden rounded-[28px] border border-[#DDE3F2] bg-[#FBFCFF] shadow-[0_4px_18px_rgba(24,41,140,0.05)]">
                <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-5 sm:px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

                  <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow shadow-[0_5px_14px_rgba(5,14,64,0.12)]">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <h2 className="text-2xl font-extrabold tracking-tight text-qc-navy">
                        7-DAY TURNAROUND TIME PERFORMANCE
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("examinations")}
                      className="group inline-flex w-fit items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3.5 py-2 text-[11px] font-extrabold text-qc-blue shadow-sm transition-all hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
                    >
                      Open examinations

                      <span className="transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-[linear-gradient(180deg,#FCFCFE_0%,#FFFFFF_100%)]">
                  <SevenDayTatTable analytics={sevenDayAnalytics} />
                </div>
              </section>

              {/* 12-Month Turnaround Time trend */}

              <section className="overflow-hidden rounded-[28px] border border-[#DDE3F2] bg-[#FBFCFF] shadow-[0_4px_18px_rgba(24,41,140,0.05)]">
                <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-5 sm:px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

                  <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

                  <div className="relative flex items-center">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow shadow-[0_5px_14px_rgba(5,14,64,0.12)]">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <h2 className="text-2xl font-extrabold tracking-tight text-qc-navy">
                        12-MONTH TURNAROUND TIME TREND
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6">
                  <TwelveMonthTrendChart data={twelveMonthTrend} />
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
              />
            </div>
          )}

          {/* =====================================================
              CONFIGURATIONS
          ===================================================== */}

          {activeTab === "config" && (
            <div className="space-y-4">
              

              <ConfigurationsHub initialData={configurationsData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}