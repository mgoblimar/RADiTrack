// Verifies RADiTrack's calculations against the independent reference calculator.
//
//   npm run test-data:verify            (requires test mode to be active)
//   npm run test-data:verify -- --force  (run against whatever data is loaded)
//
// 1. Reads the loaded exams + reports from the database.
// 2. The reference calculator recomputes TAT and SLA breach from the raw
//    timestamps and the database SLA targets, then the expected figures.
// 3. Calls the SAME functions the dashboard and PDF report use.
// 4. Writes Expected vs RADiTrack with PASS/FAIL into the Verification sheet of
//    docs/test-data/verification-YYYY-MM-DD.xlsx (a fresh copy of the workbook).

// Must stay first: lets this script call the dashboard's actions without a sign-in.
import "./local-script-context";
import path from "node:path";
import { mkdirSync } from "node:fs";
import prisma from "@/lib/prisma";
import { MODALITY_ORDER, TriageLevel } from "@/lib/enums";
import { resolveKpiRange, toIsoDate } from "@/lib/kpi-range";
import type { ExamImportRecord } from "@/lib/exam-import";
import {
  KPI_METRICS,
  expectedKpi,
  expectedModalityTat,
  expectedSevenDay,
  expectedTwelveMonth,
  kpiScenarios,
  scenarioLabel,
  toRefExams,
  type SlaTargets,
} from "@/lib/test-data/expected";
import { fetchFilteredExecutiveKpiAction } from "@/app/actions/dashboard";
import {
  fetchModalityTatDataAction,
  getSevenDayStaffAnalytics,
  getTwelveMonthTatTrend,
} from "@/app/actions/analytics";
import { buildWorkbook } from "./build-test-workbook";

interface Check {
  section: string;
  scenario: string;
  metric: string;
  expected: number;
  actual: number | null;
}

const TOLERANCE = 1e-9;
const checks: Check[] = [];
const add = (section: string, scenario: string, metric: string, expected: number, actual: number | null | undefined) =>
  checks.push({ section, scenario, metric, expected, actual: actual ?? null });

async function loadedRecords(): Promise<ExamImportRecord[]> {
  const exams = await prisma.examination.findMany({
    where: { statusCode: { not: "CANCELLED" } },
    include: { report: true },
  });
  return exams.map((e, i) => ({
    rowNumber: i + 2,
    examinationIdentifier: e.examinationIdentifier,
    modalityCode: e.modalityCode as ExamImportRecord["modalityCode"],
    triageLevel: e.triageLevel as ExamImportRecord["triageLevel"],
    statusCode: e.statusCode as ExamImportRecord["statusCode"],
    studyDate: e.studyDate.toISOString(),
    examCompletedAt: e.examCompletedAt?.toISOString() ?? null,
    reportSignedAt: e.report?.reportSignedAt?.toISOString() ?? null,
    notes: e.notes,
  }));
}

async function slaTargets(): Promise<SlaTargets> {
  const configs = await prisma.slaConfiguration.findMany();
  const targets: SlaTargets = {};
  for (const c of configs) {
    const key = `${c.modalityCode}|${c.triageLevel}`;
    if (targets[key] === undefined) targets[key] = c.targetTatMinutes; // first match, like sign-off
  }
  return targets;
}

async function verifyKpis(ref: ReturnType<typeof toRefExams>, now: Date) {
  for (const s of kpiScenarios()) {
    const exp = expectedKpi(ref, s, now);
    const act = await fetchFilteredExecutiveKpiAction({ preset: s.preset, modalityCode: s.modality, triageLevel: s.triage });
    for (const metric of KPI_METRICS) add("KPI cards", scenarioLabel(s), metric, exp[metric], act[metric]);
  }
}

async function verifyModalityTat(ref: ReturnType<typeof toRefExams>, now: Date) {
  const windows = [
    { label: "All time", period: "ALL" as const, start: null, end: null },
    ...(["ROLLING_7D", "LAST_MONTH"] as const).map((preset) => {
      const r = resolveKpiRange(preset, now);
      return { label: preset, period: "CUSTOM" as const, start: r.start, end: r.end };
    }),
  ];
  for (const w of windows) {
    const exp = expectedModalityTat(ref, w.start, w.end);
    const act = await fetchModalityTatDataAction(
      w.period === "ALL" ? { period: "ALL" } : { period: "CUSTOM", startDate: toIsoDate(w.start!), endDate: toIsoDate(w.end!) },
    );
    for (const e of exp) {
      const a = act.find((x) => x.modality === e.modality);
      for (const group of ["all", "opd", "er", "inpatient"] as const) {
        add("TAT by modality", `${w.label} · ${e.modality} · ${group}`, "avgTatMinutes", e[group].avgTat, a?.[group]?.avgTat);
        add("TAT by modality", `${w.label} · ${e.modality} · ${group}`, "finalizedVolume", e[group].volume, a?.[group]?.volume);
      }
    }
  }
}

async function verifySevenDay(ref: ReturnType<typeof toRefExams>, now: Date) {
  const act = await getSevenDayStaffAnalytics({ mode: "rolling", anchorDate: toIsoDate(now) });
  for (const modality of ["ALL", ...MODALITY_ORDER] as const) {
    const exp = expectedSevenDay(ref, now, modality);
    const table = modality === "ALL" ? act.all : act.byModality[modality];
    exp.forEach((day) => {
      const row = table.dayRows.find((r) => r.isoDate === day.isoDate);
      for (const metric of ["totalExams", "opdCount", "inCount", "erCount", "finalizedCount", "pendingCount", "avgTatMinutes"] as const) {
        add("7-day table", `${modality} · ${day.isoDate}`, metric, day[metric], row?.[metric]);
      }
    });
  }
}

async function verifyTwelveMonth(ref: ReturnType<typeof toRefExams>, now: Date) {
  for (const triage of ["ALL", TriageLevel.OPD, TriageLevel.IN, TriageLevel.ER] as const) {
    const exp = expectedTwelveMonth(ref, now, triage);
    const act = await getTwelveMonthTatTrend("rolling", triage, toIsoDate(now));
    exp.forEach((m, i) => {
      const a = act.months[i];
      const scenario = `${triage} · ${m.label}`;
      add("12-month trend", scenario, "avgTatHours", m.avgTatHours, a?.avgTatHours);
      add("12-month trend", scenario, "totalFinalized", m.totalFinalized, a?.totalFinalized);
      add("12-month trend", scenario, "previousMonthAvgTatHours", m.previousMonthAvgTatHours, a?.previousMonthAvgTatHours);
      add("12-month trend", scenario, "priorYearAvgTatHours", m.priorYearAvgTatHours, a?.priorYearAvgTatHours);
      for (const code of MODALITY_ORDER) {
        add("12-month trend", `${scenario} · ${code}`, "avgTatHours", m.byModality[code].current.avgTatHours, a?.[`${code}_avgTatHours`]);
        add("12-month trend", `${scenario} · ${code}`, "previousMonthAvgTatHours", m.byModality[code].previousMonth.avgTatHours, a?.[`prevMonth_${code}_avgTatHours`]);
      }
    });
  }
}

async function writeReport(now: Date, examCount: number, isTestActive: boolean): Promise<string> {
  const wb = await buildWorkbook(now);
  const sheet = wb.getWorksheet("Verification")!;
  sheet.spliceRows(2, sheet.rowCount);
  const failed = checks.filter((c) => !passes(c));

  sheet.insertRow(1, [`Verification run ${now.toLocaleString("en-PH")} · ${examCount} exams loaded · test mode ${isTestActive ? "ON" : "OFF"}`]);
  sheet.insertRow(2, [`${checks.length - failed.length} of ${checks.length} checks passed${failed.length ? ` · ${failed.length} FAILED` : " · ALL PASS"}`]);
  sheet.insertRow(3, []);
  sheet.getRow(1).font = { bold: true, size: 13 };
  sheet.getRow(2).font = { bold: true, color: { argb: failed.length ? "FFC53030" : "FF047857" } };
  const header = sheet.getRow(4);
  header.values = ["Section", "Scenario", "Metric", "Expected", "RADiTrack", "Result"];
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF050E40" } };
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  for (const c of [...failed, ...checks.filter(passes)]) {
    const row = sheet.addRow([c.section, c.scenario, c.metric, c.expected, c.actual ?? "missing", passes(c) ? "PASS" : "FAIL"]);
    row.getCell(6).font = { bold: true, color: { argb: passes(c) ? "FF047857" : "FFC53030" } };
  }

  const out = path.join(process.cwd(), "docs", "test-data", `verification-${toIsoDate(now)}.xlsx`);
  mkdirSync(path.dirname(out), { recursive: true });
  await wb.xlsx.writeFile(out);
  return out;
}

const passes = (c: Check) => c.actual !== null && Math.abs(c.actual - c.expected) <= TOLERANCE;

async function main() {
  const force = process.argv.includes("--force");
  const backup = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = 'examinations_backup') AS "exists"`;
  const isTestActive = backup[0]?.exists ?? false;
  if (!isTestActive && !force) {
    console.error("Test mode is not active. Load the test dataset first (RIS Simulator), or pass --force.");
    process.exit(2);
  }

  const now = new Date();
  const records = await loadedRecords();
  const ref = toRefExams(records, await slaTargets());
  console.log(`Verifying ${records.length} exams at ${now.toLocaleString("en-PH")}…`);

  await verifyKpis(ref, now);
  await verifyModalityTat(ref, now);
  await verifySevenDay(ref, now);
  await verifyTwelveMonth(ref, now);

  const out = await writeReport(now, records.length, isTestActive);
  const failed = checks.filter((c) => !passes(c));
  console.log(`${checks.length - failed.length}/${checks.length} checks passed. Report: ${out}`);
  for (const c of failed.slice(0, 25)) {
    console.log(`FAIL ${c.section} | ${c.scenario} | ${c.metric}: expected ${c.expected}, RADiTrack ${c.actual}`);
  }
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
