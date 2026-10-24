"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, Check, Loader2, RotateCcw, X } from "lucide-react";
import {
  ExtendedTemporalPeriod,
  PatientCategoryFilter,
  TEMPORAL_LABELS,
} from "./types";

interface TatChartFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  patientCategory: PatientCategoryFilter;
  onSelectCategory: (category: PatientCategoryFilter) => void;
  temporalPeriod: ExtendedTemporalPeriod;
  onSelectPeriod: (period: ExtendedTemporalPeriod) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
  onApplyCustomRange: (start: string, end: string) => void;
  isPending: boolean;
  isFiltered: boolean;
  onResetFilters: () => void;
}

export function TatChartFilterPopover({
  isOpen,
  onClose,
  position,
  buttonRef,
  patientCategory,
  onSelectCategory,
  temporalPeriod,
  onSelectPeriod,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  onApplyCustomRange,
  isPending,
  isFiltered,
  onResetFilters,
}: TatChartFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  /* Close on outside click or Escape */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Chart filters"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 320,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-extrabold text-qc-navy">Filters</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
          aria-label="Close filters"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Patient Category */}
        <div>
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Patient Category
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "OPD", label: "OPD" },
                { id: "ER", label: "ER" },
                { id: "IN", label: "Inpatient" },
              ] as const
            ).map((cat) => {
              const isActive = patientCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${
                    isActive
                      ? "bg-qc-navy text-white shadow-xs"
                      : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Period */}
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Time Period
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                "ALL",
                "ROLLING_7D",
                "WEEK",
                "PAST_WEEK",
                "MONTH",
                "YEAR",
              ] as ExtendedTemporalPeriod[]
            ).map((period) => {
              const isActive = temporalPeriod === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => onSelectPeriod(period)}
                  className={`flex items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
                    isActive
                      ? "bg-qc-yellow text-qc-navy"
                      : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                  }`}
                >
                  <span>{TEMPORAL_LABELS[period]}</span>
                  {isActive && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onSelectPeriod("CUSTOM")}
            className={`mt-1.5 flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-[11px] font-bold transition-colors ${
              temporalPeriod === "CUSTOM"
                ? "bg-qc-blue text-white"
                : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
            }`}
          >
            <span>Custom range</span>
            {temporalPeriod === "CUSTOM" && <Check className="h-3 w-3" />}
          </button>

          {temporalPeriod === "CUSTOM" && (
            <div className="mt-2 rounded-xl bg-background p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                    From
                  </span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                    To
                  </span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[10px] font-bold text-qc-navy outline-none focus:border-qc-blue/25"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => onApplyCustomRange(customStartDate, customEndDate)}
                disabled={
                  isPending ||
                  !customStartDate ||
                  !customEndDate ||
                  customStartDate > customEndDate
                }
                className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-qc-yellow text-[10px] font-extrabold text-qc-navy transition-opacity disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Reset Filters */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 text-[10px] font-extrabold text-muted-foreground transition-colors hover:bg-qc-blue/5 hover:text-qc-blue"
          >
            <RotateCcw className="h-3 w-3" />
            Reset filters
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
