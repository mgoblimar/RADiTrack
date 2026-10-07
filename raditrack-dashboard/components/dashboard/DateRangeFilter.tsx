"use client";

import { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  RotateCcw,
  Calendar,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  Activity,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { type KpiPreset } from "@/app/actions";

export interface DateRangeFilterProps {
  currentPreset: KpiPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: KpiPreset) => void;
  onCustomRangeApply: (startDate: string, endDate: string) => void;
  isPending?: boolean;
  telemetrySummary?: {
    presetLabel: string;
    dateRangeFormatted: string;
    totalVolume: number;
    finalizedCount: number;
    pendingReadingCount: number;
    pctOnTime: number;
  };
}

const PRESETS: { id: KpiPreset; label: string; description: string }[] = [
  { id: "ALL", label: "All Time", description: "All historical exams in database" },
  { id: "TODAY", label: "Today", description: "Current calendar day (00:00–23:59)" },
  { id: "WEEK", label: "This Week", description: "Monday to Sunday active cohort" },
  { id: "LAST_WEEK", label: "Last Week", description: "Preceding full calendar week" },
  { id: "MONTH", label: "This Month", description: "1st of current month to today" },
  { id: "LAST_MONTH", label: "Last Month", description: "Previous full calendar month" },
  { id: "YEAR", label: "This Year", description: "January 1 to current date" },
  { id: "CUSTOM", label: "Custom Range", description: "Specific calendar date interval" },
];

export function DateRangeFilter({
  currentPreset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeApply,
  isPending = false,
  telemetrySummary,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Keep local dates synchronized when props change
  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  const activePresetObj = PRESETS.find((p) => p.id === currentPreset) || PRESETS[0];

  const handleSelectPreset = (preset: KpiPreset) => {
    if (preset === "CUSTOM") {
      onPresetChange("CUSTOM");
      // Keep open so user can pick dates
    } else {
      onPresetChange(preset);
      setIsOpen(false);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (localStart && localEnd) {
      onCustomRangeApply(localStart, localEnd);
      setIsOpen(false);
    }
  };

  const handleQuickPastDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);

    const formatIso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const sStr = formatIso(start);
    const eStr = formatIso(end);
    setLocalStart(sStr);
    setLocalEnd(eStr);
    onCustomRangeApply(sStr, eStr);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Consolidated Top-Level Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:px-4 shadow-sm backdrop-blur-sm">
        {/* Left: Dropdown Trigger & Quick Clear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition shadow-sm ${
              isOpen
                ? "bg-sky-600 text-white border-sky-500 shadow-sky-950/50"
                : currentPreset !== "ALL"
                ? "bg-sky-950/60 text-sky-200 border-sky-800/80 hover:bg-sky-900/50 hover:text-white"
                : "bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
            }`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <CalendarDays className={`h-4 w-4 ${currentPreset !== "ALL" ? "text-sky-400" : "text-slate-400"}`} />
            <span className="text-slate-400 font-normal">Time Window:</span>
            <span className="font-bold text-white">
              {currentPreset === "CUSTOM"
                ? `${startDate} → ${endDate}`
                : activePresetObj.label}
            </span>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin ml-1" />
            ) : (
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${
                  isOpen ? "rotate-180 text-white" : ""
                }`}
              />
            )}
          </button>

          {currentPreset !== "ALL" && (
            <button
              type="button"
              onClick={() => {
                onPresetChange("ALL");
                setIsOpen(false);
              }}
              title="Reset filter to All Time"
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Right: Active Cohort Summary Badge (Single-line Compact) */}
        {telemetrySummary && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-slate-200 font-medium">
                {telemetrySummary.totalVolume.toLocaleString()}
              </strong>{" "}
              Scans
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              {telemetrySummary.pctOnTime}% SLA
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="text-slate-500 text-[11px] font-mono">
              {telemetrySummary.dateRangeFormatted}
            </span>
          </div>
        )}
      </div>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-[500px] z-40 bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-sky-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Select Dashboard Time Window
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PRESETS.map((p) => {
              const isActive = currentPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  disabled={isPending}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition flex flex-col justify-center ${
                    isActive
                      ? "bg-sky-600 text-white font-semibold ring-1 ring-sky-400 shadow-sm"
                      : "bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-700"
                  } ${isPending ? "opacity-75 cursor-not-allowed" : ""}`}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Section */}
          <div className="border-t border-slate-800 pt-3">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Custom Date Range</span>
              <span className="text-[10px] text-slate-500">YYYY-MM-DD</span>
            </div>

            <form onSubmit={handleApplyCustom} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-slate-400 font-medium">From:</span>
                  <input
                    type="date"
                    value={localStart}
                    onChange={(e) => setLocalStart(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none w-full [color-scheme:dark]"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-slate-400 font-medium">To:</span>
                  <input
                    type="date"
                    value={localEnd}
                    onChange={(e) => setLocalEnd(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none w-full [color-scheme:dark]"
                    required
                  />
                </div>
              </div>

              {/* Quick Shortcuts & Apply Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="text-slate-500">Quick:</span>
                  {[
                    { days: 7, label: "7D" },
                    { days: 14, label: "14D" },
                    { days: 30, label: "30D" },
                    { days: 90, label: "90D" },
                  ].map((q) => (
                    <button
                      key={q.days}
                      type="button"
                      onClick={() => handleQuickPastDays(q.days)}
                      className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Apply Custom Range
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
