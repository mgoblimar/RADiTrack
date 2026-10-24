"use client";

import { useMemo, useState, useTransition } from "react";
import {
  fetchModalityTatDataAction,
  type ModalityTatOverviewItem,
  type MultiPeriodModalityTatOverview,
  type ModalityTemporalPeriod,
} from "@/app/actions";
import type {
  ExtendedTemporalPeriod,
  PatientCategoryFilter,
  ModalityTatDisplayItem,
} from "./types";

export function useTatOverviewData(
  data?: ModalityTatOverviewItem[] | MultiPeriodModalityTatOverview,
) {
  const [temporalPeriod, setTemporalPeriod] =
    useState<ExtendedTemporalPeriod>("ALL");
  const [patientCategory, setPatientCategory] =
    useState<PatientCategoryFilter>("ALL");
  const [periodDataset, setPeriodDataset] =
    useState<ModalityTatOverviewItem[] | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const defaultStartIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 14);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [customStartDate, setCustomStartDate] = useState(defaultStartIso);
  const [customEndDate, setCustomEndDate] = useState(todayIso);
  const [customDataset, setCustomDataset] =
    useState<ModalityTatOverviewItem[] | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSelectPeriod = (period: ExtendedTemporalPeriod) => {
    setTemporalPeriod(period);

    if (period === "ALL") {
      setPeriodDataset(null);
      return;
    }

    if (period === "CUSTOM") {
      if (!customDataset) {
        handleFetchCustomRange(customStartDate, customEndDate);
      }
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchModalityTatDataAction({ period });
        setPeriodDataset(result);
      } catch (error) {
        console.error("Failed to fetch modality TAT for period:", error);
      }
    });
  };

  const handleFetchCustomRange = (start: string, end: string) => {
    if (!start || !end || start > end) return;

    setCustomStartDate(start);
    setCustomEndDate(end);
    setTemporalPeriod("CUSTOM");

    startTransition(async () => {
      try {
        const result = await fetchModalityTatDataAction({
          period: "CUSTOM",
          startDate: start,
          endDate: end,
        });
        setCustomDataset(result);
      } catch (error) {
        console.error("Failed to fetch custom modality TAT range:", error);
      }
    });
  };

  /* =========================================================
     Resolve dataset
  ========================================================= */
  let activeDataset: ModalityTatOverviewItem[] = [];

  if (temporalPeriod === "CUSTOM" && customDataset) {
    activeDataset = customDataset;
  } else if (temporalPeriod !== "ALL" && periodDataset) {
    activeDataset = periodDataset;
  } else if (data) {
    if ("periods" in data && data.periods) {
      const key = temporalPeriod === "CUSTOM" ? "ALL" : temporalPeriod;
      activeDataset =
        data.periods[key as ModalityTemporalPeriod] ?? data.periods.ALL ?? [];
    } else if (Array.isArray(data)) {
      activeDataset = data;
    }
  }

  /* =========================================================
     Display data
  ========================================================= */
  const hasTargetSla = patientCategory !== "ALL";

  const displayData: ModalityTatDisplayItem[] = activeDataset.map((item) => {
    let stats = item.all;

    if (patientCategory === "OPD" && item.opd) {
      stats = item.opd;
    } else if (patientCategory === "ER" && (item.er || item.emergency)) {
      stats = item.er ?? item.emergency;
    } else if (patientCategory === "IN" && item.inpatient) {
      stats = item.inpatient;
    }

    const avgTatHours = Number((stats.avgTat / 60).toFixed(1));
    const targetHours =
      hasTargetSla && stats.target ? Number((stats.target / 60).toFixed(1)) : null;

    return {
      modality: item.modality,
      name: item.name,
      avgTatMinutes: stats.avgTat,
      avgTat: avgTatHours,
      targetMinutes: hasTargetSla ? stats.target : null,
      target: targetHours,
      volume: stats.volume,
    };
  });

  const isFiltered = temporalPeriod !== "ALL" || patientCategory !== "ALL";

  const handleResetFilters = () => {
    setTemporalPeriod("ALL");
    setPatientCategory("ALL");
    setPeriodDataset(null);
    setCustomDataset(null);
  };

  return {
    temporalPeriod,
    patientCategory,
    setPatientCategory,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    isPending,
    isFiltered,
    hasTargetSla,
    displayData,
    handleSelectPeriod,
    handleFetchCustomRange,
    handleResetFilters,
  };
}
