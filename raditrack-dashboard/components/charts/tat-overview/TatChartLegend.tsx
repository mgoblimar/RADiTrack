import React from "react";

interface TatChartLegendProps {
  hasTargetSla: boolean;
}

export function TatChartLegend({ hasTargetSla }: TatChartLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-[11px] font-semibold text-muted-foreground">
      {hasTargetSla ? (
        <>
          <span className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-xs border border-[#2C4897] bg-[#4A69BD]" />
            Target SLA (Wide Benchmark Bar)
          </span>

          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-xs bg-[#050E40]" />
            Actual TAT (Within SLA)
          </span>

          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-xs bg-[#C53030]" />
            Actual TAT (Above SLA / Breached)
          </span>
        </>
      ) : (
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-xs bg-[#050E40]" />
          Actual Average Turnaround Time (Filter by OPD, ER, or Inpatient to compare against SLA targets)
        </span>
      )}
    </div>
  );
}
