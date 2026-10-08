"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  ResponsiveContainer,
  Bar,
  BarChart,
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
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Filter,
  RotateCcw,
  X,
  Zap,
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

// =========================================================
// RADiTrack chart palette
// =========================================================

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
  // =========================================================
  // Filter state
  // =========================================================

  const [temporalPeriod, setTemporalPeriod] =
    useState<ExtendedTemporalPeriod>("ALL");

  const [urgencyFilter, setUrgencyFilter] =
    useState<UrgencyFilter>("ALL");

  const [isFilterOpen, setIsFilterOpen] =
    useState(false);

  const filterDropdownRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // Date state
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

  // =========================================================
  // Close filter popover
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
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
  }, [isFilterOpen]);

  // =========================================================
  // Custom range fetch
  // =========================================================

  const handleFetchCustomRange = (
    start: string,
    end: string,
  ) => {
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

  // =========================================================
  // Resolve active dataset
  // =========================================================

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

  // =========================================================
  // Resolve modality statistics
  // =========================================================

  const displayData = activeDataset.map(
    (item) => {
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
    },
  );

  // =========================================================
  // Summary metrics
  // =========================================================

  const totalVolume =
    displayData.reduce(
      (sum, item) =>
        sum + item.volume,
      0,
    );

  const modalitiesWithScans =
    displayData.filter(
      (item) => item.volume > 0,
    );

  const breachedCount =
    modalitiesWithScans.filter(
      (item) =>
        item.avgTat > item.target,
    ).length;

  const fastest =
    modalitiesWithScans.length > 0
      ? [...modalitiesWithScans].sort(
          (a, b) =>
            a.avgTat - b.avgTat,
        )[0]
      : null;

  // =========================================================
  // Labels
  // =========================================================

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

  const urgencyLabels: Record<
    UrgencyFilter,
    string
  > = {
    ALL: "All scans",
    EMERGENCY: "STAT / ER",
    ROUTINE: "Routine",
  };

  const isFiltered =
    temporalPeriod !== "ALL" ||
    urgencyFilter !== "ALL";

  // =========================================================
  // Reset filters
  // =========================================================

  const handleResetFilters = () => {
    setTemporalPeriod("ALL");
    setUrgencyFilter("ALL");
    setIsFilterOpen(false);
  };

  // =========================================================
  // Bar colors
  // =========================================================

  const getBarColor = (
    volume: number,
    avgTat: number,
    target: number,
  ) => {
    if (volume === 0) {
      return QC_EMPTY;
    }

    if (avgTat > target) {
      return QC_RED;
    }

    return QC_BLUE;
  };

  // =========================================================
  // Custom tooltip
  // =========================================================

  const ChartTooltip = ({
    active,
    payload,
    label,
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
      <div className="min-w-[210px] rounded-2xl border border-border bg-white p-3.5 text-xs shadow-[0_14px_35px_rgba(5,14,64,0.14)]">
        <div className="border-b border-border pb-2">
          <p className="font-extrabold text-qc-navy">
            {point.name || label}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {point.modality}
          </p>
        </div>

        <div className="space-y-2 pt-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              Average TAT
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

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              SLA target
            </span>

            <strong className="text-qc-navy">
              {point.target}m
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">
              Finalized
            </span>

            <strong className="text-qc-navy">
              {point.volume}
            </strong>
          </div>

          <div className="border-t border-border pt-2">
            {point.volume === 0 ? (
              <span className="font-bold text-muted-foreground">
                No finalized scans
              </span>
            ) : isBreach ? (
              <span className="font-extrabold text-qc-red">
                Above SLA target
              </span>
            ) : (
              <span className="font-extrabold text-qc-blue">
                Within SLA
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {/* =======================================================
          HEADER
          ======================================================= */}

      <div className="border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
              <BarChart3 className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-qc-navy sm:text-lg">
                  TAT by modality
                </h2>

                <span className="rounded-full bg-qc-blue/5 px-2 py-0.5 text-[9px] font-extrabold text-qc-blue">
                  SLA comparison
                </span>

                {isPending && (
                  <span className="rounded-full bg-qc-yellow/20 px-2 py-0.5 text-[9px] font-extrabold text-qc-navy">
                    Updating…
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Average report turnaround against
                target.
              </p>
            </div>
          </div>

          {/* Filter controls */}
          <div
            ref={filterDropdownRef}
            className="relative shrink-0"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setIsFilterOpen(
                    (previous) =>
                      !previous,
                  )
                }
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition-all ${
                  isFilterOpen
                    ? "border-qc-navy bg-qc-navy text-white"
                    : isFiltered
                      ? "border-qc-blue/20 bg-qc-blue/5 text-qc-blue"
                      : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
                }`}
                aria-expanded={
                  isFilterOpen
                }
                aria-haspopup="dialog"
              >
                <Filter
                  className={`h-3.5 w-3.5 ${
                    isFilterOpen
                      ? "text-qc-yellow"
                      : isFiltered
                        ? "text-qc-blue"
                        : "text-muted-foreground"
                  }`}
                />

                <span>Filters</span>

                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isFilterOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {isFiltered && (
                <button
                  type="button"
                  onClick={
                    handleResetFilters
                  }
                  title="Reset chart filters"
                  aria-label="Reset chart filters"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ===================================================
                FILTER POPOVER
                =================================================== */}

            {isFilterOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-qc-blue" />

                    <span className="text-sm font-extrabold text-qc-navy">
                      Chart filters
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsFilterOpen(
                        false,
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                    aria-label="Close filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  {/* Time */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-qc-blue" />

                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Time window
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          "ALL",
                          "7D",
                          "MONTH",
                          "YEAR",
                        ] as ExtendedTemporalPeriod[]
                      ).map(
                        (period) => (
                          <button
                            key={period}
                            type="button"
                            onClick={() =>
                              setTemporalPeriod(
                                period,
                              )
                            }
                            className={`flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                              temporalPeriod ===
                              period
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

                            {temporalPeriod ===
                              period && (
                              <Check className="h-3 w-3" />
                            )}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Custom */}
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !customDataset
                        ) {
                          handleFetchCustomRange(
                            customStartDate,
                            customEndDate,
                          );
                        } else {
                          setTemporalPeriod(
                            "CUSTOM",
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
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Custom range
                      </span>

                      {temporalPeriod ===
                        "CUSTOM" && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>

                    {temporalPeriod ===
                      "CUSTOM" && (
                      <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-background p-2.5">
                        <label className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                            From
                          </span>

                          <input
                            type="date"
                            value={
                              customStartDate
                            }
                            onChange={(event) =>
                              handleFetchCustomRange(
                                event.target
                                  .value,
                                customEndDate,
                              )
                            }
                            className="h-9 w-full rounded-xl border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
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
                            onChange={(event) =>
                              handleFetchCustomRange(
                                customStartDate,
                                event.target
                                  .value,
                              )
                            }
                            className="h-9 w-full rounded-xl border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Urgency */}
                  <div className="border-t border-border pt-4">
                    <div className="mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-qc-blue" />

                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Priority
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          "ALL",
                          "EMERGENCY",
                          "ROUTINE",
                        ] as const
                      ).map(
                        (urgency) => (
                          <button
                            key={urgency}
                            type="button"
                            onClick={() =>
                              setUrgencyFilter(
                                urgency,
                              )
                            }
                            className={`rounded-xl px-2 py-2.5 text-[10px] font-bold transition-colors ${
                              urgencyFilter ===
                              urgency
                                ? "bg-qc-blue text-white"
                                : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                            }`}
                          >
                            {
                              urgencyLabels[
                                urgency
                              ]
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          COMPACT STATUS STRIP
          ======================================================= */}

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-background/60">
        <div className="px-4 py-3 sm:px-5">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Finalized
          </p>

          <p className="mt-0.5 text-sm font-extrabold text-qc-navy">
            {totalVolume}
          </p>
        </div>

        <div className="px-4 py-3 sm:px-5">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Fastest
          </p>

          <p className="mt-0.5 truncate text-sm font-extrabold text-qc-blue">
            {fastest
              ? `${fastest.modality} · ${fastest.avgTat}m`
              : "—"}
          </p>
        </div>

        <div className="px-4 py-3 sm:px-5">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
            SLA
          </p>

          <p
            className={`mt-0.5 text-sm font-extrabold ${
              breachedCount > 0
                ? "text-qc-red"
                : "text-qc-blue"
            }`}
          >
            {breachedCount > 0
              ? `${breachedCount} breach${
                  breachedCount ===
                  1
                    ? ""
                    : "es"
                }`
              : "All within target"}
          </p>
        </div>
      </div>

      {/* =======================================================
          CHART
          ======================================================= */}

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {displayData.length ===
        0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
            </div>

            <p className="mt-3 text-sm font-extrabold text-qc-navy">
              No modality data
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              There are no finalized scans for this
              filter.
            </p>
          </div>
        ) : (
          <div className="h-[270px] w-full sm:h-[290px]">
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

                {/* Actual TAT */}
                <Bar
                  dataKey="avgTat"
                  name="Actual TAT"
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
                        fill={getBarColor(
                          item.volume,
                          item.avgTat,
                          item.target,
                        )}
                      />
                    ),
                  )}
                </Bar>

                {/* SLA target */}
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

      {/* =======================================================
          LEGEND / FOOTER
          ======================================================= */}

      <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3.5 text-[10px] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor:
                  QC_BLUE,
              }}
            />
            Actual TAT
          </span>

          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{
                backgroundColor:
                  QC_YELLOW,
              }}
            />
            SLA target
          </span>

          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor:
                  QC_RED,
              }}
            />
            Above SLA
          </span>
        </div>

        <span className="font-semibold text-muted-foreground">
          {temporalLabels[
            temporalPeriod
          ]}{" "}
          ·{" "}
          {urgencyLabels[
            urgencyFilter
          ]}
        </span>
      </div>
    </section>
  );
}