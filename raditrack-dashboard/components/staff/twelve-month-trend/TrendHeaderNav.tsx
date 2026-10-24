"use client";

import {
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { QC_PURPLE } from "./types";

interface TrendHeaderNavProps {
  onStepYear: (step: number) => void;
  isPending: boolean;
  selectedPeriod: string;
  periodLabel: string;
  triageLabel: string;
  isModalitySpecific: boolean;
  activeModalityLabel?: string;
  displayAnnualAvgHours: number;
  hasPriorComparison: boolean;
  isFaster: boolean;
  isSlower: boolean;
  displayPctChange: number;
  comparePriorYear: boolean;
  onToggleComparePriorYear: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  hasActiveFilters: boolean;
}

export function TrendHeaderNav({
  onStepYear,
  isPending,
  selectedPeriod,
  periodLabel,
  triageLabel,
  isModalitySpecific,
  activeModalityLabel,
  displayAnnualAvgHours,
  hasPriorComparison,
  isFaster,
  isSlower,
  displayPctChange,
  comparePriorYear,
  onToggleComparePriorYear,
  settingsButtonRef,
  isSettingsOpen,
  onToggleSettings,
  hasActiveFilters,
}: TrendHeaderNavProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Period navigation */}
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onStepYear(-1)}
          disabled={isPending || selectedPeriod === "rolling"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
          title="Previous year"
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-qc-blue" />
          <span className="max-w-[260px] truncate text-[11px] font-extrabold text-qc-navy">
            {periodLabel} • {triageLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onStepYear(1)}
          disabled={isPending || selectedPeriod === "rolling"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
          title="Next year"
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {isPending && (
          <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-qc-yellow" />
        )}
      </div>

      {/* Summary + options */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden items-center gap-3 rounded-xl bg-background px-3 py-2 sm:flex">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
              {isModalitySpecific && activeModalityLabel ? `${activeModalityLabel} Avg` : "Avg TAT"}
            </span>
            <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
              {displayAnnualAvgHours}h
            </span>
          </div>

          {hasPriorComparison && (
            <>
              <span className="h-3.5 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                {isFaster ? (
                  <TrendingDown className="h-3 w-3 text-qc-blue" />
                ) : isSlower ? (
                  <TrendingUp className="h-3 w-3 text-qc-red" />
                ) : null}

                <span
                  className={`text-xs font-extrabold ${
                    isFaster
                      ? "text-qc-blue"
                      : isSlower
                        ? "text-qc-red"
                        : "text-muted-foreground"
                  }`}
                >
                  {displayPctChange === 0
                    ? "No change"
                    : `${Math.abs(displayPctChange)}% ${isFaster ? "faster" : "longer"}`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Quick toggle for prior 12-month comparison */}
        <button
          type="button"
          onClick={onToggleComparePriorYear}
          className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
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
            {selectedPeriod === "rolling" ? "Compare Prior 12m" : "Compare Prior Year"}
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

        {/* View Options Popover Trigger */}
        <button
          ref={settingsButtonRef}
          type="button"
          onClick={onToggleSettings}
          className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
            isSettingsOpen || hasActiveFilters
              ? "border-qc-navy bg-qc-navy text-white shadow-[0_6px_14px_rgba(5,14,64,0.12)]"
              : "border-white/80 bg-white/75 text-qc-navy shadow-sm hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
          }`}
          aria-expanded={isSettingsOpen}
          aria-haspopup="dialog"
        >
          <CalendarDays
            className={`h-3.5 w-3.5 ${
              isSettingsOpen || hasActiveFilters
                ? "text-qc-yellow"
                : "text-qc-blue"
            }`}
          />
          <span>View</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              isSettingsOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
}
