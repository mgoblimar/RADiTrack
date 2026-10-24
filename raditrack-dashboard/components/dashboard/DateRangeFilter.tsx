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
  Layers,
  Loader2,
  RotateCcw,
  Users,
  X,
} from "lucide-react";

import { type KpiPreset } from "@/app/actions";
import { ModalityCode, TriageLevel } from "@/lib/enums";

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
  selectedModality?: "ALL" | ModalityCode;
  onModalityChange?: (
    modality: "ALL" | ModalityCode,
  ) => void;
  selectedTriage?: "ALL" | TriageLevel;
  onTriageChange?: (
    triage: "ALL" | TriageLevel,
  ) => void;

  // Kept for compatibility with DashboardShell.
  telemetrySummary?: {
    presetLabel: string;
    dateRangeFormatted: string;
    totalVolume: number;
    finalizedCount: number;
    pendingReadingCount: number;
    pctOnTime: number;
  };
}

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

const PRESETS: {
  id: KpiPreset;
  label: string;
}[] = [
  { id: "ALL", label: "All Time" },
  { id: "TODAY", label: "Today" },
  { id: "ROLLING_7D", label: "Rolling 7 Days" },
  { id: "WEEK", label: "This Week" },
  { id: "LAST_WEEK", label: "Last Week" },
  { id: "MONTH", label: "This Month" },
  { id: "LAST_MONTH", label: "Last Month" },
  { id: "YEAR", label: "This Year" },
  { id: "CUSTOM", label: "Custom" },
];

const MODALITY_OPTIONS: {
  id: "ALL" | ModalityCode;
  label: string;
  dotColor?: string;
}[] = [
  { id: "ALL", label: "All Modalities" },
  {
    id: ModalityCode.XRAY,
    label: "X-ray",
    dotColor: "bg-blue-500",
  },
  {
    id: ModalityCode.US,
    label: "Ultrasound",
    dotColor: "bg-emerald-500",
  },
  {
    id: ModalityCode.CT,
    label: "CT-Scan",
    dotColor: "bg-amber-500",
  },
  {
    id: ModalityCode.MRI,
    label: "MRI",
    dotColor: "bg-purple-500",
  },
  {
    id: ModalityCode.MAMMO,
    label: "Mammogram",
    dotColor: "bg-pink-500",
  },
];

const PATIENT_CATEGORY_OPTIONS: {
  id: "ALL" | TriageLevel;
  label: string;
  dotColor?: string;
}[] = [
  {
    id: "ALL",
    label: "All Patient Categories",
  },
  {
    id: TriageLevel.ER,
    label: "Emergency (ER)",
    dotColor: "bg-rose-500",
  },
  {
    id: TriageLevel.OPD,
    label: "Outpatient (OPD)",
    dotColor: "bg-sky-500",
  },
  {
    id: TriageLevel.IN,
    label: "Inpatient (IN)",
    dotColor: "bg-amber-500",
  },
];

function getPosition(
  button: HTMLButtonElement | null,
  requestedWidth: number,
): PopoverPosition | null {
  if (!button) return null;

  const rect = button.getBoundingClientRect();
  const viewportPadding = 12;
  const width = Math.min(
    requestedWidth,
    window.innerWidth - viewportPadding * 2,
  );

  const left = Math.max(
    viewportPadding,
    Math.min(
      rect.left,
      window.innerWidth - width - viewportPadding,
    ),
  );

  return {
    top: rect.bottom + 8,
    left,
    width,
  };
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function DateRangeFilter({
  currentPreset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeApply,
  isPending = false,
  selectedModality = "ALL",
  onModalityChange,
  selectedTriage = "ALL",
  onTriageChange,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalityOpen, setIsModalityOpen] =
    useState(false);
  const [isCategoryOpen, setIsCategoryOpen] =
    useState(false);

  const [localStart, setLocalStart] =
    useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);

  const dateButtonRef =
    useRef<HTMLButtonElement>(null);
  const datePopoverRef =
    useRef<HTMLDivElement>(null);

  const modalityButtonRef =
    useRef<HTMLButtonElement>(null);
  const modalityPopoverRef =
    useRef<HTMLDivElement>(null);

  const categoryButtonRef =
    useRef<HTMLButtonElement>(null);
  const categoryPopoverRef =
    useRef<HTMLDivElement>(null);

  const [datePopoverPosition, setDatePopoverPosition] =
    useState<PopoverPosition>({
      top: 0,
      left: 0,
      width: 500,
    });

  const [modalityPopoverPosition, setModalityPopoverPosition] =
    useState<PopoverPosition>({
      top: 0,
      left: 0,
      width: 230,
    });

  const [categoryPopoverPosition, setCategoryPopoverPosition] =
    useState<PopoverPosition>({
      top: 0,
      left: 0,
      width: 230,
    });

  /* =========================================================
     Synchronize custom date inputs with parent state
  ========================================================= */

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  /* =========================================================
     Keep the date popover positioned correctly
  ========================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const position = getPosition(
        dateButtonRef.current,
        500,
      );

      if (position) {
        setDatePopoverPosition(position);
      }
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition,
      );
      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [isOpen]);

  /* =========================================================
     Keep the modality popover positioned correctly
  ========================================================= */

  useEffect(() => {
    if (!isModalityOpen) return;

    const updatePosition = () => {
      const position = getPosition(
        modalityButtonRef.current,
        230,
      );

      if (position) {
        setModalityPopoverPosition(position);
      }
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition,
      );
      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [isModalityOpen]);

  /* =========================================================
     Keep the Patient Category popover positioned correctly
  ========================================================= */

  useEffect(() => {
    if (!isCategoryOpen) return;

    const updatePosition = () => {
      const position = getPosition(
        categoryButtonRef.current,
        230,
      );

      if (position) {
        setCategoryPopoverPosition(position);
      }
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener(
        "resize",
        updatePosition,
      );
      window.removeEventListener(
        "scroll",
        updatePosition,
        true,
      );
    };
  }, [isCategoryOpen]);

  /* =========================================================
     Close popovers on outside click or Escape
  ========================================================= */

  useEffect(() => {
    if (!isOpen && !isModalityOpen && !isCategoryOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        isOpen &&
        !dateButtonRef.current?.contains(target) &&
        !datePopoverRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }

      if (
        isModalityOpen &&
        !modalityButtonRef.current?.contains(target) &&
        !modalityPopoverRef.current?.contains(target)
      ) {
        setIsModalityOpen(false);
      }

      if (
        isCategoryOpen &&
        !categoryButtonRef.current?.contains(target) &&
        !categoryPopoverRef.current?.contains(target)
      ) {
        setIsCategoryOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsModalityOpen(false);
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );
    document.addEventListener("keydown", handleKeyDown);

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
  }, [isOpen, isModalityOpen, isCategoryOpen]);

  /* =========================================================
     Active filter labels
  ========================================================= */

  const activePreset =
    PRESETS.find((preset) => preset.id === currentPreset) ??
    PRESETS[0];

  const activeModalityOption =
    MODALITY_OPTIONS.find(
      (option) => option.id === selectedModality,
    ) ?? MODALITY_OPTIONS[0];

  const activeCategoryOption =
    PATIENT_CATEGORY_OPTIONS.find(
      (option) => option.id === selectedTriage,
    ) ?? PATIENT_CATEGORY_OPTIONS[0];

  const isCustom = currentPreset === "CUSTOM";

  /* =========================================================
     Dropdown controls
  ========================================================= */

  const toggleDateDropdown = () => {
    if (isPending) return;

    setIsModalityOpen(false);
    setIsCategoryOpen(false);
    setIsOpen((previous) => !previous);
  };

  const toggleModalityDropdown = () => {
    if (isPending) return;

    setIsOpen(false);
    setIsCategoryOpen(false);
    setIsModalityOpen((previous) => !previous);
  };

  const toggleCategoryDropdown = () => {
    if (isPending) return;

    setIsOpen(false);
    setIsModalityOpen(false);
    setIsCategoryOpen((previous) => !previous);
  };

  /* =========================================================
     Date preset selection
  ========================================================= */

  const handleSelectPreset = (preset: KpiPreset) => {
    if (isPending) return;

    if (preset === "CUSTOM") {
      onPresetChange("CUSTOM");

      requestAnimationFrame(() => {
        const position = getPosition(
          dateButtonRef.current,
          500,
        );

        if (position) {
          setDatePopoverPosition(position);
        }
      });

      return;
    }

    onPresetChange(preset);
    setIsOpen(false);
  };

  /* =========================================================
     Apply custom date range
  ========================================================= */

  const handleApplyCustom = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !localStart ||
      !localEnd ||
      localStart > localEnd
    ) {
      return;
    }

    onCustomRangeApply(localStart, localEnd);
    setIsOpen(false);
  };

  /* =========================================================
     Quick custom date ranges
  ========================================================= */

  const handleQuickPastDays = (days: number) => {
    const end = new Date();
    const start = new Date();

    start.setDate(end.getDate() - days + 1);

    const nextStart = formatLocalDate(start);
    const nextEnd = formatLocalDate(end);

    setLocalStart(nextStart);
    setLocalEnd(nextEnd);

    onCustomRangeApply(nextStart, nextEnd);
    setIsOpen(false);
  };

  /* =========================================================
     Reset filters
  ========================================================= */

  const handleReset = () => {
    if (isPending) return;

    onPresetChange("ALL");
    setIsOpen(false);
  };

  const handleResetAll = () => {
    if (isPending) return;

    onPresetChange("ALL");
    onModalityChange?.("ALL");
    onTriageChange?.("ALL");

    setIsOpen(false);
    setIsModalityOpen(false);
    setIsCategoryOpen(false);
  };

  /* =========================================================
     Date range popover
  ========================================================= */

  const datePopover = isOpen ? (
    <div
      ref={datePopoverRef}
      role="dialog"
      aria-label="Time window"
      style={{
        position: "fixed",
        top: datePopoverPosition.top,
        left: datePopoverPosition.left,
        width: datePopoverPosition.width,
        zIndex: 9999,
      }}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
    >
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
          onClick={() => setIsOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
          aria-label="Close time window"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Date presets */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => {
            const isActive =
              currentPreset === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  handleSelectPreset(preset.id)
                }
                disabled={isPending}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                  isActive
                    ? "border-qc-blue/15 bg-qc-blue/10 text-qc-blue"
                    : "border-border bg-background text-qc-navy hover:border-qc-blue/15 hover:bg-qc-blue/5"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span>{preset.label}</span>

                {isActive && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom range inputs */}
      {isCustom && (
        <div className="border-t border-border bg-background/60 px-4 py-4">
          <div className="mb-3 text-xs font-extrabold text-qc-navy">
            Custom range
          </div>

          <form
            onSubmit={handleApplyCustom}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors focus-within:border-qc-blue/25">
                <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                  From
                </span>

                <input
                  type="date"
                  value={localStart}
                  onChange={(event) =>
                    setLocalStart(event.target.value)
                  }
                  max={localEnd || undefined}
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
                    setLocalEnd(event.target.value)
                  }
                  min={localStart || undefined}
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
                  { days: 7, label: "7D" },
                  { days: 14, label: "14D" },
                  { days: 30, label: "30D" },
                  { days: 90, label: "90D" },
                ].map((range) => (
                  <button
                    key={range.days}
                    type="button"
                    onClick={() =>
                      handleQuickPastDays(range.days)
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
                  localStart > localEnd
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

  /* =========================================================
     Modality filter popover
  ========================================================= */

  const modalityPopover = isModalityOpen ? (
    <div
      ref={modalityPopoverRef}
      role="dialog"
      aria-label="Filter by Modality"
      style={{
        position: "fixed",
        top: `${modalityPopoverPosition.top}px`,
        left: `${modalityPopoverPosition.left}px`,
        width: `${modalityPopoverPosition.width}px`,
        zIndex: 9999,
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-foreground shadow-[0_20px_50px_rgba(5,14,64,0.18)] backdrop-blur-xl"
    >
      <div className="mb-1 border-b border-border/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Select Modality
      </div>

      <div className="space-y-0.5">
        {MODALITY_OPTIONS.map((option) => {
          const isSelected =
            selectedModality === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onModalityChange?.(option.id);
                setIsModalityOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ${
                isSelected
                  ? "border border-qc-blue/15 bg-qc-blue/10 text-qc-blue"
                  : "border border-transparent text-qc-navy hover:border-qc-blue/15 hover:bg-qc-blue/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    option.dotColor ?? "bg-slate-300"
                  }`}
                />
                <span className="truncate">
                  {option.label}
                </span>
              </div>

              {isSelected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-qc-blue" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  /* =========================================================
     Patient Category filter popover
  ========================================================= */

  const categoryPopover = isCategoryOpen ? (
    <div
      ref={categoryPopoverRef}
      role="dialog"
      aria-label="Filter by Patient Category"
      style={{
        position: "fixed",
        top: `${categoryPopoverPosition.top}px`,
        left: `${categoryPopoverPosition.left}px`,
        width: `${categoryPopoverPosition.width}px`,
        zIndex: 9999,
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-foreground shadow-[0_20px_50px_rgba(5,14,64,0.18)] backdrop-blur-xl"
    >
      <div className="mb-1 border-b border-border/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Select Patient Category
      </div>

      <div className="space-y-0.5">
        {PATIENT_CATEGORY_OPTIONS.map((option) => {
          const isSelected =
            selectedTriage === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onTriageChange?.(option.id);
                setIsCategoryOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ${
                isSelected
                  ? "border border-qc-blue/15 bg-qc-blue/10 text-qc-blue"
                  : "border border-transparent text-qc-navy hover:border-qc-blue/15 hover:bg-qc-blue/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    option.dotColor ??
                    "border border-current opacity-40"
                  }`}
                />
                <span className="truncate">
                  {option.label}
                </span>
              </div>

              {isSelected && (
                <Check className="h-3.5 w-3.5 shrink-0 text-qc-blue" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  /* =========================================================
     Main filter bar
  ========================================================= */

  const hasActiveFilters =
    currentPreset !== "ALL" ||
    (selectedModality !== undefined &&
      selectedModality !== "ALL") ||
    (selectedTriage !== undefined &&
      selectedTriage !== "ALL");

  return (
    <div className="relative">
      <div className="flex min-h-[64px] items-center px-1 py-3 sm:px-2">
        <div className="flex w-full flex-wrap items-center gap-2.5">
          {/* Combined date and filter controls */}
          <div className="inline-flex max-w-full flex-wrap items-center rounded-2xl border border-border bg-background p-1 shadow-sm transition-all focus-within:border-qc-blue/30 sm:flex-nowrap">
            {/* Date range */}
            <button
              ref={dateButtonRef}
              type="button"
              onClick={toggleDateDropdown}
              disabled={isPending}
              className={`group inline-flex min-w-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left transition-all duration-150 ${
                isOpen
                  ? "border border-qc-navy bg-qc-navy text-white shadow-sm"
                  : isCustom
                    ? "bg-qc-blue/10 font-extrabold text-qc-blue"
                    : "font-extrabold text-qc-navy hover:bg-qc-blue/5"
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
                      : "text-muted-foreground group-hover:text-qc-blue"
                }`}
              />

              <span
                className={`truncate text-sm ${
                  isOpen ? "text-white" : "text-qc-navy"
                }`}
              >
                {isCustom
                  ? `${startDate} → ${endDate}`
                  : activePreset.label}
              </span>

              {isPending ? (
                <Loader2
                  className={`h-4 w-4 shrink-0 animate-spin ${
                    isOpen ? "text-qc-yellow" : "text-qc-blue"
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

            {/* Modality divider */}
            {onModalityChange && (
              <div className="mx-1 hidden h-5 w-px bg-border/80 sm:block" />
            )}

            {/* Modality filter */}
            {onModalityChange && (
              <button
                ref={modalityButtonRef}
                type="button"
                onClick={toggleModalityDropdown}
                disabled={isPending}
                className={`group inline-flex min-w-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left transition-all duration-150 ${
                  isModalityOpen
                    ? "border border-qc-navy bg-qc-navy text-white shadow-sm"
                    : selectedModality !== "ALL"
                      ? "bg-qc-blue/10 font-extrabold text-qc-blue"
                      : "font-extrabold text-qc-navy hover:bg-qc-blue/5"
                }`}
                aria-expanded={isModalityOpen}
                aria-haspopup="dialog"
                aria-label="Filter dashboard by modality"
              >
                <Layers
                  className={`h-4 w-4 shrink-0 ${
                    isModalityOpen
                      ? "text-qc-yellow"
                      : selectedModality !== "ALL"
                        ? "text-qc-blue"
                        : "text-muted-foreground group-hover:text-qc-blue"
                  }`}
                />

                <span
                  className={`truncate text-sm ${
                    isModalityOpen
                      ? "text-white"
                      : "text-qc-navy"
                  }`}
                >
                  {activeModalityOption.label}
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                    isModalityOpen
                      ? "rotate-180 text-white"
                      : "text-muted-foreground group-hover:text-qc-blue"
                  }`}
                />
              </button>
            )}

            {/* Patient Category divider */}
            {onTriageChange && (
              <div className="mx-1 hidden h-5 w-px bg-border/80 sm:block" />
            )}

            {/* Patient Category filter */}
            {onTriageChange && (
              <button
                ref={categoryButtonRef}
                type="button"
                onClick={toggleCategoryDropdown}
                disabled={isPending}
                className={`group inline-flex min-w-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left transition-all duration-150 ${
                  isCategoryOpen
                    ? "border border-qc-navy bg-qc-navy text-white shadow-sm"
                    : selectedTriage !== "ALL"
                      ? "bg-qc-blue/10 font-extrabold text-qc-blue"
                      : "font-extrabold text-qc-navy hover:bg-qc-blue/5"
                }`}
                aria-expanded={isCategoryOpen}
                aria-haspopup="dialog"
                aria-label="Filter dashboard by Patient Category"
                title="Filter by Patient Category"
              >
                <Users
                  className={`h-4 w-4 shrink-0 ${
                    isCategoryOpen
                      ? "text-qc-yellow"
                      : selectedTriage !== "ALL"
                        ? "text-qc-blue"
                        : "text-muted-foreground group-hover:text-qc-blue"
                  }`}
                />

                <span
                  className={`truncate text-sm ${
                    isCategoryOpen
                      ? "text-white"
                      : "text-qc-navy"
                  }`}
                >
                  {activeCategoryOption.label}
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                    isCategoryOpen
                      ? "rotate-180 text-white"
                      : "text-muted-foreground group-hover:text-qc-blue"
                  }`}
                />
              </button>
            )}
          </div>

          {/* Reset filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={isPending}
              title="Reset all filters to default"
              aria-label="Reset all filters"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground shadow-sm transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Render popovers outside the dashboard layout to avoid clipping */}
      {typeof document !== "undefined" &&
        isOpen &&
        createPortal(datePopover, document.body)}

      {typeof document !== "undefined" &&
        isModalityOpen &&
        createPortal(modalityPopover, document.body)}

      {typeof document !== "undefined" &&
        isCategoryOpen &&
        createPortal(categoryPopover, document.body)}
    </div>
  );
}