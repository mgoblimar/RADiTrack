"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Layers, X } from "lucide-react";
import { TriageLevel } from "@/lib/enums";
import { TRIAGE_OPTIONS } from "./types";

interface TrendFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    top: number;
    left: number;
    maxHeight: number;
    openAbove: boolean;
  };
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  selectedTriage: "ALL" | TriageLevel;
  onSelectTriage: (triage: "ALL" | TriageLevel) => void;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  availableYears: number[];
  onStepYear: (step: number) => void;
  comparePriorYear: boolean;
  onToggleComparePriorYear: () => void;
}

export function TrendFilterPopover({
  isOpen,
  onClose,
  position,
  buttonRef,
  selectedTriage,
  onSelectTriage,
  selectedPeriod,
  onSelectPeriod,
  availableYears,
  onStepYear,
  comparePriorYear,
  onToggleComparePriorYear,
}: TrendFilterPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

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
      aria-label="Historical trend options"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: 320,
        maxHeight:
          position.maxHeight > 0
            ? position.maxHeight
            : "calc(100vh - 24px)",
        zIndex: 9999,
      }}
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-extrabold text-qc-navy">
          Trend options
        </span>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
          aria-label="Close trend options"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable settings content */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="space-y-4">
          {/* Patient Category Filter */}
          <div>
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Patient Category
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {TRIAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelectTriage(opt.value as any)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold transition-all ${
                    selectedTriage === opt.value
                      ? "bg-qc-navy text-white shadow-sm"
                      : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedTriage === opt.value && (
                    <Check className="h-3.5 w-3.5 text-qc-yellow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rolling */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Period
            </p>

            <button
              type="button"
              onClick={() => onSelectPeriod("rolling")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-bold transition-colors ${
                selectedPeriod === "rolling"
                  ? "bg-qc-yellow text-qc-navy"
                  : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
              }`}
            >
              <span>Rolling 12 months</span>
              {selectedPeriod === "rolling" && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Years */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Calendar year
            </p>

            <div className="flex items-center rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => onStepYear(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                title="Previous year"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={
                  selectedPeriod === "rolling"
                    ? String(new Date().getFullYear())
                    : selectedPeriod
                }
                onChange={(event) => onSelectPeriod(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-extrabold text-qc-navy outline-none"
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                title="Next year"
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => onSelectPeriod(String(year))}
                  className={`rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${
                    selectedPeriod === String(year)
                      ? "bg-qc-blue text-white"
                      : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              Comparison
            </p>

            <button
              type="button"
              onClick={onToggleComparePriorYear}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                comparePriorYear
                  ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                Prior year
              </span>

              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  comparePriorYear
                    ? "border-qc-blue bg-qc-blue text-white"
                    : "border-border bg-card"
                }`}
              >
                {comparePriorYear && <Check className="h-3 w-3" />}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
