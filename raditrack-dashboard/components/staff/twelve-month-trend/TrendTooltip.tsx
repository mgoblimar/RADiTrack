"use client";

import type { MonthTrendData } from "@/app/actions";
import { ModalityCode } from "@/lib/enums";
import { MODALITIES, QC_BLUE, QC_NAVY, QC_PURPLE } from "./types";

interface TrendTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  selectedModality: "ALL" | "MULTI" | ModalityCode;
  comparePriorYear: boolean;
  priorPeriodLabel: string;
  triageLabel: string;
}

export function TrendTooltip({
  active,
  payload,
  label,
  selectedModality,
  comparePriorYear,
  priorPeriodLabel,
  triageLabel,
}: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload as MonthTrendData;
  if (!point) {
    return null;
  }

  // 1. Overall View
  if (selectedModality === "ALL") {
    const currentTat = point.avgTatHours;
    const priorTat = point.priorYearAvgTatHours ?? 0;
    let yoy: number | null = null;
    if (comparePriorYear && priorTat > 0 && currentTat > 0) {
      yoy = Number((((currentTat - priorTat) / priorTat) * 100).toFixed(1));
    }

    return (
      <div className="min-w-[240px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {point.totalFinalized} finalized
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold text-qc-blue">
              <span className="h-2 w-2 rounded-full bg-qc-blue" />
              Overall Avg TAT ({triageLabel})
            </span>
            <strong className="font-mono text-qc-navy">{currentTat}h</strong>
          </div>

          {comparePriorYear && priorTat > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: QC_PURPLE }}>
                <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: QC_PURPLE }} />
                {priorPeriodLabel}
              </span>
              <strong className="font-mono text-qc-navy">{priorTat}h</strong>
            </div>
          )}

          {yoy !== null && (
            <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
              <span className="text-muted-foreground">YoY Change</span>
              <span className={`font-extrabold ${yoy < 0 ? "text-qc-blue" : yoy > 0 ? "text-qc-red" : "text-muted-foreground"}`}>
                {yoy < 0 ? `${Math.abs(yoy)}% faster` : yoy > 0 ? `+${yoy}% longer` : "No change"}
              </span>
            </div>
          )}

          {point.byModality && (
            <div className="mt-2.5 border-t border-border pt-2">
              <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Modality Contribution
              </p>
              <div className="space-y-1">
                {MODALITIES.map((m) => {
                  const stats = point.byModality?.[m.code];
                  if (!stats) return null;
                  return (
                    <div key={m.code} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-muted-foreground">{m.label}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-qc-navy">
                          {stats.totalFinalized > 0 ? `${stats.avgTatHours}h` : "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({stats.totalFinalized})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Multi-Modality View
  if (selectedModality === "MULTI") {
    return (
      <div className="min-w-[260px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {point.totalFinalized} finalized
          </span>
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-1.5 text-[11px]">
            <span className="flex items-center gap-1.5 font-extrabold text-qc-navy">
              <span className="h-2 w-2 rounded-full bg-qc-navy" />
              Overall Hospital Avg
            </span>
            <strong className="font-mono text-qc-navy">{point.avgTatHours}h</strong>
          </div>

          {MODALITIES.map((m) => {
            const curHours = point[`${m.code}_avgTatHours`] ?? 0;
            const priHours = point[`prior_${m.code}_avgTatHours`] ?? 0;
            const vol = point[`${m.code}_totalFinalized`] ?? 0;
            return (
              <div key={m.code} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="font-medium text-qc-navy">{m.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-qc-navy">
                    {vol > 0 ? `${curHours}h` : "—"}
                  </span>
                  {comparePriorYear && priHours > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      (pri: {priHours}h)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Single-Modality View
  const activeMod = MODALITIES.find((m) => m.code === selectedModality);
  const modLabel = activeMod?.label ?? selectedModality;
  const modColor = activeMod?.color ?? QC_BLUE;
  const curTat = point[`${selectedModality}_avgTatHours`] ?? 0;
  const priTat = point[`prior_${selectedModality}_avgTatHours`] ?? 0;
  const modVol = point[`${selectedModality}_totalFinalized`] ?? 0;
  const overallTat = point.avgTatHours;

  let yoy: number | null = null;
  if (comparePriorYear && priTat > 0 && curTat > 0) {
    yoy = Number((((curTat - priTat) / priTat) * 100).toFixed(1));
  }

  const diffFromOverall = curTat > 0 && overallTat > 0 ? Number((curTat - overallTat).toFixed(1)) : null;

  return (
    <div className="min-w-[230px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {modVol} {modLabel} finalized
        </span>
      </div>

      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 font-bold" style={{ color: modColor }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: modColor }} />
            {modLabel} TAT
          </span>
          <strong className="font-mono text-qc-navy">{modVol > 0 ? `${curTat}h` : "—"}</strong>
        </div>

        {comparePriorYear && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: modColor }}>
              <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: modColor }} />
              {modLabel} ({priorPeriodLabel})
            </span>
            <strong className="font-mono text-qc-navy">{priTat > 0 ? `${priTat}h` : "—"}</strong>
          </div>
        )}

        {yoy !== null && (
          <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
            <span className="text-muted-foreground">YoY Change</span>
            <span className={`font-extrabold ${yoy < 0 ? "text-qc-blue" : yoy > 0 ? "text-qc-red" : "text-muted-foreground"}`}>
              {yoy < 0 ? `${Math.abs(yoy)}% faster` : yoy > 0 ? `+${yoy}% longer` : "No change"}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
          <span className="text-muted-foreground">Hospital Overall TAT</span>
          <span className="font-mono font-bold text-qc-navy">{overallTat}h</span>
        </div>

        {diffFromOverall !== null && (
          <div className="text-[10px] text-muted-foreground">
            {diffFromOverall === 0
              ? "Equal to hospital average"
              : diffFromOverall > 0
                ? `+${diffFromOverall}h higher than hospital average`
                : `${Math.abs(diffFromOverall)}h lower than hospital average`}
          </div>
        )}
      </div>
    </div>
  );
}
