// CAL-18: how long completed exams have waited for a report (decided 19 Nov 2026).
// Pure: used by the server actions, the screens and the verification script.
//
// Only completed, unsigned, not-cancelled exams are aged. Age = now - exam completed
// time, in 24-hour days. Each group includes its lower edge and excludes its upper
// edge; exactly 30 days counts as "30 days or more".

export const BACKLOG_AGE_GROUPS = [
  { key: "under1d", label: "Less than 1 day", description: "Completed less than 24 hours ago", maxHours: 24 },
  { key: "d1to3", label: "1 to 3 days", description: "Waiting at least 1 day, but less than 3", maxHours: 72 },
  { key: "d3to7", label: "3 to 7 days", description: "Waiting at least 3 days, but less than 7", maxHours: 168 },
  { key: "d7to15", label: "7 to 15 days", description: "Waiting at least 7 days, but less than 15", maxHours: 360 },
  { key: "d15to30", label: "15 to 30 days", description: "Waiting at least 15 days, but less than 30", maxHours: 720 },
  { key: "d30plus", label: "30 days or more", description: "Waiting 30 days or longer", maxHours: Infinity },
] as const;

export function isBacklogAgeKey(value: unknown): value is BacklogAgeKey {
  return BACKLOG_AGE_GROUPS.some((group) => group.key === value);
}

export type BacklogAgeKey = (typeof BACKLOG_AGE_GROUPS)[number]["key"];
export type BacklogAgeCounts = Record<BacklogAgeKey, number>;

export function emptyBacklogAges(): BacklogAgeCounts {
  return { under1d: 0, d1to3: 0, d3to7: 0, d7to15: 0, d15to30: 0, d30plus: 0 };
}

/** The group for an exam that has waited `ageMinutes` (a completion time in the future counts as < 1 day). */
export function backlogAgeGroup(ageMinutes: number): BacklogAgeKey {
  const hours = Math.max(0, ageMinutes) / 60;
  return BACKLOG_AGE_GROUPS.find((group) => hours < group.maxHours)!.key;
}

/** Counts per group for exams completed at `completedAt` times, as of `now`. */
export function countBacklogAges(completedAt: readonly Date[], now: Date): BacklogAgeCounts {
  const counts = emptyBacklogAges();
  for (const completed of completedAt) {
    counts[backlogAgeGroup((now.getTime() - completed.getTime()) / 60_000)]++;
  }
  return counts;
}
