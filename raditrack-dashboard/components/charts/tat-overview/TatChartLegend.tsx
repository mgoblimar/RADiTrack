"use client";

/* =========================================================
   RADiTrack OFFICIAL BRAND COLORS
========================================================= */

const BRAND_BLUE = "#00357a";
const BRAND_RED = "#7a0000";

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
          {/* Target SLA benchmark */}

          <span className="flex items-center gap-2">
            <span
              className="h-3 w-5 rounded-xs border"
              style={{
                backgroundColor: "rgba(0, 53, 122, 0.24)",
                borderColor: "rgba(0, 53, 122, 0.65)",
              }}
            />

            Target SLA Benchmark
          </span>

          {/* Actual Turnaround Time within SLA */}

          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-xs"
              style={{
                backgroundColor: BRAND_BLUE,
              }}
            />

            Actual Turnaround Time (Within SLA)
          </span>

          {/* Actual Turnaround Time above SLA */}

          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-xs"
              style={{
                backgroundColor: BRAND_RED,
              }}
            />

            Actual Turnaround Time (SLA Breached)
          </span>
        </>
      ) : (
        <span className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span
            className="h-3 w-3 shrink-0 rounded-xs"
            style={{
              backgroundColor: BRAND_BLUE,
            }}
          />

          Actual Average Turnaround Time

          <span className="text-xs font-medium text-muted-foreground">
            (Filter by OPD, ER, or Inpatient to compare against SLA targets)
          </span>
        </span>
      )}
    </div>
  );
}