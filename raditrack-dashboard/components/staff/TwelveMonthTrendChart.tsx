"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

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

// =========================================================
// RADiTrack palette
// =========================================================

const QC_NAVY = "#050E40";
const QC_BLUE = "#18298C";
const QC_YELLOW = "#F2CB49";
const QC_RED = "#A60808";
const QC_PURPLE = "#7652B8";
const QC_MUTED = "#64748B";
const QC_GRID = "#E2E8F0";

// =========================================================
// Component
// =========================================================

export function TwelveMonthTrendChart({
  data: initialData,
}: Props) {
  const [data, setData] =
    useState<TwelveMonthTrendResult>(
      initialData,
    );

  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(
      initialData.selectedPeriod || "rolling",
    );

  const [comparePriorYear, setComparePriorYear] =
    useState(true);

  const [isPending, startTransition] =
    useTransition();

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const settingsRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // Close settings popover
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsSettingsOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
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
  }, [isSettingsOpen]);

  // =========================================================
  // Select historical period
  // =========================================================

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
      } catch (error) {
        console.error(
          "Failed to fetch yearly trend:",
          error,
        );
      }
    });
  };

  // =========================================================
  // Resolve current target year
  // =========================================================

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

  // =========================================================
  // Step year
  // =========================================================

  const handleStepYear = (
    step: number,
  ) => {
    handleSelectPeriod(
      String(
        currentTargetYear + step,
      ),
    );
  };

  // =========================================================
  // Format annual TAT
  // =========================================================

  const formatAnnualTat = (
    hours: number,
    minutes: number,
  ) => {
    if (hours >= 1) {
      return `${hours} hrs`;
    }

    return `${minutes} mins`;
  };

  // =========================================================
  // Custom tooltip
  // =========================================================

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
        item.dataKey === "avgTatHours",
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

    let yoyChange: number | null =
      null;

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
      <div className="min-w-[230px] rounded-2xl border border-border bg-card p-3.5 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
        {/* Header */}
        <div className="border-b border-border pb-2.5">
          <p className="font-extrabold text-qc-navy">
            {point.fullMonth ||
              label}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            Monthly TAT
          </p>
        </div>

        <div className="space-y-2.5 pt-2.5">
          {/* Current */}
          {currentItem && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-qc-blue">
                <span className="h-2 w-2 rounded-full bg-qc-blue" />
                {data.selectedPeriodLabel}
              </span>

              <span className="font-mono font-extrabold text-qc-navy">
                {currentValue}h
                <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">
                  (
                  {point.totalFinalized ??
                    0}{" "}
                  scans)
                </span>
              </span>
            </div>
          )}

          {/* Prior */}
          {comparePriorYear &&
            priorItem &&
            priorValue > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-semibold text-qc-purple">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        QC_PURPLE,
                    }}
                  />
                  {data.priorPeriodLabel}
                </span>

                <span className="font-mono font-extrabold text-qc-navy">
                  {priorValue}h
                  <span className="ml-1 font-sans text-[10px] font-medium text-muted-foreground">
                    (
                    {point.priorYearTotalFinalized ??
                      0}{" "}
                    scans)
                  </span>
                </span>
              </div>
            )}

          {/* YoY */}
          {yoyChange !== null && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
              <span className="text-muted-foreground">
                YoY change
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
                  ? `${Math.abs(yoyChange)}% faster`
                  : yoyChange > 0
                    ? `+${yoyChange}% longer`
                    : "No change"}
              </span>
            </div>
          )}
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
              <TrendingUp className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-qc-navy sm:text-lg">
                  Historical TAT trend
                </h2>

                <span className="rounded-full bg-qc-blue/5 px-2 py-0.5 text-[9px] font-extrabold text-qc-blue">
                  12 months
                </span>

                {isPending && (
                  <span className="rounded-full bg-qc-yellow/20 px-2 py-0.5 text-[9px] font-extrabold text-qc-navy">
                    Updating…
                  </span>
                )}
              </div>

              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {data.selectedPeriodLabel}
                {comparePriorYear
                  ? ` · compared with ${data.priorPeriodLabel}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Settings */}
          <div
            ref={settingsRef}
            className="relative self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() =>
                setIsSettingsOpen(
                  (previous) =>
                    !previous,
                )
              }
              className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition-all ${
                isSettingsOpen
                  ? "border-qc-navy bg-qc-navy text-white"
                  : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
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

              <span>View options</span>

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isSettingsOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {/* =================================================
                SETTINGS POPOVER
                ================================================= */}

            {isSettingsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[330px] rounded-3xl border border-border bg-card p-4 shadow-[0_20px_50px_rgba(5,14,64,0.14)] animate-in fade-in zoom-in-95 duration-150">
                <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-qc-blue" />

                    <span className="text-sm font-extrabold text-qc-navy">
                      Trend settings
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsSettingsOpen(
                        false,
                      )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                    aria-label="Close trend settings"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Rolling */}
                <div>
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Analysis window
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

                {/* Calendar year */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                    Calendar year
                  </p>

                  <div className="flex items-center rounded-2xl border border-border bg-background p-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleStepYear(-1)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                      title="Previous year"
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
                      className="flex-1 bg-transparent px-2 text-center text-xs font-extrabold text-qc-navy outline-none"
                    >
                      {data.availableYears.map(
                        (year) => (
                          <option
                            key={year}
                            value={String(
                              year,
                            )}
                          >
                            Calendar Year{" "}
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
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                      title="Next year"
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

                {/* Prior year */}
                <div className="mt-4 border-t border-border pt-4">
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
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                      comparePriorYear
                        ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" />
                      Prior-year baseline
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
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          INSIGHT STRIP
          ======================================================= */}

      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
        {/* Current average */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Current avg TAT
          </p>

          <p className="mt-1 text-xl font-extrabold tracking-tight text-qc-navy">
            {formatAnnualTat(
              data.annualAvgTatHours,
              data.annualAvgTatMinutes,
            )}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {data.annualTotalFinalized} finalized
          </p>
        </div>

        {/* Prior average */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Prior-year avg
          </p>

          {comparePriorYear ? (
            <>
              <p className="mt-1 text-xl font-extrabold tracking-tight text-qc-blue">
                {formatAnnualTat(
                  data.priorAnnualAvgTatHours,
                  data.priorAnnualAvgTatMinutes,
                )}
              </p>

              <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                {data.priorAnnualTotalFinalized} finalized
              </p>
            </>
          ) : (
            <p className="mt-1 text-xl font-extrabold text-muted-foreground">
              —
            </p>
          )}
        </div>

        {/* YoY movement */}
        <div className="rounded-2xl border border-border bg-background p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            TAT movement
          </p>

          {comparePriorYear &&
          data.priorAnnualTotalFinalized >
            0 ? (
            <div className="mt-1 flex items-center gap-2">
              {data.pctChangeTat <
              0 ? (
                <TrendingDown className="h-4 w-4 text-qc-blue" />
              ) : data.pctChangeTat >
                0 ? (
                <TrendingUp className="h-4 w-4 text-qc-red" />
              ) : null}

              <span
                className={`text-xl font-extrabold ${
                  data.pctChangeTat < 0
                    ? "text-qc-blue"
                    : data.pctChangeTat > 0
                      ? "text-qc-red"
                      : "text-muted-foreground"
                }`}
              >
                {data.pctChangeTat ===
                0
                  ? "—"
                  : `${Math.abs(
                      data.pctChangeTat,
                    )}%`}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xl font-extrabold text-muted-foreground">
              —
            </p>
          )}

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            {comparePriorYear
              ? data.pctChangeTat <
                0
                ? "faster than prior year"
                : data.pctChangeTat >
                    0
                  ? "longer than prior year"
                  : "no change"
              : "comparison off"}
          </p>
        </div>

        {/* Volume */}
        <div className="rounded-2xl border border-qc-yellow/20 bg-qc-yellow/10 p-3.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
            Annual volume
          </p>

          <p className="mt-1 text-xl font-extrabold tracking-tight text-qc-navy">
            {data.annualTotalFinalized}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
            finalized examinations
          </p>
        </div>
      </div>

      {/* =======================================================
          SECONDARY INSIGHTS
          ======================================================= */}

      {(data.fastestMonth ||
        data.peakVolumeMonth ||
        data.pctChangeVolume !== 0) && (
        <div className="border-y border-border bg-background/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-semibold text-muted-foreground">
            {data.fastestMonth && (
              <span>
                Fastest month:{" "}
                <strong className="text-qc-navy">
                  {
                    data.fastestMonth
                      .monthLabel
                  }
                </strong>{" "}
                ·{" "}
                {
                  data.fastestMonth
                    .avgTatHours
                }
                h
              </span>
            )}

            {data.peakVolumeMonth && (
              <span>
                Peak volume:{" "}
                <strong className="text-qc-navy">
                  {
                    data.peakVolumeMonth
                      .monthLabel
                  }
                </strong>{" "}
                ·{" "}
                {
                  data.peakVolumeMonth
                    .volume
                }{" "}
                scans
              </span>
            )}

            {data.pctChangeVolume !==
              0 &&
              comparePriorYear && (
                <span>
                  Volume change:{" "}
                  <strong
                    className={
                      data.pctChangeVolume >
                      0
                        ? "text-qc-blue"
                        : "text-qc-red"
                    }
                  >
                    {data.pctChangeVolume >
                    0
                      ? `+${data.pctChangeVolume}%`
                      : `${data.pctChangeVolume}%`}
                  </strong>
                </span>
              )}
          </div>
        </div>
      )}

      {/* =======================================================
          TREND CHART
          ======================================================= */}

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="h-[285px] w-full sm:h-[310px]">
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
                    stopOpacity={0.18}
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

      {/* =======================================================
          LEGEND / FOOTER
          ======================================================= */}

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3.5 text-[10px] sm:flex-row sm:items-center sm:justify-between sm:px-5">
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold text-muted-foreground">
          <span>
            {selectedPeriod ===
            "rolling"
              ? "Rolling 12 months"
              : `Calendar year ${selectedPeriod}`}
          </span>

          <span>
            {data.annualTotalFinalized}{" "}
            finalized
          </span>
        </div>
      </div>
    </section>
  );
}