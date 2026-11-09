import React from "react";

import {
  QC_BLUE,
  QC_RED,
} from "./types";

interface TatChartLegendProps {
  hasTargetSla: boolean;
}

export function TatChartLegend({
  hasTargetSla,
}: TatChartLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-[13px] font-semibold text-muted-foreground">
      {hasTargetSla ? (
        <>
          {/* Target SLA */}
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded-xs border"
              style={{
                backgroundColor: "rgba(0, 53, 122, 0.24)",
                borderColor: "rgba(0, 53, 122, 0.65)",
              }}
            />
            Target SLA (Wide Benchmark Bar)
          </span>

          {/* Actual TAT within SLA */}
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-xs"
              style={{
                backgroundColor: QC_BLUE,
              }}
            />
            Actual TAT (Within SLA)
          </span>

          {/* Actual TAT above SLA */}
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-xs"
              style={{
                backgroundColor: QC_RED,
              }}
            />
            Actual TAT (Above SLA / Breached)
          </span>
        </>
      ) : (
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-xs"
            style={{
              backgroundColor: QC_BLUE,
            }}
          />
          Actual Average Turnaround Time (Filter by OPD, ER, or Inpatient to compare against SLA targets)
        </span>
      )}
    </div>
  );
}