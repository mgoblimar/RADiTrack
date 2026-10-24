"use client";

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
import type { MonthTrendData } from "@/app/actions";
import { ModalityCode } from "@/lib/enums";
import {
  MODALITIES,
  ModalityConfig,
  QC_BLUE,
  QC_GRID,
  QC_MUTED,
  QC_NAVY,
  QC_PURPLE,
} from "./types";
import { TrendTooltip } from "./TrendTooltip";

interface TrendChartCanvasProps {
  months: MonthTrendData[];
  selectedModality: "ALL" | "MULTI" | ModalityCode;
  selectedPeriodLabel: string;
  priorPeriodLabel: string;
  comparePriorYear: boolean;
  triageLabel: string;
  isModalitySpecific: boolean;
  activeModalityConfig: ModalityConfig | null;
}

export function TrendChartCanvas({
  months,
  selectedModality,
  selectedPeriodLabel,
  priorPeriodLabel,
  comparePriorYear,
  triageLabel,
  isModalitySpecific,
  activeModalityConfig,
}: TrendChartCanvasProps) {
  return (
    <div className="h-[285px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={months}
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
              <stop offset="5%" stopColor={QC_BLUE} stopOpacity={0.16} />
              <stop offset="95%" stopColor={QC_BLUE} stopOpacity={0} />
            </linearGradient>

            {MODALITIES.map((m) => (
              <linearGradient
                key={`grad-${m.code}`}
                id={`grad-${m.code}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={m.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
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
            tickFormatter={(value) => `${value}h`}
          />

          <Tooltip
            content={
              <TrendTooltip
                selectedModality={selectedModality}
                comparePriorYear={comparePriorYear}
                priorPeriodLabel={priorPeriodLabel}
                triageLabel={triageLabel}
              />
            }
          />

          {/* =====================================================
              1. OVERALL VIEW (selectedModality === "ALL")
          ===================================================== */}
          {selectedModality === "ALL" && (
            <>
              {/* Current period (straight/solid line) */}
              <Area
                type="monotone"
                dataKey="avgTatHours"
                stroke={QC_BLUE}
                strokeWidth={2.5}
                fill="url(#raditrackHistoricalGradient)"
                fillOpacity={1}
                name={selectedPeriodLabel}
                dot={{
                  r: 2.5,
                  fill: QC_BLUE,
                  strokeWidth: 0,
                }}
                activeDot={{
                  r: 4,
                }}
              />

              {/* Prior period (dashed line) */}
              {comparePriorYear && (
                <Line
                  type="monotone"
                  dataKey="priorYearAvgTatHours"
                  stroke={QC_PURPLE}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{
                    r: 2.5,
                    fill: QC_PURPLE,
                    strokeWidth: 0,
                  }}
                  activeDot={{
                    r: 4,
                  }}
                  name={priorPeriodLabel}
                />
              )}
            </>
          )}

          {/* =====================================================
              2. MULTI-MODALITY VIEW (selectedModality === "MULTI")
          ===================================================== */}
          {selectedModality === "MULTI" && (
            <>
              {/* Overall benchmark line */}
              <Line
                type="monotone"
                dataKey="avgTatHours"
                stroke={QC_NAVY}
                strokeWidth={2}
                strokeDasharray="4 2"
                name="Overall Avg"
                dot={{
                  r: 2,
                  fill: QC_NAVY,
                }}
              />

              {/* Modality straight/solid lines */}
              {MODALITIES.map((m) => (
                <Line
                  key={`line-${m.code}`}
                  type="monotone"
                  dataKey={`${m.code}_avgTatHours`}
                  stroke={m.color}
                  strokeWidth={2.5}
                  dot={{
                    r: 2.5,
                    fill: m.color,
                    strokeWidth: 0,
                  }}
                  activeDot={{
                    r: 4,
                  }}
                  name={m.label}
                />
              ))}

              {/* Prior modality dashed lines */}
              {comparePriorYear &&
                MODALITIES.map((m) => (
                  <Line
                    key={`pri-line-${m.code}`}
                    type="monotone"
                    dataKey={`prior_${m.code}_avgTatHours`}
                    stroke={m.color}
                    strokeWidth={1.8}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{
                      r: 3.5,
                    }}
                    name={`${m.label} (Prior)`}
                  />
                ))}
            </>
          )}

          {/* =====================================================
              3. SPECIFIC MODALITY VIEW
          ===================================================== */}
          {isModalitySpecific && activeModalityConfig && (
            <>
              {/* Overall hospital benchmark reference line */}
              <Line
                type="monotone"
                dataKey="avgTatHours"
                stroke="#94A3B8"
                strokeWidth={1.8}
                strokeDasharray="3 3"
                name="Hospital Average"
                dot={false}
              />

              {/* Selected modality straight/solid line with gradient fill */}
              <Area
                type="monotone"
                dataKey={`${selectedModality}_avgTatHours`}
                stroke={activeModalityConfig.color}
                strokeWidth={3}
                fill={`url(#grad-${selectedModality})`}
                fillOpacity={1}
                dot={{
                  r: 3.5,
                  fill: activeModalityConfig.color,
                  stroke: "#FFFFFF",
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 5,
                }}
                name={`${activeModalityConfig.label} (Current)`}
              />

              {/* Selected modality prior period dashed line */}
              {comparePriorYear && (
                <Line
                  type="monotone"
                  dataKey={`prior_${selectedModality}_avgTatHours`}
                  stroke={activeModalityConfig.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{
                    r: 2.5,
                    fill: activeModalityConfig.color,
                  }}
                  activeDot={{
                    r: 4,
                  }}
                  name={`${activeModalityConfig.label} (Prior)`}
                />
              )}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
