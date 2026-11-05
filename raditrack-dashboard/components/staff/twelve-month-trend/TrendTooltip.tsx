"use client";

import type { MonthTrendData } from "@/app/actions";
import { ModalityCode } from "@/lib/enums";
import { MODALITIES, QC_BLUE, QC_PURPLE } from "./types";

interface TrendTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: MonthTrendData }>;
  label?: string;
  selectedModality: "ALL" | "MULTI" | ModalityCode;
  comparePriorYear: boolean;
  /** Kept for callers; tooltip now labels the exact prior-year month. */
  priorPeriodLabel?: string;
  triageLabel: string;
}

const CARD_CLASS =
  "min-w-[250px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]";

/** % change from `previous` to `current`, or null when either is missing. */
function percentChange(current: number, previous: number): number | null {
  if (current <= 0 || previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function formatHours(hours: number, hasData = hours > 0): string {
  return hasData ? `${hours}h` : "—";
}

/** "12% faster" / "+8% longer" row; lower TAT is better. */
function ChangeRow({ label, change }: { label: string; change: number | null }) {
  if (change === null) return null;

  const tone =
    change < 0 ? "text-qc-blue" : change > 0 ? "text-qc-red" : "text-muted-foreground";
  const text =
    change < 0 ? `${Math.abs(change)}% faster` : change > 0 ? `+${change}% longer` : "No change";

  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-extrabold ${tone}`}>{text}</span>
    </div>
  );
}

function ValueRow({
  label,
  value,
  color,
  dashed = false,
}: {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 font-semibold" style={{ color }}>
        {dashed ? (
          <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: color }} />
        ) : (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        )}
        {label}
      </span>
      <strong className="font-mono text-qc-navy">{value}</strong>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <p className="font-extrabold text-qc-navy">{title}</p>
      <span className="text-[10px] font-semibold text-muted-foreground">{subtitle}</span>
    </div>
  );
}

export function TrendTooltip({
  active,
  payload,
  label,
  selectedModality,
  comparePriorYear,
  triageLabel,
}: TrendTooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) {
    return null;
  }

  const title = point.fullMonth || label || "";
  const previousMonthLabel = point.previousMonthLabel ?? "previous month";
  const priorYearMonthLabel = point.priorYearMonthLabel ?? "last year";

  // 1. Overall view
  if (selectedModality === "ALL") {
    const currentTat = point.avgTatHours;
    const previousMonthTat = point.previousMonthAvgTatHours ?? 0;
    const priorYearTat = point.priorYearAvgTatHours ?? 0;

    return (
      <div className={CARD_CLASS}>
        <Header title={title} subtitle={`${point.totalFinalized} finalized`} />

        <div className="mt-2.5 space-y-2">
          <ValueRow
            label={`Overall Avg TAT (${triageLabel})`}
            value={formatHours(currentTat)}
            color={QC_BLUE}
          />
          <ValueRow
            label={`Previous month (${previousMonthLabel})`}
            value={formatHours(previousMonthTat)}
            color="#94A3B8"
          />
          {comparePriorYear && (
            <ValueRow
              label={`Same month last year (${priorYearMonthLabel})`}
              value={formatHours(priorYearTat)}
              color={QC_PURPLE}
              dashed
            />
          )}

          <div className="space-y-1 border-t border-border/80 pt-1.5">
            <ChangeRow
              label="Change vs previous month"
              change={percentChange(currentTat, previousMonthTat)}
            />
            {comparePriorYear && (
              <ChangeRow
                label="Change vs same month last year"
                change={percentChange(currentTat, priorYearTat)}
              />
            )}
          </div>

          {point.byModality && (
            <div className="mt-2.5 border-t border-border pt-2">
              <p className="mb-1.5 flex justify-between text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <span>Modality (this month)</span>
                <span>Previous month</span>
              </p>
              <div className="space-y-1">
                {MODALITIES.map((m) => {
                  const stats = point.byModality?.[m.code];
                  if (!stats) return null;
                  return (
                    <div key={m.code} className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-muted-foreground">{m.label}</span>
                        <span className="font-mono font-bold text-qc-navy">
                          {formatHours(stats.avgTatHours, stats.totalFinalized > 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">({stats.totalFinalized})</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatHours(stats.previousMonthAvgTatHours, stats.previousMonthTotalFinalized > 0)}
                      </span>
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

  // 2. Multi-modality view
  if (selectedModality === "MULTI") {
    return (
      <div className={`${CARD_CLASS} min-w-[290px]`}>
        <Header title={title} subtitle={`${point.totalFinalized} finalized`} />

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
            const vol = point[`${m.code}_totalFinalized`] ?? 0;
            const prevMonthHours = point[`prevMonth_${m.code}_avgTatHours`] ?? 0;
            const priorYearHours = point[`prior_${m.code}_avgTatHours`] ?? 0;
            return (
              <div key={m.code} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="font-medium text-qc-navy">{m.label}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-qc-navy">{formatHours(curHours, vol > 0)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    prev. month {formatHours(prevMonthHours)}
                  </span>
                  {comparePriorYear && priorYearHours > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      · last year {priorYearHours}h
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

  // 3. Single-modality view
  const activeMod = MODALITIES.find((m) => m.code === selectedModality);
  const modLabel = activeMod?.label ?? selectedModality;
  const modColor = activeMod?.color ?? QC_BLUE;
  const curTat = point[`${selectedModality}_avgTatHours`] ?? 0;
  const modVol = point[`${selectedModality}_totalFinalized`] ?? 0;
  const prevMonthTat = point[`prevMonth_${selectedModality}_avgTatHours`] ?? 0;
  const priorYearTat = point[`prior_${selectedModality}_avgTatHours`] ?? 0;
  const overallTat = point.avgTatHours;
  const diffFromOverall =
    curTat > 0 && overallTat > 0 ? Number((curTat - overallTat).toFixed(1)) : null;

  return (
    <div className={CARD_CLASS}>
      <Header title={title} subtitle={`${modVol} ${modLabel} finalized`} />

      <div className="mt-2.5 space-y-2">
        <ValueRow label={`${modLabel} TAT`} value={formatHours(curTat, modVol > 0)} color={modColor} />
        <ValueRow
          label={`Previous month (${previousMonthLabel})`}
          value={formatHours(prevMonthTat)}
          color="#94A3B8"
        />
        {comparePriorYear && (
          <ValueRow
            label={`Same month last year (${priorYearMonthLabel})`}
            value={formatHours(priorYearTat)}
            color={modColor}
            dashed
          />
        )}

        <div className="space-y-1 border-t border-border/80 pt-1.5">
          <ChangeRow label="Change vs previous month" change={percentChange(curTat, prevMonthTat)} />
          {comparePriorYear && (
            <ChangeRow
              label="Change vs same month last year"
              change={percentChange(curTat, priorYearTat)}
            />
          )}
        </div>

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
