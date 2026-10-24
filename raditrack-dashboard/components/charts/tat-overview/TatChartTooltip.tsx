"use client";

import type { PatientCategoryFilter } from "./types";

interface TatChartTooltipProps {
  active?: boolean;
  payload?: any[];
  hasTargetSla: boolean;
  patientCategory: PatientCategoryFilter;
}

export function TatChartTooltip({
  active,
  payload,
  hasTargetSla,
  patientCategory,
}: TatChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const isBreach =
    hasTargetSla &&
    point.target !== null &&
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
        {hasTargetSla && point.target !== null && (
          <div className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2.5 w-3 rounded-xs border border-[#2C4897] bg-[#4A69BD]" />
              Target SLA
            </span>
            <strong className="text-qc-navy">
              {point.target} hrs
            </strong>
          </div>
        )}

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
            {point.avgTat} hrs
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
                : !hasTargetSla
                  ? "font-semibold text-muted-foreground text-[10px]"
                  : isBreach
                    ? "font-extrabold text-[#C53030]"
                    : "font-extrabold text-qc-blue"
            }
          >
            {point.volume === 0
              ? "No finalized scans"
              : !hasTargetSla
                ? "Target SLA applies per category (OPD / ER / IN)"
                : isBreach
                  ? "Above SLA (Breached)"
                  : "Within SLA Benchmark"}
          </span>
        </div>
      </div>
    </div>
  );
}
