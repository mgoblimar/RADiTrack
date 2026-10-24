"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  fetchYearlyTrendAction,
  TwelveMonthTrendResult,
} from "@/app/actions";
import { ModalityCode, TriageLevel } from "@/lib/enums";

import {
  MODALITIES,
  TRIAGE_OPTIONS,
  TwelveMonthTrendChartProps,
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
  const [data, setData] = useState<TwelveMonthTrendResult>(initialData);

  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    initialData.selectedPeriod || "rolling",
  );
  const [selectedTriage, setSelectedTriage] =
    useState<"ALL" | TriageLevel>("ALL");
  const [comparePriorYear, setComparePriorYear] = useState(true);
  const [selectedModality, setSelectedModality] =
    useState<"ALL" | "MULTI" | ModalityCode>("ALL");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Track active filters in refs so background auto-refreshes don't wipe them out
  const selectedPeriodRef = useRef(selectedPeriod);
  selectedPeriodRef.current = selectedPeriod;
  const selectedTriageRef = useRef(selectedTriage);
  selectedTriageRef.current = selectedTriage;

  useEffect(() => {
    const currentPeriod = selectedPeriodRef.current;
    const currentTriage = selectedTriageRef.current;

    // Only accept raw initialData if the user hasn't selected a specific filter
    if (currentPeriod === "rolling" && currentTriage === "ALL") {
      setData(initialData);
    } else {
      // Re-fetch using active user filters so user selection is never reset by auto-refresh
      startTransition(async () => {
        try {
          const result = await fetchYearlyTrendAction(currentPeriod, currentTriage);
          setData(result);
        } catch (error) {
          console.error("Failed to re-fetch yearly trend on auto-refresh:", error);
        }
      });
    }
  }, [initialData]);

  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const [settingsPosition, setSettingsPosition] = useState({
    top: 0,
    left: 0,
    maxHeight: 0,
    openAbove: false,
  });

  /* =========================================================
     Target Year
  ========================================================= */
  const currentTargetYear = useMemo(() => {
    if (selectedPeriod === "rolling") {
      return new Date().getFullYear();
    }
    const parsed = Number.parseInt(selectedPeriod, 10);
    return Number.isNaN(parsed) ? new Date().getFullYear() : parsed;
  }, [selectedPeriod]);

  /* =========================================================
     Position settings popover
  ========================================================= */
  const updateSettingsPosition = () => {
    if (!settingsButtonRef.current) return;

    const rect = settingsButtonRef.current.getBoundingClientRect();
    const width = 320;
    const viewportPadding = 12;
    const gap = 8;
    const minPopoverHeight = 220;
    const viewportHeight = window.innerHeight;

    let left = rect.right - width;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - width - viewportPadding),
    );

    const spaceBelow = viewportHeight - rect.bottom - viewportPadding - gap;
    const spaceAbove = rect.top - viewportPadding - gap;
    const shouldOpenAbove =
      spaceBelow < minPopoverHeight && spaceAbove > spaceBelow;

    const availableHeight = Math.max(
      180,
      Math.min(600, shouldOpenAbove ? spaceAbove : spaceBelow),
    );

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top - gap - Math.min(availableHeight, Math.max(180, spaceAbove)),
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
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isSettingsOpen]);

  /* =========================================================
     Filter Handlers
  ========================================================= */
  const handleFilterChange = (
    newPeriod = selectedPeriod,
    newTriage = selectedTriage,
  ) => {
    setSelectedPeriod(newPeriod);
    setSelectedTriage(newTriage);

    startTransition(async () => {
      try {
        const result = await fetchYearlyTrendAction(newPeriod, newTriage);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch yearly trend with filters:", error);
      }
    });
  };

  const handleSelectPeriod = (period: string) => {
    handleFilterChange(period, selectedTriage);
  };

  const handleSelectTriage = (triage: "ALL" | TriageLevel) => {
    handleFilterChange(selectedPeriod, triage);
  };

  const handleStepYear = (step: number) => {
    handleSelectPeriod(String(currentTargetYear + step));
  };

  /* =========================================================
     Labels and Computed Metrics
  ========================================================= */
  const periodLabel =
    selectedPeriod === "rolling"
      ? "Rolling 12 months"
      : `Calendar year ${selectedPeriod}`;

  const triageLabel =
    TRIAGE_OPTIONS.find((t) => t.value === selectedTriage)?.label ||
    "All Categories";

  const isModalitySpecific =
    selectedModality !== "ALL" && selectedModality !== "MULTI";

  const activeModalityConfig = isModalitySpecific
    ? MODALITIES.find((m) => m.code === selectedModality) || null
    : null;

  const activeModalitySummary = isModalitySpecific
    ? data.byModalityAnnual?.[selectedModality]
    : null;

  const displayAnnualAvgHours = isModalitySpecific
    ? (activeModalitySummary?.annualAvgTatHours ?? 0)
    : data.annualAvgTatHours;

  const displayAnnualFinalized = isModalitySpecific
    ? (activeModalitySummary?.annualTotalFinalized ?? 0)
    : data.annualTotalFinalized;

  const displayPctChange = isModalitySpecific
    ? (activeModalitySummary?.pctChangeTat ?? 0)
    : data.pctChangeTat;

  const displayPriorFinalized = isModalitySpecific
    ? (activeModalitySummary?.priorAnnualTotalFinalized ?? 0)
    : data.priorAnnualTotalFinalized;

  const hasPriorComparison = comparePriorYear && displayPriorFinalized > 0;
  const isFaster = displayPctChange < 0;
  const isSlower = displayPctChange > 0;

  return (
    <div className="min-w-0">
      {/* 1. Header Navigation Bar */}
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
        onToggleComparePriorYear={() => setComparePriorYear((prev) => !prev)}
        settingsButtonRef={settingsButtonRef}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
        hasActiveFilters={selectedTriage !== "ALL"}
      />

      {/* 2. Modality Switcher Bar */}
      <TrendModalityBar
        selectedModality={selectedModality}
        onSelectModality={setSelectedModality}
        isModalitySpecific={isModalitySpecific}
        activeModalityConfig={activeModalityConfig}
      />

      {/* 3. Small-Screen Summary */}
      <div className="flex items-center justify-between border-b border-border py-3 sm:hidden">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {isModalitySpecific && activeModalityConfig
              ? `${activeModalityConfig.label} Avg`
              : "Avg TAT"}
          </span>
          <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
            {displayAnnualAvgHours}h
          </span>
        </div>

        {hasPriorComparison && (
          <span
            className={`text-[10px] font-extrabold ${
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

      {/* 4. Chart Canvas */}
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

      {/* 5. Dynamic Legend */}
      <TrendLegend
        selectedModality={selectedModality}
        selectedPeriodLabel={data.selectedPeriodLabel}
        priorPeriodLabel={data.priorPeriodLabel}
        comparePriorYear={comparePriorYear}
        isModalitySpecific={isModalitySpecific}
        activeModalityConfig={activeModalityConfig}
        displayAnnualFinalized={displayAnnualFinalized}
      />

      {/* 6. Settings Filter Popover (Portal) */}
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
        onToggleComparePriorYear={() => setComparePriorYear((prev) => !prev)}
      />
    </div>
  );
}
