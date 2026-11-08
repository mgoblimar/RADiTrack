"use client";

import {
  useEffect,
  useMemo,
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

export { type TwelveMonthTrendChartProps } from "./twelve-month-trend/types";

export function TwelveMonthTrendChart({
  data: initialData,
  filters,
  onModalityChange,
}: TwelveMonthTrendChartProps) {
  // Opens on the current calendar year; "rolling" = the last 12 months.
  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(initialData.selectedPeriod || String(new Date().getFullYear()));

  // Remembered while "Last 12 months" is on, so switching back keeps the year.
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    const parsed = Number.parseInt(initialData.selectedPeriod, 10);
    return Number.isNaN(parsed) ? new Date().getFullYear() : parsed;
  });

  // Patient category and modality come from the dashboard filter bar.
  const selectedTriage = filters.triage;

  // Off by default; the dashed prior-period line appears only when asked for.
  const [comparePriorYear, setComparePriorYear] =
    useState(false);

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

  /* =========================================================
     Data: rolling window ends on the filter bar's end month
  ========================================================= */

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const anchorDate = filters.isAllTime ? todayIso : filters.rangeEnd;
  const anchorMonth = anchorDate.slice(0, 7);
  const requestKey = `${selectedPeriod}|${selectedTriage}|${
    selectedPeriod === "rolling" ? anchorMonth : ""
  }`;
  // The server renders the current calendar year for all patient categories.
  const isInitialRequest =
    requestKey === `${initialData.selectedPeriod}|ALL|${
      initialData.selectedPeriod === "rolling" ? todayIso.slice(0, 7) : ""
    }`;

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
     Filter handlers
  ========================================================= */

  const handleSelectCalendarYear = (year: number) => {
    setCalendarYear(year);
    setSelectedPeriod(String(year));
  };

  const handleStepYear = (step: number) => {
    handleSelectCalendarYear(calendarYear + step);
  };

  // Example span for the "Last 12 months" hint, e.g. "Dec 2025 – Nov 2026".
  const rollingSpanLabel = useMemo(() => {
    const [year, month] = anchorMonth.split("-").map(Number);
    const end = new Date(year, month - 1, 1);
    const start = new Date(year, month - 12, 1);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [anchorMonth]);

  /* =========================================================
     Labels and computed metrics
  ========================================================= */

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

  // Nothing signed this period: show that instead of a misleading "0 hrs".
  const hasCurrentData = displayAnnualFinalized > 0;

  // Compare only when both periods have signed reports.
  const hasPriorComparison =
    comparePriorYear && hasCurrentData && displayPriorFinalized > 0;

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
        calendarYear={calendarYear}
        availableYears={data.availableYears}
        onSelectCalendarYear={handleSelectCalendarYear}
        onSelectRolling={() => setSelectedPeriod("rolling")}
        rollingSpanLabel={rollingSpanLabel}
        triageLabel={triageLabel}
        isModalitySpecific={isModalitySpecific}
        activeModalityLabel={activeModalityConfig?.label}
        displayAnnualAvgHours={displayAnnualAvgHours}
        hasCurrentData={hasCurrentData}
        hasPriorComparison={hasPriorComparison}
        isFaster={isFaster}
        isSlower={isSlower}
        displayPctChange={displayPctChange}
        comparePriorYear={comparePriorYear}
        onToggleComparePriorYear={() =>
          setComparePriorYear((previous) => !previous)
        }
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
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            {isModalitySpecific && activeModalityConfig
              ? `${activeModalityConfig.label} Average Turnaround Time`
              : "Average Turnaround Time"}
          </p>

          <p className="mt-1 text-xs font-extrabold text-qc-navy">
            {hasCurrentData ? `${displayAnnualAvgHours} hrs` : "No signed reports"}
          </p>
        </div>

        {hasPriorComparison && (
          <span
            className={`shrink-0 text-xs font-extrabold ${
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

    </div>
  );
}