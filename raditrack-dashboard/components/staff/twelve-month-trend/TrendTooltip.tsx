"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
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

// One layout for every view: header, one big number, one line per
// comparison, then an optional modality grid.
const CARD_CLASS =
  "w-[260px] rounded-xl border border-border bg-white p-3.5 text-[13px] shadow-[0_18px_45px_rgba(5,14,64,0.14)]";

/** % change from `previous` to `current`, or null when either is missing. */
function percentChange(current: number, previous: number): number | null {
  if (current <= 0 || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

const hrs = (hours: number, hasData = hours > 0) => (hasData ? `${hours} hrs` : "—");

/** ↓ 11% (faster, blue) / ↑ 8% (longer, red). Lower TAT is better. */
function ChangeChip({ change }: { change: number | null }) {
  if (change === null) return <span className="w-12" />;
  if (change === 0) {
    return <span className="w-12 text-right text-xs font-bold text-muted-foreground">same</span>;
  }
  const isFaster = change < 0;
  const Icon = isFaster ? ArrowDown : ArrowUp;
  return (
    <span
      className={`inline-flex w-12 items-center justify-end gap-0.5 text-xs font-extrabold ${
        isFaster ? "text-qc-blue" : "text-qc-red"
      }`}
      title={isFaster ? "Faster" : "Longer"}
    >
      <Icon className="h-3 w-3" strokeWidth={3} />
      {Math.abs(change)}%
    </span>
  );
}

function Header({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="text-sm font-extrabold text-qc-navy">{title}</p>
      <span className="text-xs font-semibold text-muted-foreground">{count}</span>
    </div>
  );
}

function Hero({ value, caption, color }: { value: string; caption: string; color: string }) {
  return (
    <div className="mt-2">
      <p className="text-2xl font-extrabold leading-none tracking-tight" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

/** "vs Oct '26   33.2 hrs   ↓ 11%": the compared value and the change on one line. */
function CompareLine({
  label,
  hours,
  current,
  dashed = false,
  color = "#94A3B8",
}: {
  label: string;
  hours: number;
  current: number;
  dashed?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {dashed ? (
          <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: color }} />
        ) : (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        )}
        vs {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="font-mono font-bold text-qc-navy">{hrs(hours)}</span>
        <ChangeChip change={percentChange(current, hours)} />
      </span>
    </div>
  );
}

interface ModalityRow {
  code: ModalityCode;
  label: string;
  color: string;
  hours: number;
  hasData: boolean;
  change: number | null;
}

/** Modality | this month | change vs previous month, in aligned columns. */
function ModalityGrid({ rows, previousLabel }: { rows: ModalityRow[]; previousLabel: string }) {
  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="mb-1 grid grid-cols-[1fr_auto_3rem] gap-x-2 text-xs font-bold text-muted-foreground">
        <span>By modality</span>
        <span className="text-right">This month</span>
        <span className="text-right" title={`Change vs ${previousLabel}`}>
          vs prev.
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.code} className="grid grid-cols-[1fr_auto_3rem] items-center gap-x-2">
            <span className="flex min-w-0 items-center gap-1.5 text-qc-navy">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="truncate">{row.label}</span>
            </span>
            <span
              className={`text-right font-mono font-bold ${
                row.hasData ? "text-qc-navy" : "text-muted-foreground"
              }`}
            >
              {hrs(row.hours, row.hasData)}
            </span>
            <ChangeChip change={row.change} />
          </div>
        ))}
      </div>
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

  // Overall and multi-modality views share one layout
  if (selectedModality === "ALL" || selectedModality === "MULTI") {
    const current = point.avgTatHours;
    const rows: ModalityRow[] = MODALITIES.map((m) => {
      const fromBreakdown = point.byModality?.[m.code];
      const hours = fromBreakdown?.avgTatHours ?? point[`${m.code}_avgTatHours`] ?? 0;
      const count = fromBreakdown?.totalFinalized ?? point[`${m.code}_totalFinalized`] ?? 0;
      const previous =
        fromBreakdown?.previousMonthAvgTatHours ?? point[`prevMonth_${m.code}_avgTatHours`] ?? 0;
      return {
        code: m.code,
        label: m.label,
        color: m.color,
        hours,
        hasData: count > 0,
        change: count > 0 ? percentChange(hours, previous) : null,
      };
    });

    return (
      <div className={CARD_CLASS}>
        <Header title={title} count={`${point.totalFinalized} signed`} />
        <Hero
          value={hrs(current)}
          caption={`Average TAT · ${triageLabel}`}
          color={QC_BLUE}
        />

        <div className="mt-2.5 space-y-1">
          <CompareLine
            label={previousMonthLabel}
            hours={point.previousMonthAvgTatHours ?? 0}
            current={current}
          />
          {comparePriorYear && (
            <CompareLine
              label={priorYearMonthLabel}
              hours={point.priorYearAvgTatHours ?? 0}
              current={current}
              color={QC_PURPLE}
              dashed
            />
          )}
        </div>

        <ModalityGrid rows={rows} previousLabel={previousMonthLabel} />
      </div>
    );
  }

  // Single-modality view
  const activeMod = MODALITIES.find((m) => m.code === selectedModality);
  const modLabel = activeMod?.label ?? selectedModality;
  const modColor = activeMod?.color ?? QC_BLUE;
  const current = point[`${selectedModality}_avgTatHours`] ?? 0;
  const modVol = point[`${selectedModality}_totalFinalized`] ?? 0;
  const overall = point.avgTatHours;
  const diffFromOverall =
    modVol > 0 && overall > 0 ? Number((current - overall).toFixed(1)) : null;

  return (
    <div className={CARD_CLASS}>
      <Header title={title} count={`${modVol} signed`} />
      <Hero
        value={hrs(current, modVol > 0)}
        caption={`${modLabel} average TAT · ${triageLabel}`}
        color={modColor}
      />

      <div className="mt-2.5 space-y-1">
        <CompareLine
          label={previousMonthLabel}
          hours={point[`prevMonth_${selectedModality}_avgTatHours`] ?? 0}
          current={modVol > 0 ? current : 0}
        />
        {comparePriorYear && (
          <CompareLine
            label={priorYearMonthLabel}
            hours={point[`prior_${selectedModality}_avgTatHours`] ?? 0}
            current={modVol > 0 ? current : 0}
            color={modColor}
            dashed
          />
        )}
      </div>

      <p className="mt-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
        Hospital average{" "}
        <span className="font-mono font-bold text-qc-navy">{hrs(overall)}</span>
        {diffFromOverall !== null && diffFromOverall !== 0 && (
          <>
            {" · "}
            <span className={diffFromOverall < 0 ? "font-bold text-qc-blue" : "font-bold text-qc-red"}>
              {Math.abs(diffFromOverall)} hrs {diffFromOverall < 0 ? "faster" : "slower"}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
