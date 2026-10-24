"use client";

import { ModalityCode } from "@/lib/enums";
import { MODALITIES, ModalityConfig, QC_PURPLE } from "./types";

interface TrendLegendProps {
  selectedModality: "ALL" | "MULTI" | ModalityCode;
  selectedPeriodLabel: string;
  priorPeriodLabel: string;
  comparePriorYear: boolean;
  isModalitySpecific: boolean;
  activeModalityConfig: ModalityConfig | null;
  displayAnnualFinalized: number;
}

export function TrendLegend({
  selectedModality,
  selectedPeriodLabel,
  priorPeriodLabel,
  comparePriorYear,
  isModalitySpecific,
  activeModalityConfig,
  displayAnnualFinalized,
}: TrendLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[10px]">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {selectedModality === "ALL" && (
          <>
            <span className="flex items-center gap-1.5 font-semibold text-qc-navy">
              <span className="h-2.5 w-2.5 rounded-full bg-qc-blue" />
              {selectedPeriodLabel} (Solid Straight Line)
            </span>

            {comparePriorYear && (
              <span
                className="flex items-center gap-1.5 font-semibold"
                style={{ color: QC_PURPLE }}
              >
                <span
                  className="h-0 w-5 border-t-2 border-dashed"
                  style={{ borderColor: QC_PURPLE }}
                />
                {priorPeriodLabel} (Dashed Line)
              </span>
            )}
          </>
        )}

        {selectedModality === "MULTI" && (
          <>
            <span className="flex items-center gap-1.5 font-bold text-qc-navy">
              <span className="h-0 w-4 border-t-2 border-dashed border-qc-navy" />
              Hospital Overall Avg
            </span>

            {MODALITIES.map((m) => (
              <span
                key={m.code}
                className="flex items-center gap-1.5 font-semibold text-qc-navy"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
                {m.label} (Solid)
              </span>
            ))}

            {comparePriorYear && (
              <span className="font-semibold text-muted-foreground italic">
                * Dashed lines: {priorPeriodLabel}
              </span>
            )}
          </>
        )}

        {isModalitySpecific && activeModalityConfig && (
          <>
            <span className="flex items-center gap-1.5 font-semibold text-qc-navy">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeModalityConfig.color }}
              />
              {activeModalityConfig.label} ({selectedPeriodLabel} — Solid Straight Line)
            </span>

            {comparePriorYear && (
              <span
                className="flex items-center gap-1.5 font-semibold"
                style={{ color: activeModalityConfig.color }}
              >
                <span
                  className="h-0 w-5 border-t-2 border-dashed"
                  style={{ borderColor: activeModalityConfig.color }}
                />
                {activeModalityConfig.label} ({priorPeriodLabel} — Dashed Line)
              </span>
            )}

            <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
              <span className="h-0 w-4 border-t-2 border-dotted border-slate-400" />
              Hospital Overall Average Benchmark
            </span>
          </>
        )}
      </div>

      <span className="font-semibold text-muted-foreground">
        {displayAnnualFinalized} finalized exams
      </span>
    </div>
  );
}
