// Builds public/test-data/raditrack-test-dataset.xlsx from data/test-dataset.ts.
//
//   npm run test-data:workbook
//
// Sheets: README, Exams (importable inputs), SLA Targets, Calculations
// (per-exam formulas), Expected KPIs, Expected 7-Day, Expected 12-Month and an
// empty Verification sheet (filled by `npm run test-data:verify`). Every
// expected number is an Excel formula anchored on TODAY(), with cached values
// from the reference calculator so viewers that don't recalculate still show
// figures.

import path from "node:path";
import { mkdirSync } from "node:fs";
import ExcelJS from "exceljs";
import { TEST_EXAMS, TEST_EXAM_COLUMNS, testDatasetRows } from "@/data/test-dataset";
import { parseExamRows } from "@/lib/exam-import";
import { MODALITY_ORDER, TriageLevel } from "@/lib/enums";
import { resolveKpiRange, type KpiPreset } from "@/lib/kpi-range";
import {
  DEFAULT_SLA_TARGETS,
  expectedKpi,
  expectedSevenDay,
  expectedTwelveMonth,
  kpiScenarios,
  scenarioLabel,
  toRefExams,
} from "@/lib/test-data/expected";

export const WORKBOOK_PATH = path.join(process.cwd(), "public", "test-data", "raditrack-test-dataset.xlsx");

const NAVY = "FF050E40";
const LAST = TEST_EXAMS.length + 1; // last data row
const R = (col: string) => `Calculations!$${col}$2:$${col}$${LAST}`;
const STUDY = R("D"), MOD = R("B"), CAT = R("C"), TAT = R("G"), BREACH = R("I"), SIGNED = R("J");

const f = (formula: string, result?: unknown): ExcelJS.CellFormulaValue =>
  ({ formula, result: result as ExcelJS.CellFormulaValue["result"] });

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  row.alignment = { vertical: "middle", wrapText: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addReadme(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet("README");
  sheet.getColumn(1).width = 120;
  const lines = [
    "RADiTrack validation dataset (100 examinations)",
    "",
    "PURPOSE: prove RADiTrack's calculations are correct without access to real RIS data.",
    "",
    "HOW TO USE",
    "1. In RADiTrack open RIS Simulator > 'Load 100-exam test dataset' (real data is backed up first),",
    "   or Examinations > Import exams > choose this file > 'Load as test data'.",
    "2. Open this workbook in Excel. All dates are relative to TODAY(), so the Expected sheets match the day you load the data.",
    "3. Compare the dashboard with the Expected sheets, or run `npm run test-data:verify` to fill the Verification sheet automatically.",
    "4. When done, RIS Simulator > 'Restore real data'.",
    "",
    "EXAMS SHEET COLUMNS",
    "Anchor: TODAY, WEEK_START (Monday of this week) or MONTH_START (1st of the month, shifted by Month_Offset months).",
    "Day_Offset: days added to the anchor (negative = earlier). Study_Time: HH:MM (24-hour).",
    "Completed_After_Min: minutes from study start to exam completion. TAT_Min: minutes from completion to report sign-off (blank = pending).",
    "",
    "RULES (same as the app)",
    "TAT (minutes) = Report signed - Exam completed.  SLA breach = TAT strictly greater than the target (exactly on target = within SLA).",
    "Date windows use the Study date/time. Average and median TAT use signed reports only. SLA % = (signed - breached) / signed x 100 (100 when nothing is signed).",
    "Averages are rounded to 0.1 minute, then hours = round(minutes / 60, 0.1).",
    "",
    "Load the data after 00:30 (today's test exams finish by 00:30). SLA targets assume the default settings in the 'SLA Targets' sheet.",
  ];
  lines.forEach((text, i) => {
    const cell = sheet.getCell(i + 1, 1);
    cell.value = text;
    if (i === 0) cell.font = { bold: true, size: 16, color: { argb: NAVY } };
    else if (/^[A-Z ]+$/.test(text) && text) cell.font = { bold: true, color: { argb: NAVY } };
  });
}

function addExams(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet("Exams");
  sheet.columns = TEST_EXAM_COLUMNS.map((header) => ({ header, key: header, width: header === "Notes" ? 60 : 18 }));
  for (const e of TEST_EXAMS) {
    sheet.addRow([e.accession, e.modality, e.category, e.anchor, e.monthOffset, e.dayOffset, e.studyTime, e.completedAfterMin, e.tatMin ?? null, e.note]);
  }
  sheet.getColumn(7).numFmt = "@";
  styleHeader(sheet);
}

function addSlaTargets(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet("SLA Targets");
  sheet.columns = [
    { header: "Modality", width: 12 }, { header: "Patient_Category", width: 18 },
    { header: "Target_Minutes", width: 16 }, { header: "Target_Hours", width: 14 },
  ];
  for (const m of MODALITY_ORDER) {
    for (const t of [TriageLevel.OPD, TriageLevel.IN, TriageLevel.ER]) {
      const minutes = DEFAULT_SLA_TARGETS[`${m}|${t}`];
      const r = sheet.addRow([m, t, minutes]);
      r.getCell(4).value = f(`C${r.number}/60`, minutes / 60);
    }
  }
  styleHeader(sheet);
}

function addCalculations(wb: ExcelJS.Workbook, ref: ReturnType<typeof toRefExams>) {
  const sheet = wb.addWorksheet("Calculations");
  sheet.columns = [
    { header: "Accession", width: 12 }, { header: "Modality", width: 10 }, { header: "Category", width: 10 },
    { header: "Study", width: 18 }, { header: "Completed", width: 18 }, { header: "Signed", width: 18 },
    { header: "TAT_Min", width: 10 }, { header: "SLA_Target_Min", width: 15 }, { header: "Breached", width: 10 },
    { header: "Signed?", width: 9 },
  ];
  ref.forEach((e, i) => {
    const r = i + 2;
    const anchor = `IF(Exams!D${r}="WEEK_START",TODAY()-WEEKDAY(TODAY(),3),IF(Exams!D${r}="MONTH_START",DATE(YEAR(TODAY()),MONTH(TODAY())+Exams!E${r},1),TODAY()))`;
    const target = DEFAULT_SLA_TARGETS[`${e.modality}|${e.triage}`];
    sheet.addRow([
      f(`Exams!A${r}`, e.accession),
      f(`Exams!B${r}`, e.modality),
      f(`Exams!C${r}`, e.triage),
      f(`${anchor}+Exams!F${r}+TIMEVALUE(Exams!G${r})`, e.study),
      f(`D${r}+Exams!H${r}/1440`, e.completed),
      f(`IF(Exams!I${r}="","",E${r}+Exams!I${r}/1440)`, e.signed ?? ""),
      f(`IF(F${r}="","",ROUND((F${r}-E${r})*1440,2))`, e.tatMinutes ?? ""),
      f(`SUMIFS('SLA Targets'!$C:$C,'SLA Targets'!$A:$A,B${r},'SLA Targets'!$B:$B,C${r})`, target),
      f(`IF(G${r}="","",IF(G${r}>H${r},"YES","NO"))`, e.tatMinutes === null ? "" : e.breached ? "YES" : "NO"),
      f(`IF(F${r}="","NO","YES")`, e.signed ? "YES" : "NO"),
    ]);
  });
  for (const col of [4, 5, 6]) sheet.getColumn(col).numFmt = "yyyy-mm-dd hh:mm";
  styleHeader(sheet);
}

/** Excel expressions for a preset's [start, endExclusive, priorStart, priorEndExclusive]. */
function windowFormulas(preset: KpiPreset): [string, string, string, string] {
  const mon = "(TODAY()-WEEKDAY(TODAY(),3))";
  const ms = (k: number) => `DATE(YEAR(TODAY()),MONTH(TODAY())${k >= 0 ? "+" : ""}${k},1)`;
  switch (preset) {
    case "TODAY": return ["TODAY()", "TODAY()+1", "TODAY()-1", "TODAY()"];
    case "ROLLING_7D": return ["TODAY()-6", "TODAY()+1", "TODAY()-13", "TODAY()-6"];
    case "WEEK": return [mon, `${mon}+7`, `${mon}-7`, mon];
    case "LAST_WEEK": return [`${mon}-7`, mon, `${mon}-14`, `${mon}-7`];
    case "MONTH": return [ms(0), ms(1), ms(-1), ms(0)];
    case "LAST_MONTH": return [ms(-1), ms(0), ms(-2), ms(-1)];
    case "YEAR": return ["DATE(YEAR(TODAY()),1,1)", "DATE(YEAR(TODAY())+1,1,1)", "DATE(YEAR(TODAY())-1,1,1)", "DATE(YEAR(TODAY()),1,1)"];
    default: return ["DATE(2020,1,1)", "DATE(2036,1,1)", ms(-1), ms(0)];
  }
}

function addExpectedKpis(wb: ExcelJS.Workbook, ref: ReturnType<typeof toRefExams>, now: Date) {
  const sheet = wb.addWorksheet("Expected KPIs");
  sheet.columns = [
    "Scenario", "Preset", "Modality", "Category", "Window_Start", "Window_End (excl.)", "Prior_Start", "Prior_End (excl.)",
    "Total_Exams", "Finalized", "Pending", "Avg_TAT_Min", "Avg_TAT_Hrs", "Median_TAT_Min", "Breached", "SLA_%",
    "Prior_Total", "Prior_Avg_TAT_Min",
  ].map((header, i) => ({ header, width: i === 0 ? 42 : i < 4 ? 12 : 14 }));

  kpiScenarios().forEach((s, i) => {
    const r = i + 2;
    const e = expectedKpi(ref, s, now);
    const range = resolveKpiRange(s.preset, now);
    const [ws, we, ps, pe] = windowFormulas(s.preset);
    const crit = `${MOD},IF($C${r}="ALL","*",$C${r}),${CAT},IF($D${r}="ALL","*",$D${r})`;
    const win = `${STUDY},">="&$E${r},${STUDY},"<"&$F${r},${crit}`;
    const prior = `${STUDY},">="&$G${r},${STUDY},"<"&$H${r},${crit}`;
    const arrayScope = `(${STUDY}>=$E${r})*(${STUDY}<$F${r})*((($C${r}="ALL")+(${MOD}=$C${r}))>0)*((($D${r}="ALL")+(${CAT}=$D${r}))>0)*(${SIGNED}="YES")`;
    const endExcl = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    sheet.addRow([
      scenarioLabel(s), s.preset, s.modality, s.triage,
      f(ws, range.start), f(we, endExcl(range.end)), f(ps, range.priorStart), f(pe, endExcl(range.priorEnd)),
      f(`COUNTIFS(${win})`, e.totalVolume),
      f(`COUNTIFS(${win},${SIGNED},"YES")`, e.finalizedCount),
      f(`IF($B${r}="ALL",COUNTIFS(${crit},${SIGNED},"NO"),I${r}-J${r})`, e.pendingReadingCount),
      f(`IF(J${r}=0,0,ROUND(AVERAGEIFS(${TAT},${win},${SIGNED},"YES"),1))`, e.avgTatMinutes),
      f(`ROUND(L${r}/60,1)`, e.avgTatHours),
      null, // median: array formula, set below
      f(`COUNTIFS(${win},${BREACH},"YES")`, e.breachCount),
      f(`IF(J${r}=0,100,ROUND((J${r}-O${r})/J${r}*100,1))`, e.pctOnTime),
      f(`COUNTIFS(${prior})`, e.priorTotalVolume),
      f(`IFERROR(ROUND(AVERAGEIFS(${TAT},${prior},${SIGNED},"YES"),1),0)`, e.priorAvgTatMinutes),
    ]);
    // Array formula (Ctrl+Shift+Enter style) so every Excel version evaluates the
    // conditional median instead of applying implicit intersection.
    sheet.getCell(`N${r}`).value = {
      formula: `IF(J${r}=0,0,ROUND(MEDIAN(IF(${arrayScope},${TAT})),2))`,
      shareType: "array",
      ref: `N${r}`,
      result: e.medianTatMinutes,
    } as ExcelJS.CellValue;
  });
  for (const col of [5, 6, 7, 8]) sheet.getColumn(col).numFmt = "yyyy-mm-dd";
  styleHeader(sheet);
}

function addExpectedSevenDay(wb: ExcelJS.Workbook, ref: ReturnType<typeof toRefExams>, now: Date) {
  const sheet = wb.addWorksheet("Expected 7-Day");
  sheet.columns = ["Date", "Total_Exams", "OPD", "Inpatient", "ER", "Finalized", "Pending", "Avg_TAT_Min"]
    .map((header) => ({ header, width: 14 }));
  expectedSevenDay(ref, now, "ALL").forEach((d, i) => {
    const r = i + 2;
    const day = `${STUDY},">="&$A${r},${STUDY},"<"&($A${r}+1)`;
    sheet.addRow([
      f(`TODAY()-${i}`, new Date(d.isoDate + "T00:00:00")),
      f(`COUNTIFS(${day})`, d.totalExams),
      f(`COUNTIFS(${day},${CAT},"OPD")`, d.opdCount),
      f(`COUNTIFS(${day},${CAT},"IN")`, d.inCount),
      f(`COUNTIFS(${day},${CAT},"ER")`, d.erCount),
      f(`COUNTIFS(${day},${SIGNED},"YES")`, d.finalizedCount),
      f(`B${r}-F${r}`, d.pendingCount),
      f(`IF(F${r}=0,0,ROUND(AVERAGEIFS(${TAT},${day},${SIGNED},"YES"),1))`, d.avgTatMinutes),
    ]);
  });
  sheet.getColumn(1).numFmt = "ddd, mmm d";
  styleHeader(sheet);
}

function addExpectedTwelveMonth(wb: ExcelJS.Workbook, ref: ReturnType<typeof toRefExams>, now: Date) {
  const sheet = wb.addWorksheet("Expected 12-Month");
  sheet.columns = [
    "Month", "Finalized", "Avg_TAT_Hrs", "Previous_Month_Avg_Hrs", "Change_vs_Previous_Month_%",
    "Same_Month_Last_Year_Avg_Hrs", "Change_vs_Same_Month_Last_Year_%",
  ].map((header) => ({ header, width: 22 }));
  const avgHrs = (startExpr: string) =>
    `IFERROR(ROUND(ROUND(AVERAGEIFS(${TAT},${STUDY},">="&${startExpr},${STUDY},"<"&EDATE(${startExpr},1),${SIGNED},"YES"),1)/60,1),0)`;
  const pct = (cur: number, prev: number) => (cur > 0 && prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : "");

  expectedTwelveMonth(ref, now, "ALL").forEach((m, i) => {
    const r = i + 2;
    const monthStart = `DATE(YEAR(TODAY()),MONTH(TODAY())-${11 - i},1)`;
    sheet.addRow([
      f(monthStart, new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)),
      f(`COUNTIFS(${STUDY},">="&A${r},${STUDY},"<"&EDATE(A${r},1),${SIGNED},"YES")`, m.totalFinalized),
      f(avgHrs(`A${r}`), m.avgTatHours),
      f(avgHrs(`EDATE(A${r},-1)`), m.previousMonthAvgTatHours),
      f(`IF(AND(C${r}>0,D${r}>0),ROUND((C${r}-D${r})/D${r}*100,1),"")`, pct(m.avgTatHours, m.previousMonthAvgTatHours)),
      f(avgHrs(`EDATE(A${r},-12)`), m.priorYearAvgTatHours),
      f(`IF(AND(C${r}>0,F${r}>0),ROUND((C${r}-F${r})/F${r}*100,1),"")`, pct(m.avgTatHours, m.priorYearAvgTatHours)),
    ]);
  });
  sheet.getColumn(1).numFmt = "mmm yyyy";
  styleHeader(sheet);
}

function addVerificationPlaceholder(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet("Verification");
  sheet.columns = ["Section", "Scenario", "Metric", "Expected", "RADiTrack", "Result"].map((header, i) => ({ header, width: i === 1 ? 46 : 18 }));
  sheet.addRow(["Run `npm run test-data:verify` with the test dataset loaded to fill this sheet."]);
  styleHeader(sheet);
}

export async function buildWorkbook(now: Date = new Date()): Promise<ExcelJS.Workbook> {
  const { records, errors } = parseExamRows(testDatasetRows(), now);
  if (errors.length > 0) throw new Error(`Dataset row ${errors[0].rowNumber}: ${errors[0].message}`);
  const ref = toRefExams(records, DEFAULT_SLA_TARGETS);

  const wb = new ExcelJS.Workbook();
  wb.creator = "RADiTrack";
  wb.created = now;
  wb.calcProperties = { fullCalcOnLoad: true };
  addReadme(wb);
  addExams(wb);
  addSlaTargets(wb);
  addCalculations(wb, ref);
  addExpectedKpis(wb, ref, now);
  addExpectedSevenDay(wb, ref, now);
  addExpectedTwelveMonth(wb, ref, now);
  addVerificationPlaceholder(wb);
  return wb;
}

async function main() {
  mkdirSync(path.dirname(WORKBOOK_PATH), { recursive: true });
  const wb = await buildWorkbook();
  await wb.xlsx.writeFile(WORKBOOK_PATH);
  console.log(`Wrote ${WORKBOOK_PATH}`);
}

if (process.argv[1]?.includes("build-test-workbook")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
