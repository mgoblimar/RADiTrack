"use client";

import { useMemo } from "react";
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

import {
  QC_GRID,
  QC_EMPTY,
  type TatOverviewChartProps,
} from "./tat-overview/types";
import { useTatOverviewData } from "./tat-overview/useTatOverviewData";
import { TatChartTooltip } from "./tat-overview/TatChartTooltip";
import {
  createModalityTickRenderer,
  createActualTatLabelRenderer,
} from "./tat-overview/TatChartTicks";
import { TatChartLegend } from "./tat-overview/TatChartLegend";

export { type TatOverviewChartProps } from "./tat-overview/types";

/* =========================================================
   RADiTrack OFFICIAL BRAND COLORS
========================================================= */

const BRAND_BLUE = "#00357a";
const BRAND_RED = "#7a0000";
const BRAND_YELLOW = "#ffd230";

// Readable hour labels on the light card background.
const Y_AXIS_TICK_COLOR = "#475569";

export function TatOverviewChart({
  data,
  filters,
  scopeLabel,
}: TatOverviewChartProps) {
  const { patientCategory, isPending, hasTargetSla, displayData } =
    useTatOverviewData(data, filters);

  const highlightModality =
    filters.modality === "ALL" ? null : filters.modality;

  const renderActualTatLabel = useMemo(
    () =>
      createActualTatLabelRenderer(
        displayData,
        hasTargetSla,
      ),
    [displayData, hasTargetSla],
  );

  const emptyModalityCodes = useMemo(
    () =>
      new Set(
        displayData
          .filter((item) => item.volume === 0)
          .map((item) => item.modality.toUpperCase()),
      ),
    [displayData],
  );

  const renderModalityTick = useMemo(
    () => createModalityTickRenderer(highlightModality, emptyModalityCodes),
    [highlightModality, emptyModalityCodes],
  );

  return (
    <section className="w-full overflow-hidden rounded-[26px] border border-[#DDE3F2] bg-card shadow-[0_4px_18px_rgba(0,53,122,0.06)]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">

        {/* Decorative accents */}

        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

        <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.06]" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">

          {/* Chart title */}

          <div className="min-w-0">
            <h2
              className="text-xl font-extrabold tracking-tight sm:text-2xl"
              style={{ color: BRAND_BLUE }}
            >
              TURNAROUND TIME BY MODALITY
            </h2>

            {hasTargetSla && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Target SLA benchmark vs Actual Turnaround Time
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CHART
      ===================================================== */}

      <div className="px-3 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
        {displayData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background px-4 text-center">
            <p
              className="text-sm font-extrabold"
              style={{ color: BRAND_BLUE }}
            >
              No modality data
            </p>

            <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
              No finalized scans match the selected filters.
              Try another date range or patient category in the filter bar.
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
                  left: 8,
                  bottom: 45,
                }}
              >
                {/* Grid lines */}

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={QC_GRID}
                  vertical={false}
                />

                {/* Modality labels */}

                <XAxis
                  dataKey="modality"
                  tick={renderModalityTick}
                  interval={0}
                  tickLine={false}
                  axisLine={false}
                  height={45}
                />

                {/* Average Turnaround Time in hours */}

                <YAxis
                  tick={{
                    fill: Y_AXIS_TICK_COLOR,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={56}
                  allowDecimals={false}
                  tickFormatter={(value) => `${value} hrs`}
                />

                {/* Tooltip */}

                <Tooltip
                  content={
                    <TatChartTooltip
                      hasTargetSla={hasTargetSla}
                      patientCategory={patientCategory}
                    />
                  }
                  cursor={{
                    fill: "rgba(0, 53, 122, 0.045)",
                  }}
                />

                {/* =================================================
                    TARGET SLA BENCHMARK
                ================================================= */}

                {hasTargetSla && (
                  <Bar
                    dataKey="target"
                    name="Target SLA"
                    fill={BRAND_BLUE}
                    fillOpacity={0.24}
                    stroke={BRAND_BLUE}
                    strokeOpacity={0.65}
                    strokeWidth={1.5}
                    radius={[6, 6, 0, 0]}
                    barSize={46}
                    zIndex={100}
                  />
                )}

                {/* =================================================
                    ACTUAL TURNAROUND TIME
                ================================================= */}

                <Bar
                  dataKey="avgTat"
                  name="Actual Turnaround Time"
                  radius={[4, 4, 0, 0]}
                  barSize={hasTargetSla ? 22 : 32}
                  // A modality with scans but ~0 hrs TAT still gets a sliver
                  // (and its label); Recharts drops zero-height bars.
                  minPointSize={(_value, index) =>
                    (displayData[index]?.volume ?? 0) > 0 ? 3 : 0
                  }
                  zIndex={350}
                >
                  {displayData.map((item, index) => {
                    const isBreach =
                      hasTargetSla &&
                      item.target !== null &&
                      item.avgTat > item.target;

                    const isHighlighted =
                      highlightModality !== null &&
                      item.modality.toUpperCase() === highlightModality;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        stroke={
                          isHighlighted
                            ? BRAND_YELLOW
                            : undefined
                        }
                        strokeWidth={isHighlighted ? 3 : 0}
                        fill={
                          item.volume === 0
                            ? QC_EMPTY
                            : isBreach
                              ? BRAND_RED
                              : BRAND_BLUE
                        }
                      />
                    );
                  })}

                  <LabelList
                    dataKey="modality"
                    content={renderActualTatLabel}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* =====================================================
          CHART LEGEND
      ===================================================== */}

      <TatChartLegend hasTargetSla={hasTargetSla} />
    </section>
  );
}