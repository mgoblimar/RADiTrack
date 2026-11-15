/**
 * The 7-day Turnaround Time analytics are worked out for every
 * modality x patient category pair; these helpers name and pick one.
 * "ALL" means that filter is off.
 */
export function sevenDayFilterKey(modality: string, triage: string): string {
  return `${modality}|${triage}`;
}

interface SevenDayAnalyticsSet<T> {
  all: T;
  byFilter?: Record<string, T>;
}

/** The analytics for the dashboard's modality and patient category filters. */
export function pickSevenDayAnalytics<T>(
  analytics: SevenDayAnalyticsSet<T>,
  modality: string,
  triage: string,
): T {
  return analytics.byFilter?.[sevenDayFilterKey(modality, triage)] ?? analytics.all;
}

/**
 * Badge text for a 7-day block: "For all Modalities" with no filter,
 * otherwise e.g. "X-ray only", "Emergency (ER) only" or "X-ray · Emergency (ER)".
 */
export function sevenDayScopeLabel(
  modalityLabel: string | null,
  triageLabel: string | null,
): string {
  if (modalityLabel && triageLabel) return `${modalityLabel} · ${triageLabel}`;
  if (modalityLabel || triageLabel) return `${modalityLabel ?? triageLabel} only`;
  return "For all Modalities";
}
