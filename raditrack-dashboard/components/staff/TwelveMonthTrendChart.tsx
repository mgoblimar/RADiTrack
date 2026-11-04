"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  fetchYearlyTrendAction,
  type TwelveMonthTrendResult,
} from "@/app/actions";

import { ModalityCode } from "@/lib/enums";
import { toIsoDate } from "@/lib/kpi-range";

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
  filters,
  onModalityChange,
}: TwelveMonthTrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(initialData.selectedPeriod || "rolling");

  // Patient category and modality come from the dashboard filter bar.
  const selectedTriage = filters.triage;

  const [comparePriorYear, setComparePriorYear] =
    useState(true);

  // View when no single modality is filtered: overall line or one line per modality.
  const [viewMode, setViewMode] =
    useState<"ALL" | "MULTI">("ALL");

  const selectedModality: "ALL" | "MULTI" | ModalityCode =
    filters.modality !== "ALL" ? filters.modality : viewMode;

  const handleSelectModality = (
    modality: "ALL" | "MULTI" | ModalityCode,
  ) => {
    if (modality === "ALL" || modality === "MULTI") {
      setViewMode(modality);
      onModalityChange("ALL");
      return;
    }
    onModalityChange(modality);
  };

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  /* =========================================================
     Data: rolling window ends on the filter bar's end month
  ========================================================= */

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const anchorDate = filters.isAllTime ? todayIso : filters.rangeEnd;
  const anchorMonth = anchorDate.slice(0, 7);
  const requestKey = `${selectedPeriod}|${selectedTriage}|${
    selectedPeriod === "rolling" ? anchorMonth : ""
  }`;
  const isInitialRequest =
    requestKey === `rolling|ALL|${todayIso.slice(0, 7)}`;

  const [fetched, setFetched] = useState<{
    key: string;
    data: TwelveMonthTrendResult;
  } | null>(null);

  const [isTransitionPending, startTransition] =
    useTransition();

  useEffect(() => {
    if (isInitialRequest) return;

    let isCancelled = false;
    startTransition(async () => {
      try {
        const result = await fetchYearlyTrendAction(
          selectedPeriod,
          selectedTriage,
          anchorDate,
        );
        if (!isCancelled) setFetched({ key: requestKey, data: result });
      } catch (error) {
        console.error(
          "Failed to fetch yearly Turnaround Time trend:",
          error,
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    initialData,
    isInitialRequest,
    selectedPeriod,
    selectedTriage,
    anchorDate,
    requestKey,
  ]);

  // Keep showing the last result while a new window loads.
  const data = isInitialRequest
    ? initialData
    : (fetched?.data ?? initialData);
  const isPending =
    isTransitionPending ||
    (!isInitialRequest && fetched?.key !== requestKey);

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

  const handleSelectPeriod = (period: string) => {
    setSelectedPeriod(period);
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
        hasActiveFilters={false}
      />

      {/* 2. Modality selector */}

      <TrendModalityBar
        selectedModality={selectedModality}
        onSelectModality={handleSelectModality}
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
            {displayAnnualAvgHours} hrs
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