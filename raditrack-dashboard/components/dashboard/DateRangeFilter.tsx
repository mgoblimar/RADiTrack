"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";

import { type KpiPreset } from "@/app/actions";

export interface DateRangeFilterProps {
  currentPreset: KpiPreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: KpiPreset) => void;
  onCustomRangeApply: (
    startDate: string,
    endDate: string,
  ) => void;
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

const PRESETS: {
  id: KpiPreset;
  label: string;
}[] = [
  {
    id: "ALL",
    label: "All Time",
  },
  {
    id: "TODAY",
    label: "Today",
  },
  {
    id: "WEEK",
    label: "This Week",
  },
  {
    id: "LAST_WEEK",
    label: "Last Week",
  },
  {
    id: "MONTH",
    label: "This Month",
  },
  {
    id: "LAST_MONTH",
    label: "Last Month",
  },
  {
    id: "YEAR",
    label: "This Year",
  },
  {
    id: "CUSTOM",
    label: "Custom",
  },
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
  const [isOpen, setIsOpen] =
    useState(false);

  const [localStart, setLocalStart] =
    useState(startDate);

  const [localEnd, setLocalEnd] =
    useState(endDate);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // Close popover when clicking outside
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  // =========================================================
  // Keep local date values synchronized
  // =========================================================

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  // =========================================================
  // Active preset
  // =========================================================

  const activePreset =
    PRESETS.find(
      (preset) =>
        preset.id === currentPreset,
    ) ?? PRESETS[0];

  // =========================================================
  // Preset selection
  // =========================================================

  const handleSelectPreset = (
    preset: KpiPreset,
  ) => {
    if (isPending) {
      return;
    }

    if (preset === "CUSTOM") {
      onPresetChange("CUSTOM");
      return;
    }

    onPresetChange(preset);
    setIsOpen(false);
  };

  // =========================================================
  // Custom date range
  // =========================================================

  const handleApplyCustom = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!localStart || !localEnd) {
      return;
    }

    if (localStart > localEnd) {
      return;
    }

    onCustomRangeApply(
      localStart,
      localEnd,
    );

    setIsOpen(false);
  };

  // =========================================================
  // Quick range helpers
  // =========================================================

  const handleQuickPastDays = (
    days: number,
  ) => {
    const end = new Date();
    const start = new Date();

    start.setDate(
      end.getDate() - days + 1,
    );

    const formatIso = (
      date: Date,
    ) => {
      const year =
        date.getFullYear();

      const month = String(
        date.getMonth() + 1,
      ).padStart(2, "0");

      const day = String(
        date.getDate(),
      ).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const nextStart =
      formatIso(start);

    const nextEnd =
      formatIso(end);

    setLocalStart(nextStart);
    setLocalEnd(nextEnd);

    onCustomRangeApply(
      nextStart,
      nextEnd,
    );

    setIsOpen(false);
  };

  const handleReset = () => {
    if (isPending) {
      return;
    }

    onPresetChange("ALL");
    setIsOpen(false);
  };

  const isCustom =
    currentPreset === "CUSTOM";

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* =====================================================
          COMPACT FILTER BAR
          ===================================================== */}

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
        {/* Left side */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue sm:flex">
            <CalendarDays className="h-4 w-4" />
          </div>

          <button
            type="button"
            onClick={() =>
              setIsOpen(
                (previous) =>
                  !previous,
              )
            }
            disabled={isPending}
            className={`group inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 ${
              isOpen
                ? "border-qc-navy bg-qc-navy text-white"
                : isCustom
                  ? "border-qc-blue/20 bg-qc-blue/5 text-qc-blue hover:bg-qc-blue/10"
                  : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
            }`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
          >
            <CalendarDays
              className={`h-4 w-4 shrink-0 ${
                isOpen
                  ? "text-qc-yellow"
                  : isCustom
                    ? "text-qc-blue"
                    : "text-muted-foreground"
              }`}
            />

            <span className="text-[11px] font-bold text-muted-foreground">
              Window
            </span>

            <span
              className={`truncate text-sm font-extrabold ${
                isOpen
                  ? "text-white"
                  : "text-qc-navy"
              }`}
            >
              {isCustom
                ? `${startDate} → ${endDate}`
                : activePreset.label}
            </span>

            {isPending ? (
              <Loader2
                className={`h-4 w-4 shrink-0 animate-spin ${
                  isOpen
                    ? "text-qc-yellow"
                    : "text-qc-blue"
                }`}
              />
            ) : (
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                  isOpen
                    ? "rotate-180 text-white"
                    : "text-muted-foreground group-hover:text-qc-blue"
                }`}
              />
            )}
          </button>

          {currentPreset !== "ALL" && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              title="Reset to All Time"
              aria-label="Reset time window"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ===================================================
            TELEMETRY
            =================================================== */}

        {telemetrySummary && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-qc-yellow" />

              <strong className="font-extrabold text-qc-navy">
                {telemetrySummary.totalVolume.toLocaleString()}
              </strong>

              <span className="text-muted-foreground">
                scans
              </span>
            </div>

            <span className="hidden text-border sm:inline">
              /
            </span>

            <div className="flex items-center gap-1.5 font-extrabold text-qc-blue">
              <CheckCircle2 className="h-3.5 w-3.5" />

              {telemetrySummary.pctOnTime}%
              <span className="font-semibold text-muted-foreground">
                SLA
              </span>
            </div>

            {telemetrySummary.pendingReadingCount >
              0 && (
              <>
                <span className="hidden text-border sm:inline">
                  /
                </span>

                <div className="font-extrabold text-qc-orange">
                  {telemetrySummary.pendingReadingCount}
                  <span className="ml-1 font-semibold text-muted-foreground">
                    pending
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          FILTER POPOVER
          ===================================================== */}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.12)] animate-in fade-in zoom-in-95 duration-150 sm:right-auto sm:w-[540px]">
          {/* Popover header */}
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
                <Filter className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-qc-navy">
                  Time window
                </h3>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Select the period used by the dashboard
                  metrics.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
              aria-label="Close time window"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* =================================================
              PRESET GRID
              ================================================= */}

          <div className="px-5 py-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Quick periods
              </span>

              {isPending && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-qc-blue">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map(
                (preset) => {
                  const isActive =
                    currentPreset ===
                    preset.id;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        handleSelectPreset(
                          preset.id,
                        )
                      }
                      disabled={isPending}
                      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                        isActive
                          ? "border-qc-blue/15 bg-qc-blue/10 text-qc-blue"
                          : "border-border bg-background text-qc-navy hover:border-qc-blue/15 hover:bg-qc-blue/5"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span>
                        {preset.label}
                      </span>

                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* =================================================
              CUSTOM RANGE
              ================================================= */}

          {isCustom && (
            <div className="border-t border-border bg-background/60 px-5 py-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-qc-blue" />

                <span className="text-xs font-extrabold text-qc-navy">
                  Custom range
                </span>
              </div>

              <form
                onSubmit={
                  handleApplyCustom
                }
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 transition-colors focus-within:border-qc-blue/25">
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                      From
                    </span>

                    <input
                      type="date"
                      value={localStart}
                      onChange={(event) =>
                        setLocalStart(
                          event.target.value,
                        )
                      }
                      max={localEnd || undefined}
                      required
                      className="min-w-0 w-full bg-transparent text-xs font-bold text-qc-navy outline-none"
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 transition-colors focus-within:border-qc-blue/25">
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                      To
                    </span>

                    <input
                      type="date"
                      value={localEnd}
                      onChange={(event) =>
                        setLocalEnd(
                          event.target.value,
                        )
                      }
                      min={
                        localStart ||
                        undefined
                      }
                      required
                      className="min-w-0 w-full bg-transparent text-xs font-bold text-qc-navy outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Quick
                    </span>

                    {[
                      {
                        days: 7,
                        label: "7D",
                      },
                      {
                        days: 14,
                        label: "14D",
                      },
                      {
                        days: 30,
                        label: "30D",
                      },
                      {
                        days: 90,
                        label: "90D",
                      },
                    ].map((range) => (
                      <button
                        key={
                          range.days
                        }
                        type="button"
                        onClick={() =>
                          handleQuickPastDays(
                            range.days,
                          )
                        }
                        className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-extrabold text-qc-navy transition-colors hover:border-qc-blue/15 hover:bg-qc-blue/5 hover:text-qc-blue"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      !localStart ||
                      !localEnd ||
                      localStart >
                        localEnd
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-xs font-extrabold text-qc-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5" />
                    )}

                    Apply range
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================
              CURRENT RANGE FOOTER
              ================================================= */}

          <div className="border-t border-border px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {telemetrySummary?.dateRangeFormatted ??
                  "All recorded scans"}
              </span>

              <span className="text-[10px] font-bold text-qc-navy">
                {telemetrySummary?.finalizedCount ??
                  0}{" "}
                finalized
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}