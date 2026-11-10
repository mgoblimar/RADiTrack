"use client";

import type {
  ModalityTatDisplayItem,
  PatientCategoryFilter,
} from "./types";

import { modalityLabel } from "./TatChartTicks";

/* =========================================================
   RADiTrack OFFICIAL BRAND COLORS
========================================================= */

const BRAND_BLUE = "#00357a";
const SECONDARY_BLUE = "#2d3e9d";
const BRAND_RED = "#7a0000";

interface TatChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: ModalityTatDisplayItem;
  }>;
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
    <div className="min-w-[210px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_14px_35px_rgba(5,14,64,0.14)]">
      {/* =====================================================
          TOOLTIP HEADER
      ===================================================== */}

      <div className="flex items-center justify-between gap-2">
        <p
          className="font-extrabold"
          style={{ color: BRAND_BLUE }}
        >
          {modalityLabel(point.modality)}
        </p>

        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-bold text-muted-foreground">
          {patientCategoryLabel}
        </span>
      </div>

      {/* =====================================================
          PERFORMANCE DETAILS
      ===================================================== */}

      <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">

        {/* Target SLA */}

        {hasTargetSla && point.target !== null && (
          <div className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2.5 w-3 rounded-xs border"
                style={{
                  borderColor: SECONDARY_BLUE,
                  backgroundColor: `${SECONDARY_BLUE}40`,
                }}
              />

              Target SLA
            </span>

            <strong style={{ color: SECONDARY_BLUE }}>
              {point.target} hrs
            </strong>
          </div>
        )}

        {/* Actual Turnaround Time */}

        <div className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-xs"
              style={{
                backgroundColor:
                  point.volume === 0
                    ? "#94A3B8"
                    : isBreach
                      ? BRAND_RED
                      : BRAND_BLUE,
              }}
            />

            Actual Turnaround Time
          </span>

          <strong
            style={{
              color:
                point.volume === 0
                  ? "#94A3B8"
                  : isBreach
                    ? BRAND_RED
                    : BRAND_BLUE,
            }}
          >
            {point.volume === 0
              ? "—"
              : `${point.avgTat} hrs`}
          </strong>
        </div>

        {/* Finalized examinations */}

        <div className="flex items-center justify-between gap-5">
          <span className="text-muted-foreground">
            Finalized
          </span>

          <strong style={{ color: BRAND_BLUE }}>
            {point.volume}
          </strong>
        </div>

        {/* =====================================================
            SLA PERFORMANCE STATUS
        ===================================================== */}

        <div className="border-t border-border pt-2">
          <span
            className={`font-bold ${
              point.volume === 0
                ? "text-muted-foreground"
                : !hasTargetSla
                  ? "text-muted-foreground"
                  : ""
            }`}
            style={
              point.volume > 0 && hasTargetSla
                ? {
                    color: isBreach
                      ? BRAND_RED
                      : BRAND_BLUE,
                  }
                : undefined
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