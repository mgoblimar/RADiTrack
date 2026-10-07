"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { ModalityCode } from "@/lib/enums";
import { fetchSevenDayAnalyticsAction } from "@/app/actions";

import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Filter,
  Layers,
  Maximize2,
  RotateCcw,
  Settings2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

interface DayRow {
  dayLabel: string;
  formattedDate: string;
  isoDate: string;
  totalExams: number;
  opdCount: number;
  inCount: number;
  erCount: number;
  finalizedCount: number;
  pendingCount: number;
  avgTatMinutes: number;
  avgTatHours: number;
}

interface ModalityAnalytics {
  dayRows: DayRow[];
  priorDayRows?: DayRow[];
  currentAvgTatMinutes: number;
  currentAvgTatHours: number;
  priorAvgTatMinutes: number;
  priorAvgTatHours: number;
  currentTotalVolume: number;
  priorTotalVolume: number;
  currentFinalizedCount?: number;
  priorFinalizedCount?: number;
  pctChange: number;
  anchorFormatted?: string;
  mode?: "rolling" | "static";
}

interface Props {
  analytics: {
    all: ModalityAnalytics;
    byModality: Record<string, ModalityAnalytics>;
  };
}

type ViewLayout = "sideBySide" | "single";
type AnalyticsMode = "rolling" | "static";

export function SevenDayTatTable({
  analytics: initialAnalytics,
}: Props) {
  // =========================================================
  // UI state
  // =========================================================

  const [activeTab, setActiveTab] =
    useState<string>("ALL");

  const [mode, setMode] =
    useState<AnalyticsMode>("rolling");

  const [viewLayout, setViewLayout] =
    useState<ViewLayout>("sideBySide");

  const [isOptionsOpen, setIsOptionsOpen] =
    useState(false);

  const optionsDropdownRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // Today's date
  // =========================================================

  const todayIso = useMemo(() => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
      now.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      now.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  // =========================================================
  // Analytics state
  // =========================================================

  const [anchorDate, setAnchorDate] =
    useState<string>(
      initialAnalytics.all.anchorFormatted ||
        todayIso,
    );

  const [analytics, setAnalytics] =
    useState(initialAnalytics);

  const [isPending, startTransition] =
    useTransition();

  // =========================================================
  // Close options popover
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        optionsDropdownRef.current &&
        !optionsDropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOptionsOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
      }
    };

    if (isOptionsOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOptionsOpen]);

  // =========================================================
  // Current modality dataset
  // =========================================================

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] ??
        analytics.all;

  // =========================================================
  // Modality choices
  // =========================================================

  const tabs = [
    {
      key: "ALL",
      label: "All",
    },
    {
      key: ModalityCode.XRAY,
      label: "X-ray",
    },
    {
      key: ModalityCode.US,
      label: "Ultrasound",
    },
    {
      key: ModalityCode.CT,
      label: "CT",
    },
    {
      key: ModalityCode.MRI,
      label: "MRI",
    },
    {
      key: ModalityCode.MAMMO,
      label: "Mammogram",
    },
  ];

  const currentTabLabel =
    tabs.find(
      (tab) => tab.key === activeTab,
    )?.label ?? "All";

  // =========================================================
  // Fetch analytics
  // =========================================================

  const handleFetch = (
    newAnchor: string,
    newMode: AnalyticsMode,
  ) => {
    setAnchorDate(newAnchor);
    setMode(newMode);

    startTransition(async () => {
      try {
        const result =
          await fetchSevenDayAnalyticsAction(
            newAnchor,
            newMode,
          );

        setAnalytics(result);
      } catch (error) {
        console.error(
          "Failed to fetch 7-day analytics:",
          error,
        );
      }
    });
  };

  // =========================================================
  // Move anchor by 7 days
  // =========================================================

  const stepAnchor = (days: number) => {
    const parts = anchorDate
      .split("-")
      .map(Number);

    if (parts.length !== 3) {
      return;
    }

    const date = new Date(
      parts[0],
      parts[1] - 1,
      parts[2],
    );

    date.setDate(
      date.getDate() + days,
    );

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    handleFetch(
      `${year}-${month}-${day}`,
      mode,
    );
  };

  // =========================================================
  // Reset anchor to today
  // =========================================================

  const handleResetToday = () => {
    handleFetch(todayIso, mode);
  };

  // =========================================================
  // Date labels
  // =========================================================

  const firstDay =
    currentData.dayRows[
      currentData.dayRows.length - 1
    ]?.formattedDate ?? "";

  const lastDay =
    currentData.dayRows[0]
      ?.formattedDate ?? "";

  const priorFirstDay =
    currentData.priorDayRows &&
    currentData.priorDayRows.length > 0
      ? currentData.priorDayRows[
          currentData.priorDayRows.length - 1
        ]?.formattedDate ?? ""
      : "";

  const priorLastDay =
    currentData.priorDayRows &&
    currentData.priorDayRows.length > 0
      ? currentData.priorDayRows[0]
          ?.formattedDate ?? ""
      : "";

  // =========================================================
  // Helper: format TAT
  // =========================================================

  const formatTat = (
    minutes: number,
    hours: number,
  ) => {
    if (hours >= 1) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  };

  // =========================================================
  // Helper: render one 7-day table
  // =========================================================

  const renderTable = (
    rows: DayRow[],
    isPrior = false,
  ) => {
    const totalVolume = rows.reduce(
      (sum, row) =>
        sum + row.totalExams,
      0,
    );

    const totalFinalized = rows.reduce(
      (sum, row) =>
        sum + row.finalizedCount,
      0,
    );

    const totalPending = rows.reduce(
      (sum, row) =>
        sum + row.pendingCount,
      0,
    );

    const averageTat =
      rows.reduce(
        (sum, row) =>
          sum +
          (row.finalizedCount > 0
            ? row.avgTatMinutes *
              row.finalizedCount
            : 0),
        0,
      );

    const totalFinalizedForAverage =
      rows.reduce(
        (sum, row) =>
          sum + row.finalizedCount,
        0,
      );

    const weightedAverage =
      totalFinalizedForAverage > 0
        ? Math.round(
            averageTat /
              totalFinalizedForAverage,
          )
        : 0;

    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="border-b border-border bg-background/70">
              <tr className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3">
                  Day
                </th>

                <th className="px-3 py-3 text-center">
                  Volume
                </th>

                <th className="px-3 py-3 text-center">
                  OPD · IN · ER
                </th>

                <th className="px-3 py-3 text-center">
                  Signed
                </th>

                <th className="px-3 py-3 text-center">
                  Pending
                </th>

                <th className="px-4 py-3 text-right">
                  Avg TAT
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isToday =
                  row.isoDate ===
                  todayIso;

                const isSlow =
                  row.finalizedCount >
                    0 &&
                  row.avgTatMinutes >
                    120;

                return (
                  <tr
                    key={`${row.isoDate}-${row.dayLabel}`}
                    className={`transition-colors ${
                      isToday
                        ? "bg-qc-yellow/10"
                        : "hover:bg-qc-blue/[0.02]"
                    }`}
                  >
                    {/* Day */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <div className="text-xs font-extrabold text-qc-navy">
                            {row.dayLabel}
                          </div>

                          <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                            {row.formattedDate}
                          </div>
                        </div>

                        {isToday && (
                          <span className="rounded-full bg-qc-yellow px-2 py-0.5 text-[8px] font-extrabold text-qc-navy">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-navy">
                        {row.totalExams}
                      </span>
                    </td>

                    {/* Triage */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="text-qc-blue">
                          {row.opdCount}
                        </span>

                        <span className="text-border">
                          /
                        </span>

                        <span className="text-qc-blue">
                          {row.inCount}
                        </span>

                        <span className="text-border">
                          /
                        </span>

                        <span className="text-qc-orange">
                          {row.erCount}
                        </span>
                      </div>
                    </td>

                    {/* Signed */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-blue">
                        {row.finalizedCount}
                      </span>
                    </td>

                    {/* Pending */}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`text-xs font-extrabold ${
                          row.pendingCount >
                          0
                            ? "text-qc-orange"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {row.pendingCount}
                      </span>
                    </td>

                    {/* Avg TAT */}
                    <td className="px-4 py-3 text-right">
                      {row.finalizedCount ===
                      0 ? (
                        <span className="text-[10px] font-medium text-muted-foreground/50">
                          —
                        </span>
                      ) : (
                        <span
                          className={`font-mono text-xs font-extrabold ${
                            isSlow
                              ? "text-qc-red"
                              : isPrior
                                ? "text-qc-blue"
                                : "text-qc-navy"
                          }`}
                        >
                          {formatTat(
                            row.avgTatMinutes,
                            row.avgTatHours,
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t border-border bg-background">
              <tr>
                <td className="px-4 py-3">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                      {isPrior
                        ? "Prior total"
                        : "Current total"}
                    </span>

                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {totalFinalizedForAverage >
                      0
                        ? `${weightedAverage}m weighted avg`
                        : "No finalized data"}
                    </span>
                  </div>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-navy">
                    {totalVolume}
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-[9px] font-semibold text-muted-foreground/60">
                    combined
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-blue">
                    {totalFinalized}
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-orange">
                    {totalPending}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      isPrior
                        ? "text-qc-blue"
                        : "text-qc-navy"
                    }`}
                  >
                    {formatTat(
                      isPrior
                        ? currentData.priorAvgTatMinutes
                        : currentData.currentAvgTatMinutes,
                      isPrior
                        ? currentData.priorAvgTatHours
                        : currentData.currentAvgTatHours,
                    )}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* =======================================================
          HEADER
          ======================================================= */}

      <div className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
              <Calendar className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-qc-navy sm:text-lg">
                  7-day TAT performance
                </h2>

                <span className="rounded-full bg-qc-blue/5 px-2 py-0.5 text-[9px] font-extrabold text-qc-blue">
                  {currentTabLabel}
                </span>

                {isPending && (
                  <span className="rounded-full bg-qc-yellow/20 px-2 py-0.5 text-[9px] font-extrabold text-qc-navy">
                    Updating…
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {mode === "rolling"
                  ? "Rolling"
                  : "Calendar"}{" "}
                window · {firstDay} –{" "}
                {lastDay}
              </p>
            </div>
          </div>

          {/* Options */}
          <div
            ref={optionsDropdownRef}
            className="relative self-start lg:self-auto"
          >
            <button
              type="button"
              onClick={() =>
                setIsOptionsOpen(
                  (previous) =>
                    !previous,
                )
              }
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition-all ${
                isOptionsOpen
                  ? "border-qc-navy bg-qc-navy text-white"
                  : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
              }`}
              aria-expanded={
                isOptionsOpen
              }
              aria-haspopup="dialog"
            >
              <Settings2
                className={`h-3.5 w-3.5 ${
                  isOptionsOpen
                    ? "text-qc-yellow"
                    : "text-qc-blue"
                }`}
              />

              <span>Options</span>

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isOptionsOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* =================================================
                OPTIONS POPOVER
                ================================================= */}

            {isOptionsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[330px] rounded-3xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(5,14,64,0.14)] animate-in fade-in zoom-in-95 duration-150 sm:w-[380px]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-qc-blue" />

                    <span className="text-sm font-extrabold text-qc-navy">
                      Table options
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsOptionsOpen(
                        false,
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                    aria-label="Close options"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Modality */}
                <div>
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Modality
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            tab.key,
                          )
                        }
                        className={`flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-colors ${
                          activeTab ===
                          tab.key
                            ? "bg-qc-yellow text-qc-navy"
                            : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                        }`}
                      >
                        <span className="truncate">
                          {tab.label}
                        </span>

                        {activeTab ===
                          tab.key && (
                          <Check className="h-3 w-3 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Time mode
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleFetch(
                          anchorDate,
                          "rolling",
                        )
                      }
                      className={`rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                        mode ===
                        "rolling"
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      Rolling 7 days
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleFetch(
                          anchorDate,
                          "static",
                        )
                      }
                      className={`rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                        mode ===
                        "static"
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      Mon–Sun
                    </button>
                  </div>
                </div>

                {/* Anchor */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Date anchor
                  </p>

                  <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        stepAnchor(-7)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                      title="Previous 7 days"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <input
                      type="date"
                      value={anchorDate}
                      onChange={(
                        event,
                      ) => {
                        if (
                          event.target
                            .value
                        ) {
                          handleFetch(
                            event.target
                              .value,
                            mode,
                          );
                        }
                      }}
                      className="bg-transparent px-2 text-xs font-bold text-qc-navy outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        stepAnchor(7)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                      title="Next 7 days"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleResetToday
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-blue"
                      title="Reset to today"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Layout */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Layout
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setViewLayout(
                          "sideBySide",
                        )
                      }
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                        viewLayout ===
                        "sideBySide"
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                      Side-by-side
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setViewLayout(
                          "single",
                        )
                      }
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                        viewLayout ===
                        "single"
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Single
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          PERFORMANCE SUMMARY
          ======================================================= */}

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
        {/* Current TAT */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Current avg TAT
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight text-qc-navy">
              {formatTat(
                currentData.currentAvgTatMinutes,
                currentData.currentAvgTatHours,
              )}
            </span>

            <span className="text-[10px] font-semibold text-muted-foreground">
              {currentData.currentTotalVolume} exams
            </span>
          </div>
        </div>

        {/* Prior */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Prior avg TAT
          </p>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight text-qc-blue">
              {formatTat(
                currentData.priorAvgTatMinutes,
                currentData.priorAvgTatHours,
              )}
            </span>

            <span className="text-[10px] font-semibold text-muted-foreground">
              {currentData.priorTotalVolume} exams
            </span>
          </div>
        </div>

        {/* Delta */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Period change
          </p>

          <div className="mt-1 flex items-center gap-2">
            {currentData.pctChange !==
            0 ? (
              <>
                {currentData.pctChange <
                0 ? (
                  <TrendingDown className="h-4 w-4 text-qc-blue" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-qc-red" />
                )}

                <span
                  className={`text-xl font-extrabold ${
                    currentData.pctChange <
                    0
                      ? "text-qc-blue"
                      : "text-qc-red"
                  }`}
                >
                  {Math.abs(
                    currentData.pctChange,
                  )}
                  %
                </span>
              </>
            ) : (
              <span className="text-xl font-extrabold text-muted-foreground">
                —
              </span>
            )}
          </div>

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {currentData.pctChange <
            0
              ? "faster than prior"
              : currentData.pctChange >
                  0
                ? "slower than prior"
                : "no change"}
          </p>
        </div>

        {/* Window */}
        <div className="rounded-2xl border border-qc-yellow/20 bg-qc-yellow/10 p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Window
          </p>

          <p className="mt-1 text-sm font-extrabold text-qc-navy">
            {firstDay} – {lastDay}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {mode === "rolling"
              ? "Rolling 7 days"
              : "Mon–Sun"}
          </p>
        </div>
      </div>

      {/* =======================================================
          PERIOD LABELS
          ======================================================= */}

      <div className="flex flex-col gap-2 border-y border-border bg-background/60 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-qc-yellow" />

          <span className="font-extrabold text-qc-navy">
            Active period
          </span>

          <span className="text-muted-foreground">
            {firstDay} – {lastDay}
          </span>
        </div>

        {viewLayout ===
          "sideBySide" && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-qc-blue" />

            <span className="font-extrabold text-qc-navy">
              Prior baseline
            </span>

            <span className="text-muted-foreground">
              {priorFirstDay ||
                "—"}{" "}
              –{" "}
              {priorLastDay ||
                "—"}
            </span>
          </div>
        )}
      </div>

      {/* =======================================================
          TABLES
          ======================================================= */}

      <div className="px-4 pb-5 pt-4 sm:px-5">
        {viewLayout ===
        "sideBySide" ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Active */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-qc-yellow" />

                  <span className="text-sm font-extrabold text-qc-navy">
                    Active 7 days
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-muted-foreground">
                  {currentData.currentTotalVolume}{" "}
                  exams
                </span>
              </div>

              {renderTable(
                currentData.dayRows,
                false,
              )}
            </div>

            {/* Prior */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-qc-blue" />

                  <span className="text-sm font-extrabold text-qc-navy">
                    Prior 7 days
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-muted-foreground">
                  {currentData.priorTotalVolume}{" "}
                  exams
                </span>
              </div>

              {currentData.priorDayRows &&
              currentData.priorDayRows.length >
                0 ? (
                renderTable(
                  currentData.priorDayRows,
                  true,
                )
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Layers className="h-4 w-4" />
                    </div>

                    <p className="mt-3 text-sm font-extrabold text-qc-navy">
                      No prior data
                    </p>

                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      A preceding 7-day baseline is not
                      available for this period.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-qc-yellow" />

                <span className="text-sm font-extrabold text-qc-navy">
                  Active 7 days
                </span>
              </div>

              <span className="text-[10px] font-semibold text-muted-foreground">
                {currentData.currentTotalVolume}{" "}
                exams
              </span>
            </div>

            {renderTable(
              currentData.dayRows,
              false,
            )}
          </div>
        )}
      </div>

      {/* =======================================================
          FOOTER
          ======================================================= */}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[10px] font-semibold text-muted-foreground sm:px-5">
        <span>
          Modality:{" "}
          <strong className="text-qc-navy">
            {currentTabLabel}
          </strong>
        </span>

        <span>
          {mode === "rolling"
            ? "Rolling analysis"
            : "Static week analysis"}
        </span>
      </div>
    </section>
  );
}