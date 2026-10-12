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
  /* =========================================================
     UI state
  ========================================================= */

  const [activeTab, setActiveTab] =
    useState<string>("ALL");

  const [mode, setMode] =
    useState<AnalyticsMode>("rolling");

  const [viewLayout, setViewLayout] =
    useState<ViewLayout>("sideBySide");

  const [isOptionsOpen, setIsOptionsOpen] =
    useState(false);

  const optionsButtonRef =
    useRef<HTMLButtonElement>(null);

  const optionsPopoverRef =
    useRef<HTMLDivElement>(null);

  const [
    optionsPosition,
    setOptionsPosition,
  ] = useState({
    top: 0,
    left: 0,
  });

  /* =========================================================
     Today's date
  ========================================================= */

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

  /* =========================================================
     Analytics state
  ========================================================= */

  const [anchorDate, setAnchorDate] =
    useState<string>(
      initialAnalytics.all
        .anchorFormatted || todayIso,
    );

  const [analytics, setAnalytics] =
    useState(initialAnalytics);

  const [isPending, startTransition] =
    useTransition();

  /* =========================================================
     Current modality data
  ========================================================= */

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] ??
        analytics.all;

  /* =========================================================
     Modality choices
  ========================================================= */

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

  /* =========================================================
     Date labels
  ========================================================= */

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

  /* =========================================================
     Position options popover
  ========================================================= */

  const updateOptionsPosition = () => {
    if (!optionsButtonRef.current) {
      return;
    }

    const rect =
      optionsButtonRef.current.getBoundingClientRect();

    const width = 360;
    const padding = 12;

    let left =
      rect.right - width;

    left = Math.max(
      padding,
      Math.min(
        left,
        window.innerWidth -
          width -
          padding,
      ),
    );

    setOptionsPosition({
      top: rect.bottom + 8,
      left,
    });
  };

  /* =========================================================
     Options popover listeners
  ========================================================= */

  useEffect(() => {
    if (!isOptionsOpen) {
      return;
    }

    updateOptionsPosition();

    const handleResize = () => {
      updateOptionsPosition();
    };

    const handleScroll = () => {
      updateOptionsPosition();
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );
    };
  }, [isOptionsOpen]);

  useEffect(() => {
    if (!isOptionsOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        optionsButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      if (
        optionsPopoverRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsOptionsOpen(false);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

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

  /* =========================================================
     Fetch analytics
  ========================================================= */

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

  /* =========================================================
     Move anchor by 7 days
  ========================================================= */

  const stepAnchor = (
    days: number,
  ) => {
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

    const year =
      date.getFullYear();

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

  /* =========================================================
     Reset anchor
  ========================================================= */

  const handleResetToday = () => {
    handleFetch(
      todayIso,
      mode,
    );
  };

  /* =========================================================
     Format TAT
  ========================================================= */

  const formatTat = (
    minutes: number,
    hours: number,
  ) => {
    if (hours >= 1) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  };

  /* =========================================================
     Render table
  ========================================================= */

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

    const weightedTatNumerator =
      rows.reduce(
        (sum, row) =>
          sum +
          (row.finalizedCount > 0
            ? row.avgTatMinutes *
              row.finalizedCount
            : 0),
        0,
      );

    const weightedTat =
      totalFinalized > 0
        ? Math.round(
            weightedTatNumerator /
              totalFinalized,
          )
        : 0;

    const weightedTatHours =
      weightedTat >= 60
        ? Number(
            (
              weightedTat / 60
            ).toFixed(1),
          )
        : 0;

    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] text-left">
            <thead className="border-b border-border bg-background/70">
              <tr className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-3">
                  Day
                </th>

                <th className="px-3 py-3 text-center">
                  Exams
                </th>

                <th className="px-3 py-3 text-center">
                  Priority
                </th>

                <th className="px-3 py-3 text-center">
                  Signed
                </th>

                <th className="px-3 py-3 text-center">
                  Pending
                </th>

                <th className="px-4 py-3 text-right">
                  TAT
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

                    {/* Exams */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-navy">
                        {row.totalExams}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-3 text-center">
                      <div
                        className="inline-flex items-center gap-1 text-[9px] font-bold"
                        title={`OPD ${row.opdCount} · IN ${row.inCount} · ER ${row.erCount}`}
                      >
                        <span className="text-qc-blue">
                          {row.opdCount}
                        </span>

                        <span className="text-border">
                          ·
                        </span>

                        <span className="text-qc-blue">
                          {row.inCount}
                        </span>

                        <span className="text-border">
                          ·
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
                      {row.pendingCount >
                      0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-extrabold text-qc-orange">
                          {row.pendingCount}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>

                    {/* TAT */}
                    <td className="px-4 py-3 text-right">
                      {row.finalizedCount ===
                      0 ? (
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

            {/* Total */}
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

                <td className="px-3 py-3 text-center">
                  <span className="text-[9px] text-muted-foreground/60">
                    —
                  </span>
                </td>

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
                      isPrior
                        ? "text-qc-blue"
                        : "text-qc-navy"
                    }`}
                  >
                    {weightedTat > 0
                      ? weightedTatHours >=
                        1
                        ? `${weightedTatHours}h`
                        : `${weightedTat}m`
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

  const optionsPopover =
    isOptionsOpen ? (
      <div
        ref={optionsPopoverRef}
        role="dialog"
        aria-label="Table options"
        style={{
          position: "fixed",
          top: optionsPosition.top,
          left: optionsPosition.left,
          width: 360,
          zIndex: 9999,
        }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-qc-blue" />

            <span className="text-sm font-extrabold text-qc-navy">
              Options
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsOptionsOpen(false)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
            aria-label="Close options"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
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
                  onClick={() => {
                    setActiveTab(
                      tab.key,
                    );
                    setIsOptionsOpen(
                      false,
                    );
                  }}
                  className={`flex items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-colors ${
                    activeTab === tab.key
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

          {/* Time mode */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Time mode
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleFetch(
                    anchorDate,
                    "rolling",
                  );
                  setIsOptionsOpen(
                    false,
                  );
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
                  handleFetch(
                    anchorDate,
                    "static",
                  );
                  setIsOptionsOpen(
                    false,
                  );
                }}
                className={`rounded-xl px-2.5 py-2.5 text-[10px] font-bold transition-colors ${
                  mode === "static"
                    ? "bg-qc-blue text-white"
                    : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                }`}
              >
                Mon–Sun
              </button>
            </div>
          </div>

          {/* Layout */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Layout
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setViewLayout(
                    "sideBySide",
                  );
                  setIsOptionsOpen(
                    false,
                  );
                }}
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
                onClick={() => {
                  setViewLayout(
                    "single",
                  );
                  setIsOptionsOpen(
                    false,
                  );
                }}
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
      </div>
    ) : null;

  /* =========================================================
     Return
  ========================================================= */

  return (
    <div className="min-w-0">
      {/* =====================================================
          COMPACT CONTROLS
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        {/* Date navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              stepAnchor(-7)
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-50"
            title="Previous 7 days"
            aria-label="Previous 7 days"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
            <Calendar className="h-3.5 w-3.5 text-qc-blue" />

            <span className="text-[11px] font-extrabold text-qc-navy">
              {firstDay} –{" "}
              {lastDay}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              stepAnchor(7)
            }
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-50"
            title="Next 7 days"
            aria-label="Next 7 days"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={
              handleResetToday
            }
            disabled={isPending}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-blue disabled:opacity-50"
            title="Reset to today"
            aria-label="Reset to today"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {isPending && (
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-qc-yellow" />
          )}
        </div>

        {/* Options */}
        <button
          ref={optionsButtonRef}
          type="button"
          onClick={() =>
            setIsOptionsOpen(
              (previous) =>
                !previous,
            )
          }
          className={`inline-flex h-9 items-center gap-2 self-start rounded-xl border px-3 text-xs font-extrabold transition-all sm:self-auto ${
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

          <span>
            {currentTabLabel}
          </span>

          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              isOptionsOpen
                ? "rotate-180"
                : ""
            }`}
          />
        </button>
      </div>

      {/* Portal options menu */}
      {typeof document !==
        "undefined" &&
        isOptionsOpen &&
        createPortal(
          optionsPopover,
          document.body,
        )}

      {/* =====================================================
          TABLES
      ===================================================== */}

      <div className="px-4 pb-5 pt-4 sm:px-5">
        {viewLayout ===
        "sideBySide" ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Current */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-qc-yellow" />

                  <span className="text-sm font-extrabold text-qc-navy">
                    Current
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
                  <span className="h-2 w-2 rounded-full bg-qc-blue" />

                  <span className="text-sm font-extrabold text-qc-navy">
                    Prior
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
                      A previous 7-day
                      baseline is not
                      available.
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
                <span className="h-2 w-2 rounded-full bg-qc-yellow" />

                <span className="text-sm font-extrabold text-qc-navy">
                  Current
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
    </div>
  );
}