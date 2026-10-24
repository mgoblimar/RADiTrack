"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  fetchYearlyTrendAction,
  type TwelveMonthTrendResult,
} from "@/app/actions";

import { ModalityCode, TriageLevel } from "@/lib/enums";

import {
  MODALITIES,
  TRIAGE_OPTIONS,
  type TwelveMonthTrendChartProps,
} from "./twelve-month-trend/types";

import { TrendHeaderNav } from "./twelve-month-trend/TrendHeaderNav";
import { TrendModalityBar } from "./twelve-month-trend/TrendModalityBar";
import { TrendChartCanvas } from "./twelve-month-trend/TrendChartCanvas";
import { TrendLegend } from "./twelve-month-trend/TrendLegend";
import { TrendFilterPopover } from "./twelve-month-trend/TrendFilterPopover";

export { type TwelveMonthTrendChartProps } from "./twelve-month-trend/types";

export function TwelveMonthTrendChart({
  data: initialData,
}: TwelveMonthTrendChartProps) {
  const [data, setData] =
    useState<TwelveMonthTrendResult>(initialData);

  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(initialData.selectedPeriod || "rolling");

  const [selectedTriage, setSelectedTriage] =
    useState<"ALL" | TriageLevel>("ALL");

  const [comparePriorYear, setComparePriorYear] =
    useState(true);

  const [selectedModality, setSelectedModality] =
    useState<"ALL" | "MULTI" | ModalityCode>("ALL");

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  /* =========================================================
     Preserve selected filters during automatic data refreshes
  ========================================================= */

  const selectedPeriodRef = useRef(selectedPeriod);
  selectedPeriodRef.current = selectedPeriod;

  const selectedTriageRef = useRef(selectedTriage);
  selectedTriageRef.current = selectedTriage;

  useEffect(() => {
    const currentPeriod = selectedPeriodRef.current;
    const currentTriage = selectedTriageRef.current;

    // Use incoming data directly when the default filters are active.
    if (
      currentPeriod === "rolling" &&
      currentTriage === "ALL"
    ) {
      setData(initialData);
    } else {
      // Re-fetch with the active filters to preserve the user's selection.
      startTransition(async () => {
        try {
          const result = await fetchYearlyTrendAction(
            currentPeriod,
            currentTriage,
          );

          setData(result);
        } catch (error) {
          console.error(
            "Failed to refresh yearly Turnaround Time trend:",
            error,
          );
        }
      });
    }
  }, [initialData]);

  /* =========================================================
     Settings popover
  ========================================================= */

  const settingsButtonRef =
    useRef<HTMLButtonElement>(null);

  const settingsPopoverRef =
    useRef<HTMLDivElement>(null);

  const [settingsPosition, setSettingsPosition] =
    useState({
      top: 0,
      left: 0,
      maxHeight: 0,
      openAbove: false,
    });

  /* =========================================================
     Target year
  ========================================================= */

  const currentTargetYear = (() => {
    if (selectedPeriod === "rolling") {
      return new Date().getFullYear();
    }

    const parsed = Number.parseInt(selectedPeriod, 10);

    return Number.isNaN(parsed)
      ? new Date().getFullYear()
      : parsed;
  })();

  /* =========================================================
     Position settings popover
  ========================================================= */

  const updateSettingsPosition = () => {
    if (!settingsButtonRef.current) return;

    const rect =
      settingsButtonRef.current.getBoundingClientRect();

    const viewportPadding = 12;
    const gap = 8;
    const minPopoverHeight = 220;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      320,
      window.innerWidth - viewportPadding * 2,
    );

    const left = Math.max(
      viewportPadding,
      Math.min(
        rect.right - width,
        window.innerWidth - width - viewportPadding,
      ),
    );

    const spaceBelow =
      viewportHeight -
      rect.bottom -
      viewportPadding -
      gap;

    const spaceAbove =
      rect.top -
      viewportPadding -
      gap;

    const shouldOpenAbove =
      spaceBelow < minPopoverHeight &&
      spaceAbove > spaceBelow;

    const availableHeight = Math.max(
      180,
      Math.min(
        600,
        shouldOpenAbove ? spaceAbove : spaceBelow,
      ),
    );

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top -
            gap -
            Math.min(
              availableHeight,
              Math.max(180, spaceAbove),
            ),
        )
      : rect.bottom + gap;

    setSettingsPosition({
      top,
      left,
      maxHeight: availableHeight,
      openAbove: shouldOpenAbove,
    });
  };

  useEffect(() => {
    if (!isSettingsOpen) return;

    updateSettingsPosition();

    const handleResize = () => updateSettingsPosition();
    const handleScroll = () => updateSettingsPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

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
  }, [isSettingsOpen]);

  /* =========================================================
     Filter handlers
  ========================================================= */

  const handleFilterChange = (
    newPeriod = selectedPeriod,
    newTriage = selectedTriage,
  ) => {
    setSelectedPeriod(newPeriod);
    setSelectedTriage(newTriage);

    startTransition(async () => {
      try {
        const result = await fetchYearlyTrendAction(
          newPeriod,
          newTriage,
        );

        setData(result);
      } catch (error) {
        console.error(
          "Failed to fetch filtered yearly Turnaround Time trend:",
          error,
        );
      }
    });
  };

  const handleSelectPeriod = (period: string) => {
    handleFilterChange(period, selectedTriage);
  };

  const handleSelectTriage = (
    triage: "ALL" | TriageLevel,
  ) => {
    handleFilterChange(selectedPeriod, triage);
  };

  const handleStepYear = (step: number) => {
    handleSelectPeriod(
      String(currentTargetYear + step),
    );
  };

  /* =========================================================
     Labels and computed metrics
  ========================================================= */

  const periodLabel =
    selectedPeriod === "rolling"
      ? "Rolling 12 months"
      : `Calendar year ${selectedPeriod}`;

  const triageLabel =
    TRIAGE_OPTIONS.find(
      (option) => option.value === selectedTriage,
    )?.label || "All Patient Categories";

  const isModalitySpecific =
    selectedModality !== "ALL" &&
    selectedModality !== "MULTI";

  const activeModalityConfig = isModalitySpecific
    ? MODALITIES.find(
        (modality) =>
          modality.code === selectedModality,
      ) || null
    : null;

  const activeModalitySummary = isModalitySpecific
    ? data.byModalityAnnual?.[selectedModality]
    : null;

  const displayAnnualAvgHours = isModalitySpecific
    ? activeModalitySummary?.annualAvgTatHours ?? 0
    : data.annualAvgTatHours;

  const displayAnnualFinalized = isModalitySpecific
    ? activeModalitySummary?.annualTotalFinalized ?? 0
    : data.annualTotalFinalized;

  const displayPctChange = isModalitySpecific
    ? activeModalitySummary?.pctChangeTat ?? 0
    : data.pctChangeTat;

  const displayPriorFinalized = isModalitySpecific
    ? activeModalitySummary?.priorAnnualTotalFinalized ?? 0
    : data.priorAnnualTotalFinalized;

  const hasPriorComparison =
    comparePriorYear && displayPriorFinalized > 0;

  const isFaster = displayPctChange < 0;
  const isSlower = displayPctChange > 0;

  /* =========================================================
     Render
  ========================================================= */

  return (
    <div className="min-w-0">
      {/* 1. Header navigation and annual summary */}

      <TrendHeaderNav
        onStepYear={handleStepYear}
        isPending={isPending}
        selectedPeriod={selectedPeriod}
        periodLabel={periodLabel}
        triageLabel={triageLabel}
        isModalitySpecific={isModalitySpecific}
        activeModalityLabel={activeModalityConfig?.label}
        displayAnnualAvgHours={displayAnnualAvgHours}
        hasPriorComparison={hasPriorComparison}
        isFaster={isFaster}
        isSlower={isSlower}
        displayPctChange={displayPctChange}
        comparePriorYear={comparePriorYear}
        onToggleComparePriorYear={() =>
          setComparePriorYear((previous) => !previous)
        }
        settingsButtonRef={settingsButtonRef}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() =>
          setIsSettingsOpen((previous) => !previous)
        }
        hasActiveFilters={selectedTriage !== "ALL"}
      />

      {/* 2. Modality selector */}

      <TrendModalityBar
        selectedModality={selectedModality}
        onSelectModality={setSelectedModality}
        isModalitySpecific={isModalitySpecific}
        activeModalityConfig={activeModalityConfig}
      />

      {/* 3. Small-screen annual summary */}

      <div className="flex items-center justify-between gap-3 border-b border-border py-3 sm:hidden">
        <div className="min-w-0">
          <p className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {isModalitySpecific && activeModalityConfig
              ? `${activeModalityConfig.label} Average Turnaround Time`
              : "Average Turnaround Time"}
          </p>

          <p className="mt-1 text-xs font-extrabold text-qc-navy">
            {displayAnnualAvgHours} hours
          </p>
        </div>

        {hasPriorComparison && (
          <span
            className={`shrink-0 text-[10px] font-extrabold ${
              isFaster
                ? "text-qc-blue"
                : isSlower
                  ? "text-qc-red"
                  : "text-muted-foreground"
            }`}
          >
            {displayPctChange === 0
              ? "No change"
              : `${Math.abs(displayPctChange)}% ${
                  isFaster ? "faster" : "longer"
                }`}
          </span>
        )}
      </div>

      {/* 4. Trend chart */}

      <div className="pt-4">
        <TrendChartCanvas
          months={data.months}
          selectedModality={selectedModality}
          selectedPeriodLabel={data.selectedPeriodLabel}
          priorPeriodLabel={data.priorPeriodLabel}
          comparePriorYear={comparePriorYear}
          triageLabel={triageLabel}
          isModalitySpecific={isModalitySpecific}
          activeModalityConfig={activeModalityConfig}
        />
      </div>

      {/* 5. Dynamic chart legend */}

      <TrendLegend
        selectedModality={selectedModality}
        selectedPeriodLabel={data.selectedPeriodLabel}
        priorPeriodLabel={data.priorPeriodLabel}
        comparePriorYear={comparePriorYear}
        isModalitySpecific={isModalitySpecific}
        activeModalityConfig={activeModalityConfig}
        displayAnnualFinalized={displayAnnualFinalized}
      />

      {/* 6. Settings and filters */}

      <TrendFilterPopover
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        position={settingsPosition}
        buttonRef={settingsButtonRef}
        selectedTriage={selectedTriage}
        onSelectTriage={handleSelectTriage}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={handleSelectPeriod}
        availableYears={data.availableYears}
        onStepYear={handleStepYear}
        comparePriorYear={comparePriorYear}
        onToggleComparePriorYear={() =>
          setComparePriorYear((previous) => !previous)
        }
      />
    </div>
  );
}