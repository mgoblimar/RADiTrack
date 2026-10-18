"use client";

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
  type ModalityTatOverviewItem,
} from "@/app/actions";
import { ModalityCode, MODALITY_CONFIG } from "@/lib/enums";

import {
  BarChart3,
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

  /* =========================================================
     Dynamic KPI / modality state
  ========================================================= */

  const [kpiData, setKpiData] =
    useState<FilteredKpiResult | null>(null);

  const [
    filteredModalityData,
    setFilteredModalityData,
  ] = useState<
    ModalityTatOverviewItem[] | null
  >(null);

  /* =========================================================
     KPI filter
  ========================================================= */

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

  useEffect(() => {
    if (filterPreset !== "ALL") {
      startKpiTransition(async () => {
        try {
          if (filterPreset === "CUSTOM") {
            const result = await fetchFilteredExecutiveKpiAction({
              preset: "CUSTOM",
              startDate: customStart,
              endDate: customEnd,
            });
            setKpiData(result);
            setFilteredModalityData(result.modalityOverview);
            return;
          }
          const result = await fetchFilteredExecutiveKpiAction({ preset: filterPreset });
          setKpiData(result);
          setFilteredModalityData(result.modalityOverview);
        } catch (error) {
          console.error("Failed to re-sync filtered KPIs:", error);
        }
      });
    }
  }, [data, filterPreset, customStart, customEnd]);

  /* =========================================================
     Resolved metrics
  ========================================================= */

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

  /* =========================================================
     Modality breakdown & KPI filtering
  ========================================================= */

  const [selectedModality, setSelectedModality] =
    useState<"ALL" | ModalityCode>("ALL");

  const activeVolumeByModality: Record<string, number> = useMemo(() => {
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

  const activePendingByModality: Record<string, number> = useMemo(() => {
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

  const displayVolumeForCard =
    selectedModality === "ALL"
      ? displayVolume
      : (activeVolumeByModality[selectedModality] ?? 0);

  const volumeSubtitle =
    selectedModality === "ALL"
      ? "Across all modalities"
      : `${MODALITY_CONFIG[selectedModality]?.shortName || selectedModality} · Selected modality`;

  const displayPendingForCard =
    selectedModality === "ALL"
      ? displayPending
      : (activePendingByModality[selectedModality] ?? 0);

  const pendingSubtitle =
    selectedModality === "ALL"
      ? "Across all modalities"
      : `${MODALITY_CONFIG[selectedModality]?.shortName || selectedModality} · Awaiting sign-off`;

  /* =========================================================
     Recent analytics
  ========================================================= */

  const recentAnalytics =
    sevenDayAnalytics?.all;

  const recentAvgHours =
    recentAnalytics
      ?.currentAvgTatHours ?? 0;

  const recentAvgMinutes =
    recentAnalytics
      ?.currentAvgTatMinutes ?? 0;

  const priorAvgHours =
    recentAnalytics
      ?.priorAvgTatHours ?? 0;

  const priorAvgMinutes =
    recentAnalytics
      ?.priorAvgTatMinutes ?? 0;

  const recentPctChange =
    recentAnalytics?.pctChange ?? 0;

  const recentTotalVolume =
    recentAnalytics
      ?.currentTotalVolume ?? 0;

  /* =========================================================
     Shared styles
  ========================================================= */

  const softCard =
    "rounded-[26px] border border-border/80 bg-card shadow-[0_2px_8px_rgba(15,23,42,0.04)]";

  const compactLabel =
    "text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F9FC] text-foreground">
      {/* =====================================================
          GLOBAL QCGH BACKGROUND
          Stays fixed across every tab and filter state.
      ===================================================== */}

      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* QCGH photograph */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.34] saturate-[0.82]"
          style={{
            backgroundImage:
              "url('/qcgh-background.jpg')",
          }}
        />

        {/* Readability wash */}
        <div className="absolute inset-0 bg-white/[0.34]" />

        {/* Vertical fade */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,249,252,0.08)_0%,rgba(247,249,252,0.02)_38%,rgba(247,249,252,0.16)_100%)]" />

        {/* RADiTrack atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(24,41,140,0.045),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(242,203,73,0.055),transparent_26%)]" />
      </div>

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
        className={`relative z-10 min-w-0 flex-1 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed
            ? "lg:pl-[76px]"
            : "lg:pl-[248px]"
        }`}
      >
        <main className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          {/* =================================================
              OVERVIEW
          ================================================= */}

          {activeTab === "overview" && (
            <div className="space-y-4">
              <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-qc-navy">
                  Dashboard
                </h1>
              </header>

              <section aria-label="Dashboard date filters">
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
                  selectedModality={
                    selectedModality
                  }
                  onModalityChange={
                    setSelectedModality
                  }
                />
              </section>

              {/* KPI CARDS */}
              <section
                aria-label="Key performance indicators"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {/* Total scans */}
                <div className="group relative isolate flex min-h-[132px] flex-col items-center justify-center rounded-[24px] border border-qc-navy/20 bg-qc-navy px-5 py-4 text-center shadow-[0_10px_26px_rgba(5,14,64,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/40 hover:shadow-[0_18px_34px_rgba(5,14,64,0.16)] hover:z-30">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
                    <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-qc-blue/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-qc-yellow/[0.08] blur-2xl transition-transform duration-500 group-hover:scale-125" />
                    <div className="absolute inset-x-8 top-0 h-px bg-white/20" />
                  </div>

                  <div className="relative z-10 w-full flex flex-col items-center">
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

                  {/* Hover Breakdown Popover */}
                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
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
                          const count = activeVolumeByModality[m.code] ?? 0;
                          const pct = displayVolume > 0 ? Math.round((count / displayVolume) * 100) : 0;
                          const isSelected = selectedModality === m.code;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedModality(isSelected ? "ALL" : m.code);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/15 ${
                                isSelected ? "bg-white/20 ring-1 ring-qc-yellow font-bold" : "bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                                <span className="text-white/95">{m.label}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-extrabold text-white">{count}</span>
                                <span className="text-[10px] text-white/50 w-7 text-right">{pct}%</span>
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
                            className="text-qc-yellow hover:underline font-bold"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Average TAT */}
                <div
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/15 hover:shadow-[0_16px_30px_rgba(24,41,140,0.09)]`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.055] blur-2xl opacity-70 transition-all duration-500 group-hover:scale-125 group-hover:opacity-100" />

                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-qc-blue/10 to-transparent" />

                  <div className="relative z-10">
                    <p className={compactLabel}>
                      Average TAT
                    </p>

                    <div className="mt-1.5 flex items-baseline justify-center gap-1.5 transition-transform duration-300 group-hover:scale-[1.03]">
                      <span className="text-4xl font-extrabold leading-none tracking-tight text-qc-navy">
                        {displayAvgHours >=
                        1
                          ? displayAvgHours
                          : displayAvgMinutes}
                      </span>

                      <span className="text-sm font-bold text-muted-foreground">
                        {displayAvgHours >=
                        1
                          ? "hrs"
                          : "mins"}
                      </span>
                    </div>

                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      Median{" "}
                      <span className="font-extrabold text-qc-navy">
                        {displayMedianMinutes}m
                      </span>
                    </p>
                  </div>
                </div>

                {/* SLA compliance */}
                <div
                  className={`${softCard} group relative isolate flex min-h-[132px] flex-col items-center justify-center overflow-hidden rounded-[24px] border-qc-blue/10 bg-[linear-gradient(145deg,#FFFFFF_0%,#F7F9FF_100%)] px-5 py-4 text-center transition-all duration-300 hover:-translate-y-1 hover:border-qc-blue/20 hover:shadow-[0_16px_30px_rgba(24,41,140,0.10)]`}
                >
                  <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.055] blur-2xl transition-transform duration-500 group-hover:scale-125" />

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

                  <div className="relative z-10 w-full flex flex-col items-center">
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

                  {/* Hover Breakdown Popover */}
                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
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
                          const count = activePendingByModality[m.code] ?? 0;
                          const pct = displayPending > 0 ? Math.round((count / displayPending) * 100) : 0;
                          const isSelected = selectedModality === m.code;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedModality(isSelected ? "ALL" : m.code);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-muted ${
                                isSelected ? "bg-orange-500/15 ring-1 ring-qc-orange font-bold text-qc-orange" : "bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                                <span className="font-medium text-foreground">{m.label}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`font-extrabold ${
                                    count > 0 ? "text-qc-orange" : "text-muted-foreground"
                                  }`}
                                >
                                  {count}
                                </span>
                                <span className="text-[10px] text-muted-foreground w-7 text-right">
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
                            className="text-qc-orange hover:underline font-bold"
                          >
                            Reset to All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* PRIMARY ANALYTICS */}
              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,0.75fr)]">
                <div className="min-w-0">
                  <TatOverviewChart
                    key={`tat-${filterPreset}-${customStart}-${customEnd}`}
                    data={
                      filteredModalityData ||
                      modalityTatOverview
                    }
                  />
                </div>

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
                      7-day Turnaround Time
                    </h2>
                  </div>

                  <div className="relative mt-9 text-center">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                      Current average
                    </p>

                    <div className="mt-2 flex items-baseline justify-center gap-1.5">
                      <span className="text-[52px] font-extrabold leading-none tracking-tight text-qc-navy">
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

                    <p className="mt-2 text-xs text-muted-foreground">
                      {recentTotalVolume}{" "}
                      exams in the current
                      window
                    </p>
                  </div>

                  <div className="relative mt-8 rounded-[22px] border border-white/80 bg-[#F7F4EE] px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Previous
                      </span>

                      <span className="text-sm font-extrabold text-qc-navy">
                        {priorAvgHours >=
                        1
                          ? `${priorAvgHours}h`
                          : `${priorAvgMinutes}m`}
                      </span>
                    </div>

                    <div className="my-3 h-px bg-qc-navy/8" />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Change
                      </span>

                      {recentPctChange !==
                      0 ? (
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${
                            recentPctChange <
                            0
                              ? "bg-qc-blue/10 text-qc-blue"
                              : "bg-red-50 text-qc-red"
                          }`}
                        >
                          {Math.abs(
                            recentPctChange,
                          )}
                          %{" "}
                          {recentPctChange <
                          0
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

              {/* 7-DAY PERFORMANCE */}
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
                        7-DAY PERFORMANCE
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          "examinations",
                        )
                      }
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
                  <SevenDayTatTable
                    analytics={
                      sevenDayAnalytics
                    }
                  />
                </div>
              </section>

              {/* 12-MONTH TREND */}
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
                        12-MONTH TAT TREND
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-6">
                  <TwelveMonthTrendChart
                    data={
                      twelveMonthTrend
                    }
                  />
                </div>
              </section>
            </div>
          )}

          {/* =====================================================
              EXAMINATIONS
          ===================================================== */}

          {activeTab ===
            "examinations" && (
            <div className="space-y-4">
              <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-qc-navy">
                  Examinations
                </h1>
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
            <div className="space-y-4">
              <header>
                <h1 className="text-4xl font-extrabold tracking-tight text-qc-navy">
                  Configurations
                </h1>
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