"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { ModalityCode } from "@/lib/enums";
import { fetchSevenDayAnalyticsAction } from "@/app/actions";
import type { DashboardFilters } from "@/lib/dashboard-types";
import { toIsoDate } from "@/lib/kpi-range";

import {
  Calendar,
  Columns2,
  ChevronDown,
  Filter,
  Layers,
  Settings2,
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
  /** Dashboard filter bar: modality and the window's end date. */
  filters: DashboardFilters;
}

type AnalyticsMode = "rolling" | "static";

const MODALITY_TABS = [
  { key: "ALL", label: "All" },
  { key: ModalityCode.XRAY, label: "X-ray" },
  { key: ModalityCode.MAMMO, label: "Mammogram" },
  { key: ModalityCode.US, label: "Ultrasound" },
  { key: ModalityCode.CT, label: "CT" },
  { key: ModalityCode.MRI, label: "MRI" },
];

const CATEGORY_COLUMNS = [
  {
    key: "opdCount",
    letter: "O",
    label: "Outpatient",
    shortLabel: "OPD",
    headerClass: "bg-blue-50 text-blue-800",
    valueClass: "text-blue-800",
    totalClass: "bg-blue-50 text-blue-900",
  },
  {
    key: "inCount",
    letter: "I",
    label: "Inpatient",
    shortLabel: "IN",
    headerClass: "bg-indigo-50 text-indigo-800",
    valueClass: "text-indigo-800",
    totalClass: "bg-indigo-50 text-indigo-900",
  },
  {
    key: "erCount",
    letter: "E",
    label: "Emergency",
    shortLabel: "ER",
    headerClass: "bg-red-50 text-red-800",
    valueClass: "text-red-800",
    totalClass: "bg-red-50 text-red-900",
  },
] as const;

export function SevenDayTatTable({
  analytics: initialAnalytics,
  filters,
}: Props) {
  /* =========================================================
     UI state
  ========================================================= */

  // Modality comes from the dashboard filter bar.
  const activeTab: string = filters.modality;

  const [mode, setMode] =
    useState<AnalyticsMode>("rolling");

  // Off by default; shows the previous 7 days next to the current table.
  const [showPrevious, setShowPrevious] = useState(false);

  const [isOptionsOpen, setIsOptionsOpen] =
    useState(false);

  const optionsButtonRef =
    useRef<HTMLButtonElement>(null);

  const optionsPopoverRef =
    useRef<HTMLDivElement>(null);

  const [optionsPosition, setOptionsPosition] =
    useState({
      top: 0,
      left: 0,
      width: 360,
    });

  /* =========================================================
     Analytics: the 7 days ending on the filter bar's end date
  ========================================================= */

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const anchorDate = filters.isAllTime ? todayIso : filters.rangeEnd;
  const requestKey = `${anchorDate}|${mode}`;
  const isInitialRequest = requestKey === `${todayIso}|rolling`;

  const [fetched, setFetched] = useState<{
    key: string;
    data: Props["analytics"];
  } | null>(null);

  const [isTransitionPending, startTransition] = useTransition();

  useEffect(() => {
    if (isInitialRequest) return;

    let isCancelled = false;
    startTransition(async () => {
      try {
        const result = await fetchSevenDayAnalyticsAction(anchorDate, mode);
        if (!isCancelled) setFetched({ key: requestKey, data: result });
      } catch (error) {
        console.error(
          "Failed to fetch seven-day Turnaround Time analytics:",
          error,
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [initialAnalytics, isInitialRequest, anchorDate, mode, requestKey]);

  // Keep showing the last result while a new window loads.
  const analytics = isInitialRequest
    ? initialAnalytics
    : (fetched?.data ?? initialAnalytics);
  const isPending =
    isTransitionPending || (!isInitialRequest && fetched?.key !== requestKey);

  /* =========================================================
     Current modality data
  ========================================================= */

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] ?? analytics.all;

  const currentTabLabel =
    MODALITY_TABS.find((tab) => tab.key === activeTab)
      ?.label ?? "All";

  const modalityScopeLabel =
    activeTab === "ALL"
      ? "For all Modalities"
      : `${currentTabLabel} only`;

  const modeLabel =
    mode === "rolling" ? "Rolling 7 days" : "Monday–Sunday";

  /* =========================================================
     Date labels
  ========================================================= */

  const firstDay =
    currentData.dayRows[
      currentData.dayRows.length - 1
    ]?.formattedDate ?? "";

  const lastDay =
    currentData.dayRows[0]?.formattedDate ?? "";

  /* =========================================================
     Position options popover
  ========================================================= */

  const updateOptionsPosition = () => {
    if (!optionsButtonRef.current) return;

    const rect =
      optionsButtonRef.current.getBoundingClientRect();

    const padding = 12;
    const width = Math.min(
      360,
      window.innerWidth - padding * 2,
    );

    const left = Math.max(
      padding,
      Math.min(
        rect.right - width,
        window.innerWidth - width - padding,
      ),
    );

    setOptionsPosition({
      top: rect.bottom + 8,
      left,
      width,
    });
  };

  /* =========================================================
     Options popover listeners
  ========================================================= */

  useEffect(() => {
    if (!isOptionsOpen) return;

    updateOptionsPosition();

    const handleResize = () => updateOptionsPosition();
    const handleScroll = () => updateOptionsPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );
    };
  }, [isOptionsOpen]);

  useEffect(() => {
    if (!isOptionsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (optionsButtonRef.current?.contains(target)) {
        return;
      }

      if (optionsPopoverRef.current?.contains(target)) {
        return;
      }

      setIsOptionsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOptionsOpen]);

  /* =========================================================
     Format Turnaround Time
  ========================================================= */

  const formatTurnaroundTime = (
    _minutes: number,
    hours: number,
  ) => `${hours} hrs`;

  /* =========================================================
     Render table
  ========================================================= */

  const renderTable = (
    rows: DayRow[],
    isPrior = false,
  ) => {
    const totalVolume = rows.reduce(
      (sum, row) => sum + row.totalExams,
      0,
    );

    const totalFinalized = rows.reduce(
      (sum, row) => sum + row.finalizedCount,
      0,
    );

    const totalPending = rows.reduce(
      (sum, row) => sum + row.pendingCount,
      0,
    );

    const totalOutpatient = rows.reduce(
      (sum, row) => sum + row.opdCount,
      0,
    );

    const totalInpatient = rows.reduce(
      (sum, row) => sum + row.inCount,
      0,
    );

    const totalEmergency = rows.reduce(
      (sum, row) => sum + row.erCount,
      0,
    );

    const weightedTatNumerator = rows.reduce(
      (sum, row) =>
        sum +
        (row.finalizedCount > 0
          ? row.avgTatMinutes * row.finalizedCount
          : 0),
      0,
    );

    const weightedTat =
      totalFinalized > 0
        ? Math.round(
            weightedTatNumerator / totalFinalized,
          )
        : 0;

    const weightedTatHours =
      weightedTat >= 60
        ? Number((weightedTat / 60).toFixed(1))
        : 0;

    const categoryTotals = [
      totalOutpatient,
      totalInpatient,
      totalEmergency,
    ];

    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              {/* Main header */}
              <tr className="border-b border-border bg-background/70 text-[9px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 align-middle"
                >
                  Day
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Exams
                </th>

                <th
                  colSpan={3}
                  className="border-x border-border/70 px-3 py-2.5 text-center"
                >
                  <span className="block text-[10px] font-extrabold text-qc-navy">
                    Patient Category
                  </span>
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Signed
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Pending
                </th>

                <th
                  rowSpan={2}
                  className="min-w-[145px] whitespace-nowrap px-4 py-3 text-right align-middle"
                >
                  Avg. Turnaround Time
                </th>
              </tr>

              {/* Patient Category subheaders */}
              <tr className="border-b border-border bg-background/40">
                {CATEGORY_COLUMNS.map((category) => (
                  <th
                    key={category.key}
                    scope="col"
                    title={category.label}
                    aria-label={category.label}
                    className="min-w-[66px] px-2 py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`flex h-6 w-7 items-center justify-center rounded-md text-[10px] font-black ${category.headerClass}`}
                      >
                        {category.letter}
                      </span>

                      <span className="text-[8px] font-bold normal-case tracking-normal text-muted-foreground">
                        {category.shortLabel}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isToday = row.isoDate === todayIso;

                const isSlow =
                  row.finalizedCount > 0 &&
                  row.avgTatMinutes > 120;

                const categoryValues = [
                  row.opdCount,
                  row.inCount,
                  row.erCount,
                ];

                return (
                  <tr
                    key={`${row.isoDate}-${row.dayLabel}`}
                    className={`transition-colors ${
                      isToday
                        ? "bg-qc-yellow/10"
                        : "hover:bg-qc-blue/[0.025]"
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

                    {/* Total examinations */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-navy">
                        {row.totalExams}
                      </span>
                    </td>

                    {/* Category counts */}
                    {CATEGORY_COLUMNS.map((category, index) => (
                      <td
                        key={category.key}
                        className="px-2 py-3 text-center"
                        title={`${category.label}: ${categoryValues[index]}`}
                      >
                        <span
                          className={`inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 text-xs font-extrabold tabular-nums ${category.valueClass}`}
                        >
                          {categoryValues[index]}
                        </span>
                      </td>
                    ))}

                    {/* Signed */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-blue">
                        {row.finalizedCount}
                      </span>
                    </td>

                    {/* Pending */}
                    <td className="px-3 py-3 text-center">
                      {row.pendingCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-extrabold text-qc-orange">
                          {row.pendingCount}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>

                    {/* Average Turnaround Time */}
                    <td className="px-4 py-3 text-right">
                      {row.finalizedCount === 0 ? (
                        <span className="text-[10px] font-medium text-muted-foreground/40">
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
                          {formatTurnaroundTime(
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

            {/* Totals */}
            <tfoot className="border-t border-border bg-background/70">
              <tr>
                <td className="px-4 py-3">
                  <span className="text-xs font-extrabold text-qc-navy">
                    Total
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-navy">
                    {totalVolume}
                  </span>
                </td>

                {categoryTotals.map((total, index) => (
                  <td
                    key={CATEGORY_COLUMNS[index].key}
                    className="px-2 py-3 text-center"
                  >
                    <span
                      className={`inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 text-xs font-extrabold tabular-nums ${CATEGORY_COLUMNS[index].totalClass}`}
                    >
                      {total}
                    </span>
                  </td>
                ))}

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-blue">
                    {totalFinalized}
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  {totalPending > 0 ? (
                    <span className="text-xs font-extrabold text-qc-orange">
                      {totalPending}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">
                      —
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      isPrior ? "text-qc-blue" : "text-qc-navy"
                    }`}
                  >
                    {weightedTat > 0
                      ? `${weightedTatHours} hrs`
                      : "—"}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  /* =========================================================
     Options popover
  ========================================================= */

  const optionsPopover = isOptionsOpen ? (
    <div
      ref={optionsPopoverRef}
      role="dialog"
      aria-label="Table options"
      style={{
        position: "fixed",
        top: optionsPosition.top,
        left: optionsPosition.left,
        width: optionsPosition.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5 text-qc-blue" />

          <span className="text-sm font-extrabold text-qc-navy">
            Options
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOptionsOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
          aria-label="Close options"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Time mode */}
        <div>
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Time mode
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMode("rolling");
                setIsOptionsOpen(false);
              }}
              className={`rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                mode === "rolling"
                  ? "bg-qc-blue text-white"
                  : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
              }`}
            >
              Rolling 7 days
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("static");
                setIsOptionsOpen(false);
              }}
              className={`rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                mode === "static"
                  ? "bg-qc-blue text-white"
                  : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
              }`}
            >
              Monday–Sunday
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  /* =========================================================
     Return
  ========================================================= */

  return (
    <div className="min-w-0">
      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Date navigation and selected modality */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-1.5">
              <div className="flex min-w-0 items-center gap-2 rounded-xl bg-background px-3 py-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-qc-blue" />

                <span className="whitespace-nowrap text-[11px] font-extrabold text-qc-navy">
                  {firstDay} – {lastDay}
                </span>
              </div>

              {isPending && (
                <span className="ml-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-qc-yellow" />
              )}
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${
                activeTab === "ALL"
                  ? "border-qc-blue/10 bg-qc-blue/[0.06] text-qc-blue"
                  : "border-qc-yellow/40 bg-qc-yellow/15 text-qc-navy"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {modalityScopeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Compare with the previous 7 days */}
          <button
            type="button"
            onClick={() => setShowPrevious((previous) => !previous)}
            aria-pressed={showPrevious}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
              showPrevious
                ? "border-qc-blue bg-qc-blue text-white"
                : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
            }`}
          >
            <Columns2
              className={`h-3.5 w-3.5 ${
                showPrevious ? "text-qc-yellow" : "text-qc-blue"
              }`}
            />
            {showPrevious ? "Hide previous 7 days" : "Compare previous 7 days"}
          </button>

          {/* Options */}
          <button
            ref={optionsButtonRef}
            type="button"
            onClick={() =>
              setIsOptionsOpen((previous) => !previous)
            }
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
              isOptionsOpen
                ? "border-qc-navy bg-qc-navy text-white"
                : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
            }`}
            aria-expanded={isOptionsOpen}
            aria-haspopup="dialog"
          >
            <Filter
              className={`h-3.5 w-3.5 ${
                isOptionsOpen
                  ? "text-qc-yellow"
                  : "text-qc-blue"
              }`}
            />

            <span>{modeLabel}</span>

            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOptionsOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          </div>
        </div>
      </div>

      {/* Options menu portal */}
      {typeof document !== "undefined" &&
        isOptionsOpen &&
        createPortal(optionsPopover, document.body)}

      {/* Current table, optionally beside the previous 7 days */}
      <div className="px-4 pb-5 pt-4 sm:px-5">
        <div
          className={`grid grid-cols-1 gap-5 ${
            showPrevious ? "xl:grid-cols-2" : ""
          }`}
        >
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-qc-yellow" />
                <span className="text-sm font-extrabold text-qc-navy">
                  Current
                </span>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {currentData.currentTotalVolume} exams
              </span>
            </div>

            {renderTable(currentData.dayRows)}
          </div>

          {showPrevious && (
            <div className="min-w-0 space-y-2.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-qc-blue" />
                  <span className="text-sm font-extrabold text-qc-navy">
                    Previous 7 days
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {currentData.priorTotalVolume} exams
                </span>
              </div>

              {currentData.priorDayRows &&
              currentData.priorDayRows.length > 0 ? (
                renderTable(currentData.priorDayRows, true)
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Layers className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-qc-navy">
                      No previous data
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      There is no earlier seven-day period to compare with.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}