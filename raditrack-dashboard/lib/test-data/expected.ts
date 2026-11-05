// Independent reference calculator for the validation dataset.
//
// Re-implements RADiTrack's documented rules from the raw timestamps (it does
// NOT read stored TAT or breach values), so comparing its results with the
// app's own functions proves the app computes correctly. Rules mirrored:
//   TAT (min)    = (Report_Signed_At - Exam_Completed_At) / 60, 2 decimals
//   Breach       = TAT > SLA target for (modality, patient category)
//   Windows      = by Study_Date, using lib/kpi-range.ts presets
//   Average TAT  = mean of TAT > 0 over signed reports, rounded to 0.1 min;
//                  hours = round(avg minutes / 60, 0.1)
//   Median TAT   = middle TAT (mean of the two middle values, 2 decimals)
//   SLA %        = (finalized - breached) / finalized * 100, 0.1; 100 if none

import { MODALITY_ORDER, TriageLevel } from "@/lib/enums";
import type { ExamImportRecord } from "@/lib/exam-import";
import { resolveKpiRange, toIsoDate, type KpiPreset } from "@/lib/kpi-range";

export type SlaTargets = Record<string, number>; // key `${modality}|${triage}` -> minutes

export const DEFAULT_SLA_TARGETS: SlaTargets = Object.fromEntries(
  MODALITY_ORDER.flatMap((m) => [
    [`${m}|${TriageLevel.ER}`, 2880],
    [`${m}|${TriageLevel.IN}`, 2880],
    [`${m}|${TriageLevel.OPD}`, 4320],
  ]),
);

export interface RefExam {
  accession: string;
  modality: string;
  triage: string;
  study: Date;
  completed: Date | null;
  signed: Date | null;
  tatMinutes: number | null;
  breached: boolean;
}

export function toRefExams(records: ExamImportRecord[], targets: SlaTargets): RefExam[] {
  return records.map((r) => {
    const completed = r.examCompletedAt ? new Date(r.examCompletedAt) : null;
    const signed = r.reportSignedAt ? new Date(r.reportSignedAt) : null;
    const tatMinutes = signed && completed
      ? Number(((signed.getTime() - completed.getTime()) / 60_000).toFixed(2))
      : null;
    const target = targets[`${r.modalityCode}|${r.triageLevel}`];
    return {
      accession: r.examinationIdentifier,
      modality: r.modalityCode,
      triage: r.triageLevel,
      study: new Date(r.studyDate),
      completed,
      signed,
      tatMinutes,
      breached: tatMinutes !== null && target !== undefined && tatMinutes > target,
    };
  });
}

const round1 = (n: number) => Number(n.toFixed(1));
const avgMinutes = (tats: number[]) => (tats.length ? round1(tats.reduce((a, b) => a + b, 0) / tats.length) : 0);
const hoursOf = (minutes: number) => round1(minutes / 60);

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Number(((s[mid - 1] + s[mid]) / 2).toFixed(2));
}

const inWindow = (d: Date, start: Date, end: Date) => d >= start && d <= end;
const signedTats = (exams: RefExam[]) =>
  exams.filter((e) => e.signed && (e.tatMinutes ?? 0) > 0).map((e) => e.tatMinutes as number);

/** One expected value to compare with the app. */
export interface ExpectedValue {
  section: string;
  scenario: string;
  metric: string;
  expected: number;
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------

export interface KpiScenario {
  preset: KpiPreset;
  modality: string; // "ALL" or code
  triage: string; // "ALL" or code
}

export function expectedKpi(exams: RefExam[], s: KpiScenario, now: Date) {
  const r = resolveKpiRange(s.preset, now);
  const scope = (e: RefExam) =>
    (s.modality === "ALL" || e.modality === s.modality) && (s.triage === "ALL" || e.triage === s.triage);
  const current = exams.filter((e) => scope(e) && (r.isAllTime || inWindow(e.study, r.start, r.end)));
  const prior = exams.filter((e) => scope(e) && inWindow(e.study, r.priorStart, r.priorEnd));
  const finalized = current.filter((e) => e.signed);
  const pending = r.isAllTime
    ? exams.filter((e) => scope(e) && e.completed && !e.signed)
    : current.filter((e) => !e.signed);
  const tats = signedTats(finalized);
  const breached = finalized.filter((e) => e.breached).length;
  const avg = avgMinutes(tats);

  return {
    totalVolume: current.length,
    finalizedCount: finalized.length,
    pendingReadingCount: pending.length,
    avgTatMinutes: avg,
    avgTatHours: hoursOf(avg),
    medianTatMinutes: median(tats),
    breachCount: breached,
    pctOnTime: finalized.length ? round1(((finalized.length - breached) / finalized.length) * 100) : 100,
    priorTotalVolume: prior.length,
    priorAvgTatMinutes: avgMinutes(signedTats(prior.filter((e) => e.signed))),
  };
}

// ---------------------------------------------------------------------------
// Turnaround Time by modality (per patient category) for a date window
// ---------------------------------------------------------------------------

export function expectedModalityTat(exams: RefExam[], start: Date | null, end: Date | null) {
  const signed = exams.filter((e) => e.signed && (!start || !end || inWindow(e.study, start, end)));
  return MODALITY_ORDER.map((m) => {
    const forModality = signed.filter((e) => e.modality === m);
    const stats = (triage?: string) => {
      const group = triage ? forModality.filter((e) => e.triage === triage) : forModality;
      return { avgTat: avgMinutes(signedTats(group)), volume: group.length };
    };
    return { modality: m, all: stats(), opd: stats(TriageLevel.OPD), er: stats(TriageLevel.ER), inpatient: stats(TriageLevel.IN) };
  });
}

// ---------------------------------------------------------------------------
// 7-day table (rolling, anchored on a day), per modality filter
// ---------------------------------------------------------------------------

export function expectedSevenDay(exams: RefExam[], anchor: Date, modality: string) {
  const scoped = exams.filter((e) => modality === "ALL" || e.modality === modality);
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const rows = scoped.filter((e) => e.study >= day && e.study < next);
    const finalized = rows.filter((e) => e.signed);
    return {
      isoDate: toIsoDate(day),
      totalExams: rows.length,
      opdCount: rows.filter((e) => e.triage === TriageLevel.OPD).length,
      inCount: rows.filter((e) => e.triage === TriageLevel.IN).length,
      erCount: rows.filter((e) => e.triage === TriageLevel.ER).length,
      finalizedCount: finalized.length,
      pendingCount: rows.length - finalized.length,
      avgTatMinutes: avgMinutes(signedTats(finalized)),
    };
  });
}

// ---------------------------------------------------------------------------
// 12-month trend (rolling, ending on the anchor month)
// ---------------------------------------------------------------------------

export function expectedTwelveMonth(exams: RefExam[], now: Date, triage: string) {
  const scoped = exams.filter((e) => e.signed && (triage === "ALL" || e.triage === triage));
  const monthStats = (year: number, month: number, modality?: string) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const group = scoped.filter((e) => inWindow(e.study, start, end) && (!modality || e.modality === modality));
    const tats = signedTats(group);
    return { avgTatHours: hoursOf(avgMinutes(tats)), totalFinalized: group.length };
  };

  return Array.from({ length: 12 }, (_, idx) => {
    const offset = idx - 11;
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    const label = new Date(y, m, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const current = monthStats(y, m);
    const byModality = Object.fromEntries(MODALITY_ORDER.map((code) => [code, {
      current: monthStats(y, m, code),
      previousMonth: monthStats(y, m - 1, code),
      priorYear: monthStats(y - 1, m, code),
    }]));
    return {
      label,
      avgTatHours: current.avgTatHours,
      totalFinalized: current.totalFinalized,
      previousMonthAvgTatHours: monthStats(y, m - 1).avgTatHours,
      previousMonthTotalFinalized: monthStats(y, m - 1).totalFinalized,
      priorYearAvgTatHours: monthStats(y - 1, m).avgTatHours,
      byModality,
    };
  });
}

// ---------------------------------------------------------------------------
// Scenario list used by the workbook and the verification script
// ---------------------------------------------------------------------------

export const KPI_PRESETS: KpiPreset[] = ["TODAY", "ROLLING_7D", "WEEK", "LAST_WEEK", "MONTH", "LAST_MONTH", "YEAR", "ALL"];

export function kpiScenarios(): KpiScenario[] {
  const scenarios: KpiScenario[] = KPI_PRESETS.map((preset) => ({ preset, modality: "ALL", triage: "ALL" }));
  for (const preset of ["ROLLING_7D", "LAST_MONTH", "ALL"] as KpiPreset[]) {
    for (const modality of MODALITY_ORDER) scenarios.push({ preset, modality, triage: "ALL" });
    for (const triage of [TriageLevel.OPD, TriageLevel.IN, TriageLevel.ER]) scenarios.push({ preset, modality: "ALL", triage });
  }
  return scenarios;
}

export const KPI_METRICS = [
  "totalVolume", "finalizedCount", "pendingReadingCount", "avgTatMinutes", "avgTatHours",
  "medianTatMinutes", "breachCount", "pctOnTime", "priorTotalVolume", "priorAvgTatMinutes",
] as const;

export const scenarioLabel = (s: KpiScenario) =>
  `${s.preset} · ${s.modality === "ALL" ? "All modalities" : s.modality} · ${s.triage === "ALL" ? "All categories" : s.triage}`;
