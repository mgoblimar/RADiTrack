"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { createPortal } from "react-dom";

import {
  ResponsiveContainer,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Filter,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

import {
  fetchModalityTatCustomRangeAction,
  type ModalityTatOverviewItem,
  type MultiPeriodModalityTatOverview,
  type ModalityTemporalPeriod,
} from "@/app/actions";

interface Props {
  data?:
    | ModalityTatOverviewItem[]
    | MultiPeriodModalityTatOverview;
}

type ExtendedTemporalPeriod =
  | ModalityTemporalPeriod
  | "CUSTOM";

type UrgencyFilter =
  | "ALL"
  | "EMERGENCY"
  | "ROUTINE";

/* =========================================================
   RADiTrack palette
========================================================= */

const QC_NAVY = "#050E40";
const QC_BLUE = "#18298C";
const QC_YELLOW = "#F2CB49";
const QC_RED = "#A60808";
const QC_MUTED = "#94A3B8";
const QC_GRID = "#E2E8F0";
const QC_EMPTY = "#CBD5E1";

export function TatOverviewChart({
  data,
}: Props) {
  const [temporalPeriod, setTemporalPeriod] =
    useState<ExtendedTemporalPeriod>("ALL");

  const [urgencyFilter, setUrgencyFilter] =
    useState<UrgencyFilter>("ALL");

  const [isFilterOpen, setIsFilterOpen] =
    useState(false);

  const filterButtonRef =
    useRef<HTMLButtonElement>(null);

  const filterPopoverRef =
    useRef<HTMLDivElement>(null);

  const [filterPosition, setFilterPosition] =
    useState({
      top: 0,
      left: 0,
    });

  /* =========================================================
     Date state
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

  const [customStartDate, setCustomStartDate] =
    useState(defaultStartIso);

  const [customEndDate, setCustomEndDate] =
    useState(todayIso);

  const [customDataset, setCustomDataset] =
    useState<ModalityTatOverviewItem[] | null>(
      null,
    );

  const [isPending, startTransition] =
    useTransition();

  /* =========================================================
     Position filter popover
  ========================================================= */

  const updateFilterPosition = () => {
    if (!filterButtonRef.current) {
      return;
    }

    const rect =
      filterButtonRef.current.getBoundingClientRect();

    const width = 320;
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

    setFilterPosition({
      top: rect.bottom + 8,
      left,
    });
  };

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    updateFilterPosition();

    const handleResize = () => {
      updateFilterPosition();
    };

    const handleScroll = () => {
      updateFilterPosition();
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
  }, [isFilterOpen]);

  /* =========================================================
     Close filter popover
  ========================================================= */

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        filterButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      if (
        filterPopoverRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsFilterOpen(false);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
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
  }, [isFilterOpen]);

  /* =========================================================
     Custom range
  ========================================================= */

  const handleFetchCustomRange = (
    start: string,
    end: string,
  ) => {
    if (
      !start ||
      !end ||
      start > end
    ) {
      return;
    }

    setCustomStartDate(start);
    setCustomEndDate(end);
    setTemporalPeriod("CUSTOM");

    startTransition(async () => {
      try {
        const result =
          await fetchModalityTatCustomRangeAction(
            start,
            end,
          );

        setCustomDataset(result);
      } catch (error) {
        console.error(
          "Failed to fetch custom modality TAT range:",
          error,
        );
      }
    });
  };

  /* =========================================================
     Resolve dataset
  ========================================================= */

  let activeDataset: ModalityTatOverviewItem[] =
    [];

  if (
    temporalPeriod === "CUSTOM" &&
    customDataset
  ) {
    activeDataset = customDataset;
  } else if (data) {
    if (
      "periods" in data &&
      data.periods
    ) {
      const key =
        temporalPeriod === "CUSTOM"
          ? "ALL"
          : temporalPeriod;

      activeDataset =
        data.periods[key] ??
        data.periods.ALL ??
        [];
    } else if (Array.isArray(data)) {
      activeDataset = data;
    }
  }

  /* =========================================================
     Display data
  ========================================================= */

  const displayData =
    activeDataset.map((item) => {
      const stats =
        urgencyFilter === "EMERGENCY"
          ? item.emergency
          : urgencyFilter === "ROUTINE"
            ? item.routine
            : item.all;

      return {
        modality: item.modality,
        name: item.name,
        avgTat: stats.avgTat,
        target: stats.target,
        volume: stats.volume,
      };
    });

  const isFiltered =
    temporalPeriod !== "ALL" ||
    urgencyFilter !== "ALL";

  const handleResetFilters = () => {
    setTemporalPeriod("ALL");
    setUrgencyFilter("ALL");
    setIsFilterOpen(false);
  };

  const temporalLabels: Record<
    ExtendedTemporalPeriod,
    string
  > = {
    ALL: "All time",
    "7D": "Past 7 days",
    MONTH: "This month",
    YEAR: "This year",
    CUSTOM: "Custom range",
  };

  /* =========================================================
     Tooltip
  ========================================================= */

  const ChartTooltip = ({
    active,
    payload,
  }: any) => {
    if (
      !active ||
      !payload ||
      payload.length === 0
    ) {
      return null;
    }

    const point =
      payload[0]?.payload;

    if (!point) {
      return null;
    }

    const isBreach =
      point.volume > 0 &&
      point.avgTat > point.target;

    return (
      <div className="min-w-[190px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_14px_35px_rgba(5,14,64,0.14)]">
        <p className="font-extrabold text-qc-navy">
          {point.name ||
            point.modality}
        </p>

        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">

          <div className="flex items-center justify-between gap-5">
            <span className="text-muted-foreground">
              TAT
            </span>

            <strong
              className={
                isBreach
                  ? "text-qc-red"
                  : "text-qc-blue"
              }
            >
              {point.avgTat}m
            </strong>
          </div>

          <div className="flex items-center justify-between gap-5">
            <span className="text-muted-foreground">
              Target
            </span>

            <strong className="text-qc-navy">
              {point.target}m
            </strong>
          </div>

          <div className="flex items-center justify-between gap-5">
            <span className="text-muted-foreground">
              Finalized
            </span>

            <strong className="text-qc-navy">
              {point.volume}
            </strong>
          </div>

          <div className="border-t border-border pt-2">
            <span
              className={
                point.volume === 0
                  ? "font-bold text-muted-foreground"
                  : isBreach
                    ? "font-extrabold text-qc-red"
                    : "font-extrabold text-qc-blue"
              }
            >
              {point.volume === 0
                ? "No finalized scans"
                : isBreach
                  ? "Above SLA"
                  : "Within SLA"}
            </span>
          </div>

        </div>
      </div>
    );
  };

  /* =========================================================
     Filter popover
  ========================================================= */

  const filterPopover =
    isFilterOpen ? (
      <div
        ref={filterPopoverRef}
        role="dialog"
        aria-label="Chart filters"
        style={{
          position: "fixed",
          top: filterPosition.top,
          left: filterPosition.left,
          width: 320,
          zIndex: 9999,
        }}
        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">

          <span className="text-sm font-extrabold text-qc-navy">
            Filters
          </span>

          <button
            type="button"
            onClick={() =>
              setIsFilterOpen(false)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
            aria-label="Close filters"
          >
            <X className="h-3.5 w-3.5" />
          </button>

        </div>

        <div className="space-y-4 p-4">

          {/* Time */}
          <div>

            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Time
            </div>

            <div className="grid grid-cols-2 gap-1.5">

              {(
                [
                  "ALL",
                  "7D",
                  "MONTH",
                  "YEAR",
                ] as ExtendedTemporalPeriod[]
              ).map((period) => {
                const isActive =
                  temporalPeriod ===
                  period;

                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() =>
                      setTemporalPeriod(
                        period,
                      )
                    }
                    className={`flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                      isActive
                        ? "bg-qc-yellow text-qc-navy"
                        : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                    }`}
                  >
                    <span>
                      {
                        temporalLabels[
                          period
                        ]
                      }
                    </span>

                    {isActive && (
                      <Check className="h-3 w-3" />
                    )}
                  </button>
                );
              })}

            </div>

            <button
              type="button"
              onClick={() => {
                setTemporalPeriod(
                  "CUSTOM",
                );

                if (!customDataset) {
                  handleFetchCustomRange(
                    customStartDate,
                    customEndDate,
                  );
                }
              }}
              className={`mt-1.5 flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                temporalPeriod ===
                "CUSTOM"
                  ? "bg-qc-blue text-white"
                  : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
              }`}
            >
              <span>
                Custom range
              </span>

              {temporalPeriod ===
                "CUSTOM" && (
                <Check className="h-3 w-3" />
              )}
            </button>

            {temporalPeriod ===
              "CUSTOM" && (
              <div className="mt-2 rounded-xl bg-background p-2.5">

                <div className="grid grid-cols-2 gap-2">

                  <label className="space-y-1">

                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      From
                    </span>

                    <input
                      type="date"
                      value={
                        customStartDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomStartDate(
                          event.target
                            .value,
                        )
                      }
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
                    />

                  </label>

                  <label className="space-y-1">

                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      To
                    </span>

                    <input
                      type="date"
                      value={
                        customEndDate
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomEndDate(
                          event.target
                            .value,
                        )
                      }
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
                    />

                  </label>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleFetchCustomRange(
                      customStartDate,
                      customEndDate,
                    )
                  }
                  disabled={
                    isPending ||
                    !customStartDate ||
                    !customEndDate ||
                    customStartDate >
                      customEndDate
                  }
                  className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-qc-yellow text-[10px] font-extrabold text-qc-navy transition-opacity disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Calendar className="h-3 w-3" />
                  )}

                  Apply
                </button>

              </div>
            )}

          </div>

          {/* Priority */}
          <div className="border-t border-border pt-4">

            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Priority
            </div>

            <div className="grid grid-cols-3 gap-1.5">

              {(
                [
                  "ALL",
                  "EMERGENCY",
                  "ROUTINE",
                ] as const
              ).map((urgency) => {
                const isActive =
                  urgencyFilter ===
                  urgency;

                return (
                  <button
                    key={urgency}
                    type="button"
                    onClick={() =>
                      setUrgencyFilter(
                        urgency,
                      )
                    }
                    className={`rounded-xl px-2 py-2.5 text-[10px] font-bold transition-colors ${
                      isActive
                        ? "bg-qc-blue text-white"
                        : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                    }`}
                  >
                    {urgency === "ALL"
                      ? "All"
                      : urgency ===
                          "EMERGENCY"
                        ? "STAT / ER"
                        : "Routine"}
                  </button>
                );
              })}

            </div>

          </div>

          {/* Reset */}
          {isFiltered && (
            <button
              type="button"
              onClick={
                handleResetFilters
              }
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-[10px] font-extrabold text-muted-foreground transition-colors hover:bg-qc-blue/5 hover:text-qc-blue"
            >
              <RotateCcw className="h-3 w-3" />
              Reset filters
            </button>
          )}

        </div>

      </div>
    ) : null;

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#DDE3F2] bg-card shadow-[0_4px_18px_rgba(24,41,140,0.05)]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-5 sm:px-6">

        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

        <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

        <div className="relative flex items-center justify-between gap-4">

          {/* Title */}
          <div className="flex items-center gap-3.5">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow shadow-[0_5px_14px_rgba(5,14,64,0.12)]">
              <BarChart3 className="h-5 w-5" />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-qc-navy">
              TAT BY MODALITY
            </h2>

          </div>

          {/* Filter */}
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() =>
              setIsFilterOpen(
                (previous) =>
                  !previous,
              )
            }
            className={`group inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-extrabold shadow-sm transition-all ${
              isFilterOpen
                ? "border-qc-navy bg-qc-navy text-white shadow-[0_6px_14px_rgba(5,14,64,0.12)]"
                : isFiltered
                  ? "border-qc-blue/15 bg-white/80 text-qc-blue hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
                  : "border-white/80 bg-white/75 text-qc-navy hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
            }`}
            aria-expanded={
              isFilterOpen
            }
            aria-haspopup="dialog"
          >

            <Filter
              className={`h-3.5 w-3.5 transition-colors ${
                isFilterOpen
                  ? "text-qc-yellow"
                  : "text-qc-blue"
              }`}
            />

            <span>
              Filter
            </span>

            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isFilterOpen
                  ? "rotate-180"
                  : ""
              }`}
            />

          </button>

        </div>
      </div>

      {/* Filter portal */}
      {typeof document !==
        "undefined" &&
        isFilterOpen &&
        createPortal(
          filterPopover,
          document.body,
        )}

      {/* Chart */}
      <div className="px-4 py-5 sm:px-5 sm:py-6">

        {displayData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background">

            <p className="text-sm font-extrabold text-qc-navy">
              No modality data
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              No finalized scans match
              this filter.
            </p>

          </div>
        ) : (
          <div className="h-[270px] w-full sm:h-[300px]">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <ComposedChart
                data={displayData}
                margin={{
                  top: 8,
                  right: 8,
                  left: -10,
                  bottom: 0,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={QC_GRID}
                  vertical={false}
                />

                <XAxis
                  dataKey="modality"
                  stroke={QC_MUTED}
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={7}
                />

                <YAxis
                  stroke={QC_MUTED}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(value) =>
                    `${value}m`
                  }
                />

                <Tooltip
                  content={
                    <ChartTooltip />
                  }
                  cursor={{
                    fill: "rgba(24, 41, 140, 0.04)",
                  }}
                />

                <Bar
                  dataKey="avgTat"
                  name="Actual TAT"
                  fill={QC_BLUE}
                  radius={[
                    8,
                    8,
                    2,
                    2,
                  ]}
                  maxBarSize={52}
                >

                  {displayData.map(
                    (
                      item,
                      index,
                    ) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          item.volume ===
                          0
                            ? QC_EMPTY
                            : item.avgTat >
                                item.target
                              ? QC_RED
                              : QC_BLUE
                        }
                      />
                    ),
                  )}

                </Bar>

                <Line
                  type="monotone"
                  dataKey="target"
                  name="SLA target"
                  stroke={QC_YELLOW}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: QC_YELLOW,
                    stroke: "#FFFFFF",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 4,
                    fill: QC_YELLOW,
                    stroke: QC_NAVY,
                    strokeWidth: 1.5,
                  }}
                />

              </ComposedChart>
            </ResponsiveContainer>

          </div>
        )}

      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border px-4 py-3 text-[10px] font-semibold text-muted-foreground">

        <span className="flex items-center gap-1.5">

          <span className="h-2.5 w-2.5 rounded-sm bg-qc-blue" />

          Actual TAT

        </span>

        <span className="flex items-center gap-1.5">

          <span
            className="h-0.5 w-4 rounded-full"
            style={{
              backgroundColor:
                QC_YELLOW,
            }}
          />

          SLA target

        </span>

        <span className="flex items-center gap-1.5">

          <span className="h-2.5 w-2.5 rounded-sm bg-qc-red" />

          Above target

        </span>

      </div>

    </section>
  );
}