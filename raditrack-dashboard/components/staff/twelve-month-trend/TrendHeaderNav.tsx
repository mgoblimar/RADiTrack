"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { QC_PURPLE } from "./types";
import { SegmentedToggle } from "@/components/common/SegmentedToggle";

const PERIOD_MODES = [
  { value: "year", label: "Calendar year", hint: "January to December of the year you pick" },
  { value: "rolling", label: "Last 12 months", hint: "This month and the 11 months before it" },
] as const;

interface TrendHeaderNavProps {
  onStepYear: (step: number) => void;
  isPending: boolean;
  /** "rolling" or a calendar year such as "2026". */
  selectedPeriod: string;
  /** Year in the stepper (remembered while "Last 12 months" is on). */
  calendarYear: number;
  availableYears: number[];
  onSelectCalendarYear: (year: number) => void;
  onSelectRolling: () => void;
  /** The Last 12 months span, e.g. "Dec 2025 – Nov 2026". */
  rollingSpanLabel: string;
  triageLabel: string;
  isModalitySpecific: boolean;
  activeModalityLabel?: string;
  displayAnnualAvgHours: number;
  /** False when nothing was signed in the period (so the average is not 0 hrs). */
  hasCurrentData: boolean;
  /** Both periods have signed reports and the comparison is switched on. */
  hasPriorComparison: boolean;
  isFaster: boolean;
  isSlower: boolean;
  displayPctChange: number;
  comparePriorYear: boolean;
  onToggleComparePriorYear: () => void;
}

export function TrendHeaderNav({
  onStepYear,
  isPending,
  selectedPeriod,
  calendarYear,
  availableYears,
  onSelectCalendarYear,
  onSelectRolling,
  rollingSpanLabel,
  triageLabel,
  isModalitySpecific,
  activeModalityLabel,
  displayAnnualAvgHours,
  hasCurrentData,
  hasPriorComparison,
  isFaster,
  isSlower,
  displayPctChange,
  comparePriorYear,
  onToggleComparePriorYear,
}: TrendHeaderNavProps) {
  const isRolling = selectedPeriod === "rolling";
  const comparisonLabel = isRolling
    ? "prior 12 months"
    : String(calendarYear - 1);
  const stepButtonClass =
    "flex h-full w-8 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-qc-blue/5 hover:text-qc-navy disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-center xl:justify-between">
      {/* Period: calendar year first, then the last 12 months */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SegmentedToggle
          label="Trend period"
          options={PERIOD_MODES}
          value={isRolling ? "rolling" : "year"}
          onChange={(mode) =>
            mode === "rolling" ? onSelectRolling() : onSelectCalendarYear(calendarYear)
          }
        />

        {/* Calendar year: its own stepper. Last 12 months: the span as text. */}
        {isRolling ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-qc-navy">
            <CalendarDays className="h-3.5 w-3.5 text-qc-blue" />
            {rollingSpanLabel}
          </span>
        ) : (
          <div className="inline-flex h-10 items-center rounded-xl border border-border bg-white p-0.5 shadow-sm lg:h-9">
            <button
              type="button"
              onClick={() => onStepYear(-1)}
              disabled={isPending}
              className={stepButtonClass}
              title="Previous year"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={String(calendarYear)}
              onChange={(event) => onSelectCalendarYear(Number(event.target.value))}
              aria-label="Calendar year"
              className="h-full cursor-pointer appearance-none bg-transparent px-1.5 text-center text-xs font-extrabold text-qc-navy outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
            >
              {availableYears.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onStepYear(1)}
              disabled={isPending}
              className={stepButtonClass}
              title="Next year"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* What the two periods mean */}
        <div className="group/hint relative">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
            aria-label="What do the periods mean?"
            aria-describedby="trend-period-hint"
          >
            <Info className="h-4 w-4" />
          </button>
          <div
            id="trend-period-hint"
            role="tooltip"
            className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-72 translate-y-1 rounded-xl border border-border bg-card p-3 text-left text-[11px] leading-relaxed text-muted-foreground opacity-0 shadow-[0_16px_40px_rgba(5,14,64,0.14)] transition-all duration-150 group-focus-within/hint:translate-y-0 group-focus-within/hint:opacity-100 group-hover/hint:translate-y-0 group-hover/hint:opacity-100"
          >
            <p>
              <span className="font-extrabold text-qc-navy">Calendar year:</span>{" "}
              January to December of the year you pick.
            </p>
            <p className="mt-1.5">
              <span className="font-extrabold text-qc-navy">Last 12 months:</span>{" "}
              the month your date filter ends in plus the 11 months before it
              (now {rollingSpanLabel}), so it crosses into the previous year.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-muted-foreground">
          {triageLabel}
        </span>

        {isPending && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-qc-yellow" />
        )}
      </div>

      {/* Summary + options */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period summary: read-only text, not a pill */}
        <div className="hidden shrink-0 items-baseline gap-2 whitespace-nowrap pr-1 sm:flex">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {isModalitySpecific && activeModalityLabel ? `${activeModalityLabel} avg` : "Avg TAT"}
          </span>

          {hasCurrentData ? (
            <>
              <span className="text-sm font-extrabold text-qc-navy">
                {displayAnnualAvgHours} hrs
              </span>

              {hasPriorComparison && (
                <span
                  className={`inline-flex items-center gap-1 self-center text-[11px] font-extrabold ${
                    isFaster
                      ? "text-qc-blue"
                      : isSlower
                        ? "text-qc-red"
                        : "text-muted-foreground"
                  }`}
                >
                  {isFaster ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : isSlower ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : null}
                  {displayPctChange === 0
                    ? "Same as"
                    : `${Math.abs(displayPctChange)}% ${isFaster ? "faster than" : "longer than"}`}{" "}
                  {comparisonLabel}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">
              No signed reports in this period
            </span>
          )}
        </div>

        {/* Quick toggle for prior 12-month comparison */}
        <button
          type="button"
          onClick={onToggleComparePriorYear}
          className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 text-xs font-extrabold transition-all lg:h-9 ${
            comparePriorYear
              ? "border-[#7652B8]/40 bg-[#7652B8]/10 text-[#7652B8] shadow-sm"
              : "border-white/80 bg-white/75 text-muted-foreground hover:bg-white hover:text-qc-navy"
          }`}
          title="Toggle dashed line comparison with prior 12-month period"
          aria-pressed={comparePriorYear}
        >
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: comparePriorYear ? QC_PURPLE : "#94A3B8" }}
          />
          <span>
            {isRolling ? "Compare Prior 12 Months" : "Compare Prior Year"}
          </span>
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
            style={{
              backgroundColor: comparePriorYear ? QC_PURPLE : "#FFFFFF",
              borderColor: comparePriorYear ? QC_PURPLE : "#94A3B8",
            }}
          >
            {comparePriorYear && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
        </button>

      </div>
    </div>
  );
}
