"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  Calendar,
  Check,
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

  // Kept for compatibility with DashboardShell.
  // Intentionally not displayed in this component.
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
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStart, setLocalStart] =
    useState(startDate);
  const [localEnd, setLocalEnd] =
    useState(endDate);

  const buttonRef =
    useRef<HTMLButtonElement>(null);

  const popoverRef =
    useRef<HTMLDivElement>(null);

  const [popoverPosition, setPopoverPosition] =
    useState({
      top: 0,
      left: 0,
      width: 500,
    });

  // =========================================================
  // Keep local date values synchronized
  // =========================================================

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  // =========================================================
  // Position the dropdown
  // =========================================================

  const updatePopoverPosition = () => {
    if (!buttonRef.current) {
      return;
    }

    const rect =
      buttonRef.current.getBoundingClientRect();

    const viewportPadding = 12;

    const availableWidth =
      window.innerWidth -
      viewportPadding * 2;

    const width = Math.min(
      500,
      availableWidth,
    );

    let left = rect.left;

    if (
      left + width >
      window.innerWidth - viewportPadding
    ) {
      left =
        window.innerWidth -
        width -
        viewportPadding;
    }

    left = Math.max(
      viewportPadding,
      left,
    );

    const top = rect.bottom + 8;

    setPopoverPosition({
      top,
      left,
      width,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();

    const handleResize = () => {
      updatePopoverPosition();
    };

    const handleScroll = () => {
      updatePopoverPosition();
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );
    };
  }, [isOpen]);

  // =========================================================
  // Close when clicking outside / Escape
  // =========================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        buttonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      if (
        popoverRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

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
  // Active preset
  // =========================================================

  const activePreset =
    PRESETS.find(
      (preset) =>
        preset.id === currentPreset,
    ) ?? PRESETS[0];

  const isCustom =
    currentPreset === "CUSTOM";

  // =========================================================
  // Open / close dropdown
  // =========================================================

  const toggleDropdown = () => {
    if (isPending) {
      return;
    }

    setIsOpen((previous) => !previous);
  };

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

      requestAnimationFrame(() => {
        updatePopoverPosition();
      });

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
  // Quick custom ranges
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

  // =========================================================
  // Reset
  // =========================================================

  const handleReset = () => {
    if (isPending) {
      return;
    }

    onPresetChange("ALL");
    setIsOpen(false);
  };

  // =========================================================
  // Popover
  // =========================================================

  const popover = isOpen ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Time window"
      style={{
        position: "fixed",
        top: popoverPosition.top,
        left: popoverPosition.left,
        width: popoverPosition.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qc-blue/10 text-qc-blue">
            <Filter className="h-3.5 w-3.5" />
          </div>

          <span className="text-sm font-extrabold text-qc-navy">
            Time window
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsOpen(false)
          }
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
          aria-label="Close time window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Presets */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => {
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
                className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
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
          })}
        </div>
      </div>

      {/* Custom range */}
      {isCustom && (
        <div className="border-t border-border bg-background/60 px-4 py-4">
          <div className="mb-3 text-xs font-extrabold text-qc-navy">
            Custom range
          </div>

          <form
            onSubmit={
              handleApplyCustom
            }
            className="space-y-4"
          >
            {/* Date inputs */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors focus-within:border-qc-blue/25">
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
                  max={
                    localEnd ||
                    undefined
                  }
                  required
                  className="min-w-0 w-full bg-transparent text-xs font-bold text-qc-navy outline-none"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors focus-within:border-qc-blue/25">
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

            {/* Quick ranges + apply */}
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
                    key={range.days}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-qc-yellow px-4 py-2.5 text-xs font-extrabold text-qc-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calendar className="h-3.5 w-3.5" />
                )}

                Apply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative">
      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <div className="flex min-h-[68px] items-center px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          {/* One icon only */}
          <button
            ref={buttonRef}
            type="button"
            onClick={toggleDropdown}
            disabled={isPending}
            className={`group inline-flex min-w-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-150 ${
              isOpen
                ? "border-qc-navy bg-qc-navy text-white"
                : isCustom
                  ? "border-qc-blue/20 bg-qc-blue/5 text-qc-blue hover:bg-qc-blue/10"
                  : "border-border bg-background text-qc-navy hover:border-qc-blue/20 hover:bg-qc-blue/5"
            }`}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label="Change time window"
          >
            <Calendar
              className={`h-4 w-4 shrink-0 ${
                isOpen
                  ? "text-qc-yellow"
                  : isCustom
                    ? "text-qc-blue"
                    : "text-muted-foreground"
              }`}
            />

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

          {/* Reset */}
          {currentPreset !== "ALL" && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              title="Reset to All Time"
              aria-label="Reset time window"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Render outside the dashboard layout so it cannot be clipped */}
      {typeof document !== "undefined" &&
        isOpen &&
        createPortal(
          popover,
          document.body,
        )}
    </div>
  );
}