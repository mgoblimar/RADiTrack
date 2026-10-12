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
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import {
  fetchYearlyTrendAction,
  TwelveMonthTrendResult,
} from "@/app/actions";

interface Props {
  data: TwelveMonthTrendResult;
}

/* =========================================================
   RADiTrack palette
========================================================= */

const QC_NAVY = "#050E40";
const QC_BLUE = "#18298C";
const QC_PURPLE = "#7652B8";
const QC_MUTED = "#64748B";
const QC_GRID = "#E2E8F0";

export function TwelveMonthTrendChart({
  data: initialData,
}: Props) {
  const [data, setData] =
    useState<TwelveMonthTrendResult>(
      initialData,
    );

  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(
      initialData.selectedPeriod ||
        "rolling",
    );

  const [comparePriorYear, setComparePriorYear] =
    useState(true);

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  const settingsButtonRef =
    useRef<HTMLButtonElement>(null);

  const settingsPopoverRef =
    useRef<HTMLDivElement>(null);

  const [settingsPosition, setSettingsPosition] =
    useState({
      top: 0,
      left: 0,
      maxHeight: 0,
      openAbove: false,
    });

  /* =========================================================
     Current year
  ========================================================= */

  const currentTargetYear = useMemo(() => {
    if (selectedPeriod === "rolling") {
      return new Date().getFullYear();
    }

    const parsed = Number.parseInt(
      selectedPeriod,
      10,
    );

    return Number.isNaN(parsed)
      ? new Date().getFullYear()
      : parsed;
  }, [selectedPeriod]);

  /* =========================================================
     Position settings popover
  ========================================================= */

  const updateSettingsPosition = () => {
    if (!settingsButtonRef.current) {
      return;
    }

    const rect =
      settingsButtonRef.current.getBoundingClientRect();

    const width = 320;
    const viewportPadding = 12;
    const gap = 8;
    const minPopoverHeight = 220;

    const viewportHeight =
      window.innerHeight;

    let left =
      rect.right - width;

    left = Math.max(
      viewportPadding,
      Math.min(
        left,
        window.innerWidth -
          width -
          viewportPadding,
      ),
    );

    const spaceBelow =
      viewportHeight -
      rect.bottom -
      viewportPadding -
      gap;

    const spaceAbove =
      rect.top -
      viewportPadding -
      gap;

    /*
     * Prefer opening below when there is enough room.
     * Otherwise open upward.
     */
    const shouldOpenAbove =
      spaceBelow < minPopoverHeight &&
      spaceAbove > spaceBelow;

    const availableHeight =
      Math.max(
        180,
        Math.min(
          600,
          shouldOpenAbove
            ? spaceAbove
            : spaceBelow,
        ),
      );

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top -
            gap -
            Math.min(
              availableHeight,
              Math.max(
                180,
                spaceAbove,
              ),
            ),
        )
      : rect.bottom + gap;

    setSettingsPosition({
      top,
      left,
      maxHeight: availableHeight,
      openAbove: shouldOpenAbove,
    });
  };

  /* =========================================================
     Settings listeners
  ========================================================= */

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    updateSettingsPosition();

    const handleResize = () => {
      updateSettingsPosition();
    };

    const handleScroll = () => {
      updateSettingsPosition();
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
  }, [isSettingsOpen]);

  /*
   * Recalculate once the portal has actually rendered.
   * This lets us use the real popover height and
   * keep it fully inside the viewport.
   */
  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        !settingsButtonRef.current ||
        !settingsPopoverRef.current
      ) {
        return;
      }

      const buttonRect =
        settingsButtonRef.current.getBoundingClientRect();

      const popoverRect =
        settingsPopoverRef.current.getBoundingClientRect();

      const width = 320;
      const viewportPadding = 12;
      const gap = 8;

      let left =
        buttonRect.right - width;

      left = Math.max(
        viewportPadding,
        Math.min(
          left,
          window.innerWidth -
            width -
            viewportPadding,
        ),
      );

      const popoverHeight =
        popoverRect.height;

      const spaceBelow =
        window.innerHeight -
        buttonRect.bottom -
        viewportPadding -
        gap;

      const spaceAbove =
        buttonRect.top -
        viewportPadding -
        gap;

      const fitsBelow =
        popoverHeight <= spaceBelow;

      const fitsAbove =
        popoverHeight <= spaceAbove;

      let openAbove = false;
      let top = buttonRect.bottom + gap;

      if (!fitsBelow && fitsAbove) {
        openAbove = true;
        top =
          buttonRect.top -
          gap -
          popoverHeight;
      } else if (!fitsBelow && !fitsAbove) {
        /*
         * Neither direction has enough room.
         * Use whichever side has more room and let
         * the inner content scroll.
         */
        openAbove =
          spaceAbove > spaceBelow;

        if (openAbove) {
          top = Math.max(
            viewportPadding,
            buttonRect.top -
              gap -
              Math.min(
                popoverHeight,
                spaceAbove,
              ),
          );
        } else {
          top = buttonRect.bottom + gap;
        }
      }

      const availableHeight = Math.max(
        180,
        Math.min(
          popoverHeight,
          openAbove
            ? spaceAbove
            : spaceBelow,
          600,
        ),
      );

      setSettingsPosition({
        top,
        left,
        maxHeight: availableHeight,
        openAbove,
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    isSettingsOpen,
    selectedPeriod,
    comparePriorYear,
  ]);

  /* =========================================================
     Close settings popover
  ========================================================= */

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        settingsButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      if (
        settingsPopoverRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsSettingsOpen(false);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
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
  }, [isSettingsOpen]);

  /* =========================================================
     Select period
  ========================================================= */

  const handleSelectPeriod = (
    period: string,
  ) => {
    setSelectedPeriod(period);

    startTransition(async () => {
      try {
        const result =
          await fetchYearlyTrendAction(
            period,
          );

        setData(result);
        setIsSettingsOpen(false);
      } catch (error) {
        console.error(
          "Failed to fetch yearly trend:",
          error,
        );
      }
    });
  };

  /* =========================================================
     Step year
  ========================================================= */

  const handleStepYear = (
    step: number,
  ) => {
    handleSelectPeriod(
      String(
        currentTargetYear + step,
      ),
    );
  };

  /* =========================================================
     Format annual TAT
  ========================================================= */

  const formatAnnualTat = (
    hours: number,
    minutes: number,
  ) => {
    if (hours >= 1) {
      return `${hours}h`;
    }

    return `${minutes}m`;
  };

  /* =========================================================
     Current historical label
  ========================================================= */

  const periodLabel =
    selectedPeriod === "rolling"
      ? "Rolling 12 months"
      : `Calendar year ${selectedPeriod}`;

  /* =========================================================
     YoY state
  ========================================================= */

  const hasPriorComparison =
    comparePriorYear &&
    data.priorAnnualTotalFinalized >
      0;

  const isFaster =
    data.pctChangeTat < 0;

  const isSlower =
    data.pctChangeTat > 0;

  /* =========================================================
     Custom tooltip
  ========================================================= */

  const CustomTooltip = ({
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

    const currentItem = payload.find(
      (item: any) =>
        item.dataKey ===
        "avgTatHours",
    );

    const priorItem = payload.find(
      (item: any) =>
        item.dataKey ===
        "priorYearAvgTatHours",
    );

    const point =
      currentItem?.payload ||
      priorItem?.payload;

    if (!point) {
      return null;
    }

    const currentValue =
      Number(currentItem?.value ?? 0);

    const priorValue =
      Number(priorItem?.value ?? 0);

    let yoyChange:
      | number
      | null = null;

    if (
      comparePriorYear &&
      priorValue > 0 &&
      currentValue > 0
    ) {
      yoyChange = Number(
        (
          ((currentValue -
            priorValue) /
            priorValue) *
          100
        ).toFixed(1),
      );
    }

    return (
      <div className="min-w-[205px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
        <p className="font-extrabold text-qc-navy">
          {point.fullMonth ||
            label}
        </p>

        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">

          {currentItem && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-qc-blue">
                <span className="h-2 w-2 rounded-full bg-qc-blue" />
                {data.selectedPeriodLabel}
              </span>

              <strong className="font-mono text-qc-navy">
                {currentValue}h
              </strong>
            </div>
          )}

          {comparePriorYear &&
            priorItem &&
            priorValue > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span
                  className="flex items-center gap-1.5"
                  style={{
                    color: QC_PURPLE,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        QC_PURPLE,
                    }}
                  />

                  {data.priorPeriodLabel}
                </span>

                <strong className="font-mono text-qc-navy">
                  {priorValue}h
                </strong>
              </div>
            )}

          {yoyChange !== null && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-muted-foreground">
                YoY
              </span>

              <span
                className={`font-extrabold ${
                  yoyChange < 0
                    ? "text-qc-blue"
                    : yoyChange > 0
                      ? "text-qc-red"
                      : "text-muted-foreground"
                }`}
              >
                {yoyChange < 0
                  ? `${Math.abs(
                      yoyChange,
                    )}% faster`
                  : yoyChange > 0
                    ? `+${yoyChange}%`
                    : "No change"}
              </span>
            </div>
          )}

        </div>
      </div>
    );
  };

  /* =========================================================
     Settings popover
  ========================================================= */

  const settingsPopover =
    isSettingsOpen ? (
      <div
        ref={settingsPopoverRef}
        role="dialog"
        aria-label="Historical trend options"
        style={{
          position: "fixed",
          top: settingsPosition.top,
          left: settingsPosition.left,
          width: 320,
          maxHeight:
            settingsPosition.maxHeight > 0
              ? settingsPosition.maxHeight
              : "calc(100vh - 24px)",
          zIndex: 9999,
        }}
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
      >

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-extrabold text-qc-navy">
            Trend options
          </span>

          <button
            type="button"
            onClick={() =>
              setIsSettingsOpen(false)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
            aria-label="Close trend options"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable settings content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="space-y-4">

            {/* Rolling */}
            <div>
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Period
              </p>

              <button
                type="button"
                onClick={() =>
                  handleSelectPeriod(
                    "rolling",
                  )
                }
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-bold transition-colors ${
                  selectedPeriod ===
                  "rolling"
                    ? "bg-qc-yellow text-qc-navy"
                    : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                }`}
              >
                <span>
                  Rolling 12 months
                </span>

                {selectedPeriod ===
                  "rolling" && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Years */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Calendar year
              </p>

              <div className="flex items-center rounded-xl border border-border bg-background p-1">

                <button
                  type="button"
                  onClick={() =>
                    handleStepYear(-1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                  title="Previous year"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <select
                  value={
                    selectedPeriod ===
                    "rolling"
                      ? String(
                          new Date().getFullYear(),
                        )
                      : selectedPeriod
                  }
                  onChange={(event) =>
                    handleSelectPeriod(
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-extrabold text-qc-navy outline-none"
                >
                  {data.availableYears.map(
                    (year) => (
                      <option
                        key={year}
                        value={String(
                          year,
                        )}
                      >
                        {year}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleStepYear(1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                  title="Next year"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {data.availableYears.map(
                  (year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        handleSelectPeriod(
                          String(year),
                        )
                      }
                      className={`rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${
                        selectedPeriod ===
                        String(year)
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      {year}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Comparison */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Comparison
              </p>

              <button
                type="button"
                onClick={() =>
                  setComparePriorYear(
                    (previous) =>
                      !previous,
                  )
                }
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  comparePriorYear
                    ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Prior year
                </span>

                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    comparePriorYear
                      ? "border-qc-blue bg-qc-blue text-white"
                      : "border-border bg-card"
                  }`}
                >
                  {comparePriorYear && (
                    <Check className="h-3 w-3" />
                  )}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-w-0">

      {/* =====================================================
          COMPACT CONTROLS
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Period navigation */}
        <div className="flex min-w-0 items-center gap-1.5">

          <button
            type="button"
            onClick={() =>
              handleStepYear(-1)
            }
            disabled={
              isPending ||
              selectedPeriod ===
                "rolling"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
            title="Previous year"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
            <Calendar className="h-3.5 w-3.5 text-qc-blue" />

            <span className="max-w-[210px] truncate text-[11px] font-extrabold text-qc-navy">
              {periodLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              handleStepYear(1)
            }
            disabled={
              isPending ||
              selectedPeriod ===
                "rolling"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
            title="Next year"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {isPending && (
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-qc-yellow" />
          )}

        </div>

        {/* Summary + options */}
        <div className="flex items-center gap-2">

          <div className="hidden items-center gap-3 rounded-xl bg-background px-3 py-2 sm:flex">

            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
                Avg TAT
              </span>

              <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
                {formatAnnualTat(
                  data.annualAvgTatHours,
                  data.annualAvgTatMinutes,
                )}
              </span>
            </div>

            {hasPriorComparison && (
              <>
                <span className="h-3.5 w-px bg-border" />

                <div className="flex items-center gap-1.5">

                  {isFaster ? (
                    <TrendingDown className="h-3 w-3 text-qc-blue" />
                  ) : isSlower ? (
                    <TrendingUp className="h-3 w-3 text-qc-red" />
                  ) : null}

                  <span
                    className={`text-xs font-extrabold ${
                      isFaster
                        ? "text-qc-blue"
                        : isSlower
                          ? "text-qc-red"
                          : "text-muted-foreground"
                    }`}
                  >
                    {data.pctChangeTat ===
                    0
                      ? "No change"
                      : `${Math.abs(
                          data.pctChangeTat,
                        )}% ${
                          isFaster
                            ? "faster"
                            : "longer"
                        }`}
                  </span>

                </div>
              </>
            )}

          </div>

          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() =>
              setIsSettingsOpen(
                (previous) =>
                  !previous,
              )
            }
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
              isSettingsOpen
                ? "border-qc-navy bg-qc-navy text-white shadow-[0_6px_14px_rgba(5,14,64,0.12)]"
                : "border-white/80 bg-white/75 text-qc-navy shadow-sm hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
            }`}
            aria-expanded={
              isSettingsOpen
            }
            aria-haspopup="dialog"
          >
            <CalendarDays
              className={`h-3.5 w-3.5 ${
                isSettingsOpen
                  ? "text-qc-yellow"
                  : "text-qc-blue"
              }`}
            />

            <span>View</span>

            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isSettingsOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

        </div>
      </div>

      {/* Settings portal */}
      {typeof document !==
        "undefined" &&
        isSettingsOpen &&
        createPortal(
          settingsPopover,
          document.body,
        )}

      {/* =====================================================
          Small-screen summary
      ===================================================== */}

      <div className="flex items-center justify-between border-b border-border py-3 sm:hidden">

        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Avg TAT
          </span>

          <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
            {formatAnnualTat(
              data.annualAvgTatHours,
              data.annualAvgTatMinutes,
            )}
          </span>
        </div>

        {hasPriorComparison && (
          <span
            className={`text-[10px] font-extrabold ${
              isFaster
                ? "text-qc-blue"
                : isSlower
                  ? "text-qc-red"
                  : "text-muted-foreground"
            }`}
          >
            {data.pctChangeTat ===
            0
              ? "No change"
              : `${Math.abs(
                  data.pctChangeTat,
                )}% ${
                  isFaster
                    ? "faster"
                    : "longer"
                }`}
          </span>
        )}

      </div>

      {/* =====================================================
          Trend chart
      ===================================================== */}

      <div className="pt-4">

        <div className="h-[275px] w-full sm:h-[300px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data.months}
              margin={{
                top: 8,
                right: 8,
                left: -8,
                bottom: 0,
              }}
            >

              <defs>
                <linearGradient
                  id="raditrackHistoricalGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={QC_BLUE}
                    stopOpacity={0.16}
                  />

                  <stop
                    offset="95%"
                    stopColor={QC_BLUE}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={QC_GRID}
                vertical={false}
              />

              <XAxis
                dataKey="monthLabel"
                stroke={QC_MUTED}
                fontSize={10}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dy={6}
              />

              <YAxis
                stroke={QC_MUTED}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(value) =>
                  `${value}h`
                }
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              {/* Current period */}
              <Area
                type="monotone"
                dataKey="avgTatHours"
                stroke={QC_BLUE}
                strokeWidth={2.5}
                fill="url(#raditrackHistoricalGradient)"
                fillOpacity={1}
                name={
                  data.selectedPeriodLabel
                }
                dot={{
                  r: 2.5,
                  fill: QC_BLUE,
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 4,
                }}
              />

              {/* Prior period */}
              {comparePriorYear && (
                <Line
                  type="monotone"
                  dataKey="priorYearAvgTatHours"
                  stroke={QC_PURPLE}
                  strokeWidth={1.8}
                  strokeDasharray="5 5"
                  dot={{
                    r: 2.5,
                    fill: QC_PURPLE,
                    strokeWidth: 0,
                  }}
                  activeDot={{
                    r: 4,
                  }}
                  name={
                    data.priorPeriodLabel
                  }
                />
              )}

            </AreaChart>
          </ResponsiveContainer>

        </div>

      </div>

      {/* =====================================================
          Minimal legend
      ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[10px]">

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

          <span className="flex items-center gap-1.5 font-semibold text-qc-navy">
            <span className="h-2.5 w-2.5 rounded-full bg-qc-blue" />

            {data.selectedPeriodLabel}
          </span>

          {comparePriorYear && (
            <span
              className="flex items-center gap-1.5 font-semibold"
              style={{
                color: QC_PURPLE,
              }}
            >
              <span
                className="h-0 w-5 border-t-2 border-dashed"
                style={{
                  borderColor:
                    QC_PURPLE,
                }}
              />

              {data.priorPeriodLabel}
            </span>
          )}

        </div>

        <span className="font-semibold text-muted-foreground">
          {data.annualTotalFinalized}{" "}
          finalized
        </span>

      </div>

    </div>
  );
}