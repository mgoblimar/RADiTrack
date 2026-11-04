"use client";

import { useEffect, useState, useTransition } from "react";
import {
  fetchModalityTatDataAction,
  type ModalityTatOverviewItem,
  type MultiPeriodModalityTatOverview,
} from "@/app/actions";
import type { DashboardFilters } from "@/lib/dashboard-types";
import type { PatientCategoryFilter, ModalityTatDisplayItem } from "./types";

/** All-time dataset from the page's initial server data. */
function initialAllTime(
  data?: ModalityTatOverviewItem[] | MultiPeriodModalityTatOverview,
): ModalityTatOverviewItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.periods?.ALL ?? [];
}

/**
 * Data for the Turnaround Time by Modality chart, driven by the dashboard's
 * single filter bar: its date window and patient category.
 */
export function useTatOverviewData(
  data: ModalityTatOverviewItem[] | MultiPeriodModalityTatOverview | undefined,
  filters: DashboardFilters,
) {
  const patientCategory: PatientCategoryFilter = filters.triage;
  const rangeKey = `${filters.rangeStart}|${filters.rangeEnd}`;

  // Fetched dataset tagged with the window it belongs to.
  const [fetched, setFetched] = useState<{
    rangeKey: string;
    items: ModalityTatOverviewItem[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (filters.isAllTime) return;

    let isCancelled = false;
    startTransition(async () => {
      try {
        const items = await fetchModalityTatDataAction({
          period: "CUSTOM",
          startDate: filters.rangeStart,
          endDate: filters.rangeEnd,
        });
        if (!isCancelled) setFetched({ rangeKey, items });
      } catch (error) {
        console.error("Failed to fetch modality Turnaround Time for range:", error);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [data, filters.isAllTime, filters.rangeStart, filters.rangeEnd, rangeKey]);

  const activeDataset = filters.isAllTime
    ? initialAllTime(data)
    : fetched?.rangeKey === rangeKey
      ? fetched.items
      : [];

  const isLoading = !filters.isAllTime && fetched?.rangeKey !== rangeKey;
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

  return {
    patientCategory,
    isPending: isPending || isLoading,
    hasTargetSla,
    displayData,
  };
}
