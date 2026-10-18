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
  LabelList,
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
  fetchModalityTatDataAction,
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

type PatientCategoryFilter =
  | "ALL"
  | "OPD"
  | "ER"
  | "IN";

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

  const [patientCategory, setPatientCategory] =
    useState<PatientCategoryFilter>("ALL");

  const [periodDataset, setPeriodDataset] =
    useState<ModalityTatOverviewItem[] | null>(null);

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

  const handleSelectPeriod = (period: ExtendedTemporalPeriod) => {
    setTemporalPeriod(period);

    if (period === "ALL") {
      setPeriodDataset(null);
      return;
    }

    if (period === "CUSTOM") {
      if (!customDataset) {
        handleFetchCustomRange(customStartDate, customEndDate);
      }
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchModalityTatDataAction({
          period,
        });
        setPeriodDataset(result);
      } catch (error) {
        console.error("Failed to fetch modality TAT for period:", error);
      }
    });
  };

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
          await fetchModalityTatDataAction({
            period: "CUSTOM",
            startDate: start,
            endDate: end,
          });

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
  } else if (temporalPeriod !== "ALL" && periodDataset) {
    activeDataset = periodDataset;
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
        data.periods[key as ModalityTemporalPeriod] ??
        data.periods.ALL ??
        [];
    } else if (Array.isArray(data)) {
      activeDataset = data;
    }
  }

  /* =========================================================
     Display data
  ========================================================= */

  const displayData = activeDataset.map((item) => {
    let stats = item.all;

    if (patientCategory === "OPD" && item.opd) {
      stats = item.opd;
    } else if (patientCategory === "ER" && (item.er || item.emergency)) {
      stats = item.er ?? item.emergency;
    } else if (patientCategory === "IN" && item.inpatient) {
      stats = item.inpatient;
    }

    const avgTatHours = Number((stats.avgTat / 60).toFixed(1));
    const targetHours = Number((stats.target / 60).toFixed(1));

    return {
      modality: item.modality,
      name: item.name,
      avgTatMinutes: stats.avgTat,
      avgTat: avgTatHours,
      targetMinutes: stats.target,
      target: targetHours,
      volume: stats.volume,
    };
  });

  const isFiltered =
    temporalPeriod !== "ALL" ||
    patientCategory !== "ALL";

  const handleResetFilters = () => {
    setTemporalPeriod("ALL");
    setPatientCategory("ALL");
    setPeriodDataset(null);
    setCustomDataset(null);
    setIsFilterOpen(false);
  };

  const temporalLabels: Record<
    ExtendedTemporalPeriod,
    string
  > = {
    ALL: "All time",
    ROLLING_7D: "Rolling 7 days",
    "7D": "Past 7 days",
    WEEK: "This week",
    PAST_WEEK: "Past week",
    LAST_WEEK: "Past week",
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

    const patientCategoryLabel =
      patientCategory === "OPD"
        ? "OPD Patients"
        : patientCategory === "ER"
          ? "ER Patients"
          : patientCategory === "IN"
            ? "Inpatients"
            : "All Patients";

    return (
      <div className="min-w-[190px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_14px_35px_rgba(5,14,64,0.14)]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-extrabold text-qc-navy">
            {point.name || point.modality}
          </p>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
            {patientCategoryLabel}
          </span>
        </div>

        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          <div className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-3 rounded-xs border border-[#2C4897] bg-[#4A69BD]" />
              Target SLA
            </span>
            <strong className="text-qc-navy">
              {point.target}h
            </strong>
          </div>

          <div className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-xs ${
                  point.volume === 0
                    ? "bg-muted-foreground"
                    : isBreach
                      ? "bg-[#C53030]"
                      : "bg-qc-navy"
                }`}
              />
              Actual TAT
            </span>
            <strong
              className={
                point.volume === 0
                  ? "text-muted-foreground"
                  : isBreach
                    ? "text-[#C53030]"
                    : "text-qc-navy"
              }
            >
              {point.avgTat}h
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
                    ? "font-extrabold text-[#C53030]"
                    : "font-extrabold text-qc-blue"
              }
            >
              {point.volume === 0
                ? "No finalized scans"
                : isBreach
                  ? "Above SLA (Breached)"
                  : "Within SLA Benchmark"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     Direct Average TAT Label (no hover needed)
  ========================================================= */

  const renderActualTatLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null) return null;
    const item = displayData[index];
    if (!item || item.volume === 0) return null;

    const isBreach = item.avgTat > item.target;

    return (
      <g transform={`translate(${x + width / 2}, ${y - 10})`}>
        <rect
          x={-19}
          y={-14}
          width={38}
          height={18}
          rx={5}
          fill={isBreach ? "#A60808" : "#FFFFFF"}
          stroke={isBreach ? "#DC2626" : "#CBD5E1"}
          strokeWidth={1}
          style={{ filter: "drop-shadow(0 2px 4px rgba(5, 14, 64, 0.12))" }}
        />
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isBreach ? "#FFFFFF" : "#050E40"}
          fontSize={10}
          fontWeight={800}
        >
          {value}h
        </text>
      </g>
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
            onClick={() => setIsFilterOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
            aria-label="Close filters"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Patient Category */}
          <div>
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Patient Category
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: "ALL", label: "All" },
                  { id: "OPD", label: "OPD" },
                  { id: "ER", label: "ER" },
                  { id: "IN", label: "Inpatient" },
                ] as const
              ).map((cat) => {
                const isActive = patientCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPatientCategory(cat.id)}
                    className={`rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${
                      isActive
                        ? "bg-qc-navy text-white shadow-xs"
                        : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div className="border-t border-border pt-3">
            <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Time Period
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  "ALL",
                  "ROLLING_7D",
                  "WEEK",
                  "PAST_WEEK",
                  "MONTH",
                  "YEAR",
                ] as ExtendedTemporalPeriod[]
              ).map((period) => {
                const isActive = temporalPeriod === period;

                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handleSelectPeriod(period)}
                    className={`flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                      isActive
                        ? "bg-qc-yellow text-qc-navy"
                        : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                    }`}
                  >
                    <span>{temporalLabels[period]}</span>
                    {isActive && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                handleSelectPeriod("CUSTOM");
              }}
              className={`mt-1.5 flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                temporalPeriod === "CUSTOM"
                  ? "bg-qc-blue text-white"
                  : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
              }`}
            >
              <span>Custom range</span>
              {temporalPeriod === "CUSTOM" && (
                <Check className="h-3 w-3" />
              )}
            </button>

            {temporalPeriod === "CUSTOM" && (
              <div className="mt-2 rounded-xl bg-background p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      From
                    </span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(event) =>
                        setCustomStartDate(event.target.value)
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
                      value={customEndDate}
                      onChange={(event) =>
                        setCustomEndDate(event.target.value)
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
                    customStartDate > customEndDate
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

          {/* Reset */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
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
      <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />
        <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow shadow-[0_5px_14px_rgba(5,14,64,0.12)]">
              <BarChart3 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-qc-navy sm:text-2xl">
                TAT BY MODALITY
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                Target SLA benchmark vs Actual TAT
              </p>
            </div>
          </div>

          {/* Controls: Filter Button */}
          <div className="flex items-center gap-2.5">
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setIsFilterOpen((previous) => !previous)}
              className={`group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold shadow-xs transition-all ${
                isFilterOpen
                  ? "border-qc-navy bg-qc-navy text-white shadow-[0_6px_14px_rgba(5,14,64,0.12)]"
                  : isFiltered
                    ? "border-qc-blue/20 bg-white text-qc-blue hover:border-qc-blue/30 hover:bg-white"
                    : "border-border/80 bg-white/90 text-qc-navy hover:border-qc-blue/15 hover:bg-white"
              }`}
              aria-expanded={isFilterOpen}
              aria-haspopup="dialog"
            >
              <Filter
                className={`h-3 w-3 transition-colors ${
                  isFilterOpen
                    ? "text-qc-yellow"
                    : "text-qc-blue"
                }`}
              />
              <span>Filter</span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  isFilterOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filter portal */}
      {typeof document !== "undefined" &&
        isFilterOpen &&
        createPortal(filterPopover, document.body)}

      {/* Chart */}
      <div className="px-4 py-5 sm:px-5 sm:py-6">
        {displayData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background">
            <p className="text-sm font-extrabold text-qc-navy">
              No modality data
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              No finalized scans match this filter.
            </p>
          </div>
        ) : (
          <div className="h-[270px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={displayData}
                margin={{
                  top: 24,
                  right: 12,
                  left: -10,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={QC_GRID}
                  vertical={false}
                />

                {/* Primary X-Axis for Target SLA bar */}
                <XAxis
                  xAxisId="targetAxis"
                  dataKey="modality"
                  stroke={QC_MUTED}
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                  dy={7}
                />

                {/* Secondary hidden X-Axis for Actual TAT bar (centers bar on same tick) */}
                <XAxis
                  xAxisId="actualAxis"
                  dataKey="modality"
                  hide
                />

                <YAxis
                  stroke={QC_MUTED}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(value) => `${value}h`}
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{
                    fill: "rgba(24, 41, 140, 0.04)",
                  }}
                />

                {/* Wide Target SLA bar in background (matching Excel reference) */}
                <Bar
                  xAxisId="targetAxis"
                  dataKey="target"
                  name="Target SLA"
                  fill="#4A69BD"
                  fillOpacity={0.82}
                  stroke="#2C4897"
                  strokeWidth={1.5}
                  radius={[6, 6, 0, 0]}
                  barSize={50}
                />

                {/* Narrow Actual TAT bar centered directly in foreground */}
                <Bar
                  xAxisId="actualAxis"
                  dataKey="avgTat"
                  name="Actual TAT"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                >
                  {displayData.map((item, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        item.volume === 0
                          ? QC_EMPTY
                          : item.avgTat > item.target
                            ? "#C53030"
                            : QC_NAVY
                      }
                    />
                  ))}
                  <LabelList
                    dataKey="avgTat"
                    content={renderActualTatLabel}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-[11px] font-semibold text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-xs border border-[#2C4897] bg-[#4A69BD]" />
          Target SLA (Wide Benchmark Bar)
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-qc-navy" />
          Actual TAT (Within SLA)
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#C53030]" />
          Actual TAT (Above SLA / Breached)
        </span>
      </div>
    </section>
  );
}