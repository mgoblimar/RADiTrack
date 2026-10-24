"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, ChevronDown, Filter } from "lucide-react";

import {
  QC_GRID,
  QC_MUTED,
  QC_NAVY,
  QC_EMPTY,
  type TatOverviewChartProps,
} from "./tat-overview/types";
import { useTatOverviewData } from "./tat-overview/useTatOverviewData";
import { TatChartTooltip } from "./tat-overview/TatChartTooltip";
import {
  renderModalityTick,
  createActualTatLabelRenderer,
} from "./tat-overview/TatChartTicks";
import { TatChartLegend } from "./tat-overview/TatChartLegend";
import { TatChartFilterPopover } from "./tat-overview/TatChartFilterPopover";

export { type TatOverviewChartProps } from "./tat-overview/types";

export function TatOverviewChart({ data }: TatOverviewChartProps) {
  const {
    temporalPeriod,
    patientCategory,
    setPatientCategory,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    isPending,
    isFiltered,
    hasTargetSla,
    displayData,
    handleSelectPeriod,
    handleFetchCustomRange,
    handleResetFilters,
  } = useTatOverviewData(data);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });

  /* =========================================================
     Position filter popover
  ========================================================= */
  const updateFilterPosition = () => {
    if (!filterButtonRef.current) return;
    const rect = filterButtonRef.current.getBoundingClientRect();
    const width = 320;
    const padding = 12;
    let left = rect.right - width;
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));

    setFilterPosition({
      top: rect.bottom + 8,
      left,
    });
  };

  useEffect(() => {
    if (!isFilterOpen) return;
    updateFilterPosition();

    const handleResize = () => updateFilterPosition();
    const handleScroll = () => updateFilterPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isFilterOpen]);

  const renderActualTatLabel = useMemo(
    () => createActualTatLabelRenderer(displayData, hasTargetSla),
    [displayData, hasTargetSla],
  );

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
                {hasTargetSla
                  ? "Target SLA benchmark vs Actual TAT"
                  : "Average Turnaround Time across modalities (Filter by category to view SLA benchmarks)"}
              </p>
            </div>
          </div>

          {/* Controls: Filter Button */}
          <div className="flex items-center gap-2.5">
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
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
                  isFilterOpen ? "text-qc-yellow" : "text-qc-blue"
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

      {/* Filter popover portal */}
      <TatChartFilterPopover
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        position={filterPosition}
        buttonRef={filterButtonRef}
        patientCategory={patientCategory}
        onSelectCategory={setPatientCategory}
        temporalPeriod={temporalPeriod}
        onSelectPeriod={handleSelectPeriod}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        onApplyCustomRange={handleFetchCustomRange}
        isPending={isPending}
        isFiltered={isFiltered}
        onResetFilters={() => {
          handleResetFilters();
          setIsFilterOpen(false);
        }}
      />

      {/* Chart */}
      <div className="px-4 pt-5 pb-3 sm:px-5 sm:pt-6 sm:pb-4">
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
          <div className="h-[310px] w-full sm:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={displayData}
                barGap={hasTargetSla ? -34 : 4}
                margin={{
                  top: 24,
                  right: 16,
                  left: -10,
                  bottom: 45,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={QC_GRID}
                  vertical={false}
                />

                {/* Unified single X-Axis with friendly modality name */}
                <XAxis
                  dataKey="modality"
                  tick={renderModalityTick}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  height={45}
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
                  content={
                    <TatChartTooltip
                      hasTargetSla={hasTargetSla}
                      patientCategory={patientCategory}
                    />
                  }
                  cursor={{
                    fill: "rgba(24, 41, 140, 0.04)",
                  }}
                />

                {/* Wide Target SLA bar rendered in background zIndex layer (100) */}
                {hasTargetSla && (
                  <Bar
                    dataKey="target"
                    name="Target SLA"
                    fill="#4A69BD"
                    fillOpacity={0.7}
                    stroke="#2C4897"
                    strokeWidth={1.5}
                    radius={[6, 6, 0, 0]}
                    barSize={46}
                    zIndex={100}
                  />
                )}

                {/* Actual TAT bar rendered upfront with higher zIndex layer (350 > 100) */}
                <Bar
                  dataKey="avgTat"
                  name="Actual TAT"
                  radius={[4, 4, 0, 0]}
                  barSize={hasTargetSla ? 22 : 32}
                  zIndex={350}
                >
                  {displayData.map((item, index) => {
                    const isBreach =
                      hasTargetSla &&
                      item.target !== null &&
                      item.avgTat > item.target;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          item.volume === 0
                            ? QC_EMPTY
                            : isBreach
                              ? "#C53030"
                              : QC_NAVY
                        }
                      />
                    );
                  })}
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
      <TatChartLegend hasTargetSla={hasTargetSla} />
    </section>
  );
}
