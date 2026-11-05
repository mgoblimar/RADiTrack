// RADiTrack validation dataset: 100 examinations with known, checkable results.
//
// Dates are RELATIVE (see lib/exam-import.ts), so the data always lines up with
// the day it is loaded: "today", the rolling 7 days, this week, this month and
// the 12-month trend all have data. Default SLA targets: ER 48 h (2,880 min),
// Inpatient 48 h (2,880 min), OPD 72 h (4,320 min). A report breaches only when
// its TAT is strictly greater than the target.
//
// Today's exams all finish by 00:30, so the dataset loads at any time after
// 00:30 (earlier, the importer rejects them as being in the future).

import type { RawRow } from "@/lib/exam-import";

type Anchor = "TODAY" | "WEEK_START" | "MONTH_START";
type Modality = "XRAY" | "MAMMO" | "US" | "CT" | "MRI";
type Category = "OPD" | "IN" | "ER";

interface TestExam {
  accession: string;
  modality: Modality;
  category: Category;
  anchor: Anchor;
  monthOffset: number;
  dayOffset: number;
  studyTime: string;
  completedAfterMin: number;
  /** null = pending (completed, not yet signed) */
  tatMin: number | null;
  note: string;
}

const exam = (
  n: number, modality: Modality, category: Category, anchor: Anchor,
  monthOffset: number, dayOffset: number, studyTime: string,
  completedAfterMin: number, tatMin: number | null, note = "",
): TestExam => ({
  accession: `TEST-${String(n).padStart(3, "0")}`,
  modality, category, anchor, monthOffset, dayOffset, studyTime, completedAfterMin, tatMin, note,
});

// --- A. Today (early-morning studies so they are always in the past) ---------
const today: TestExam[] = [
  exam(1, "XRAY", "ER", "TODAY", 0, 0, "00:00", 15, null, "Boundary: first minute of today; pending"),
  exam(2, "CT", "ER", "TODAY", 0, 0, "00:05", 5, 20, "Signed today (TAT 20 min)"),
  exam(3, "US", "OPD", "TODAY", 0, 0, "00:10", 10, null, "Pending today"),
  exam(4, "MAMMO", "OPD", "TODAY", 0, 0, "00:15", 10, null, "Pending today"),
];

// --- B. Rolling 7 days: yesterday back to 6 days ago -------------------------
const rolling7: TestExam[] = [
  exam(5, "XRAY", "OPD", "TODAY", 0, -1, "23:59", 10, null, "Boundary: last minute of yesterday; pending"),
  exam(6, "US", "IN", "TODAY", 0, -1, "09:00", 30, 300),
  exam(7, "CT", "IN", "TODAY", 0, -1, "14:00", 45, null, "Pending"),
  exam(8, "MRI", "OPD", "TODAY", 0, -1, "10:00", 60, 600),
  exam(9, "XRAY", "ER", "TODAY", 0, -2, "08:00", 15, 240),
  exam(10, "MAMMO", "OPD", "TODAY", 0, -2, "11:00", 30, 1500),
  exam(11, "CT", "ER", "TODAY", 0, -2, "16:00", 20, 900),
  exam(12, "US", "OPD", "TODAY", 0, -2, "13:00", 25, null, "Pending"),
  exam(13, "MRI", "ER", "TODAY", 0, -3, "02:00", 60, 3500, "Breach: ER over 2,880 min"),
  exam(14, "MRI", "IN", "TODAY", 0, -3, "15:00", 50, 2000),
  exam(15, "US", "ER", "TODAY", 0, -3, "18:00", 20, 600),
  exam(16, "XRAY", "OPD", "TODAY", 0, -3, "10:00", 10, 1500),
  exam(17, "CT", "OPD", "TODAY", 0, -4, "09:30", 40, 4320, "Exact OPD target (4,320) = within SLA"),
  exam(18, "XRAY", "ER", "TODAY", 0, -4, "21:00", 10, 2881, "Breach by 1 minute (ER target 2,880)"),
  exam(19, "MAMMO", "OPD", "TODAY", 0, -4, "13:30", 30, 3000),
  exam(20, "US", "IN", "TODAY", 0, -4, "08:15", 30, 1800),
  exam(21, "XRAY", "IN", "TODAY", 0, -5, "07:30", 10, 2880, "Exact IN target (2,880) = within SLA"),
  exam(22, "XRAY", "OPD", "TODAY", 0, -5, "12:00", 10, 800),
  exam(23, "CT", "IN", "TODAY", 0, -5, "17:45", 30, 2200),
  exam(24, "US", "OPD", "TODAY", 0, -5, "10:30", 25, 4400, "Breach: OPD over 4,320 min"),
  exam(25, "XRAY", "IN", "TODAY", 0, -6, "00:00", 10, 1000, "Boundary: first minute of the rolling 7-day window"),
  exam(26, "MAMMO", "OPD", "TODAY", 0, -6, "09:00", 30, 4321, "Breach by 1 minute (OPD target 4,320)"),
  exam(27, "CT", "ER", "TODAY", 0, -6, "19:00", 20, 700),
  exam(28, "US", "IN", "TODAY", 0, -6, "14:00", 25, null, "Pending (older backlog)"),
];

// --- C. Previous 7 days: 7 to 13 days ago ------------------------------------
const previous7: TestExam[] = [
  exam(29, "XRAY", "ER", "TODAY", 0, -7, "23:59", 10, 500, "Boundary: last minute before the rolling 7-day window"),
  exam(30, "US", "OPD", "TODAY", 0, -7, "10:00", 20, 2600),
  exam(31, "CT", "IN", "TODAY", 0, -8, "08:00", 30, 3100, "Breach: IN over 2,880 min"),
  exam(32, "MRI", "OPD", "TODAY", 0, -8, "11:00", 60, 3900),
  exam(33, "XRAY", "OPD", "TODAY", 0, -9, "09:00", 10, 1300),
  exam(34, "MAMMO", "OPD", "TODAY", 0, -9, "14:00", 30, 2700),
  exam(35, "US", "ER", "TODAY", 0, -10, "07:00", 20, 450),
  exam(36, "CT", "OPD", "TODAY", 0, -10, "16:00", 40, 2900),
  exam(37, "XRAY", "IN", "TODAY", 0, -11, "13:00", 10, 1700),
  exam(38, "MRI", "IN", "TODAY", 0, -11, "10:00", 60, 2500),
  exam(39, "US", "IN", "TODAY", 0, -12, "09:30", 25, 2100),
  exam(40, "XRAY", "ER", "TODAY", 0, -12, "18:00", 10, 350),
  exam(41, "CT", "ER", "TODAY", 0, -13, "11:00", 20, 1100),
  exam(42, "MAMMO", "OPD", "TODAY", 0, -13, "15:00", 30, 3600),
  exam(43, "US", "OPD", "TODAY", 0, -13, "08:45", 25, 4100),
  exam(44, "XRAY", "OPD", "TODAY", 0, -13, "12:15", 10, 2200),
];

// --- D. Week and month boundaries (signed quickly so never in the future) ----
const boundaries: TestExam[] = [
  exam(45, "XRAY", "OPD", "WEEK_START", 0, 0, "00:00", 10, 60, "Boundary: first minute of this week (Monday)"),
  exam(46, "US", "IN", "WEEK_START", 0, -1, "23:59", 10, 30, "Boundary: last minute of last week (Sunday)"),
  exam(47, "CT", "OPD", "MONTH_START", 0, 0, "00:00", 20, 60, "Boundary: first minute of this month"),
  exam(48, "MRI", "IN", "MONTH_START", 0, -1, "23:59", 30, 45, "Boundary: last minute of last month"),
  exam(49, "MAMMO", "OPD", "MONTH_START", 0, -2, "08:00", 30, 1200, "Last month, second-to-last day"),
];

// --- E. Last month (always in the past) ---------------------------------------
const lastMonth: TestExam[] = [
  exam(50, "XRAY", "ER", "MONTH_START", -1, 3, "09:00", 10, 420),
  exam(51, "US", "OPD", "MONTH_START", -1, 6, "10:00", 20, 2500),
  exam(52, "CT", "IN", "MONTH_START", -1, 9, "13:00", 30, 2950, "Breach: IN over 2,880 min"),
  exam(53, "MRI", "OPD", "MONTH_START", -1, 12, "08:00", 60, 3300),
  exam(54, "MAMMO", "OPD", "MONTH_START", -1, 15, "14:00", 30, 1900),
  exam(55, "XRAY", "IN", "MONTH_START", -1, 18, "07:00", 10, 1250),
  exam(56, "US", "ER", "MONTH_START", -1, 21, "16:00", 20, 800),
  exam(57, "CT", "OPD", "MONTH_START", -1, 24, "11:00", 40, 4500, "Breach: OPD over 4,320 min"),
];

// --- F. Earlier months (2 to 13 months ago): a fixed, documented pattern ------
// Gives the 12-month trend, previous-month and same-month-last-year comparisons
// data in every month. Months 12 and 13 ago are the "last year" baseline for
// this month and last month.
const MODALITY_CYCLE: Modality[] = ["XRAY", "MAMMO", "US", "CT", "MRI"];
const CATEGORY_CYCLE: Category[] = ["OPD", "IN", "ER"];
const TAT_CYCLE = [600, 1450, 2300, 3100, 4000, 900, 1750, 2650, 4400, 1200, 2050, 3350];
const TIMES = ["08:00", "10:30", "13:15", "15:45"];
const COMPLETED_AFTER = [10, 20, 30, 45];
const EXAMS_PER_MONTH: Record<number, number> = {
  2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 4, 13: 4,
};

const earlierMonths: TestExam[] = [];
let next = 58;
for (let monthsAgo = 2; monthsAgo <= 13; monthsAgo++) {
  for (let i = 0; i < EXAMS_PER_MONTH[monthsAgo]; i++) {
    earlierMonths.push(exam(
      next,
      MODALITY_CYCLE[(monthsAgo + i) % 5],
      CATEGORY_CYCLE[(monthsAgo * 2 + i) % 3],
      "MONTH_START",
      -monthsAgo,
      3 + i * 6,
      TIMES[i],
      COMPLETED_AFTER[i],
      TAT_CYCLE[(next - 58) % TAT_CYCLE.length],
      `${monthsAgo} months ago`,
    ));
    next++;
  }
}

export const TEST_EXAMS: readonly TestExam[] = [
  ...today, ...rolling7, ...previous7, ...boundaries, ...lastMonth, ...earlierMonths,
];

/** Column order used by the workbook's Exams sheet and the importer. */
export const TEST_EXAM_COLUMNS = [
  "Accession", "Modality", "Patient_Category", "Anchor", "Month_Offset",
  "Day_Offset", "Study_Time", "Completed_After_Min", "TAT_Min", "Notes",
] as const;

/** Rows keyed by normalized header, ready for parseExamRows(). */
export function testDatasetRows(): RawRow[] {
  return TEST_EXAMS.map((e) => ({
    accession: e.accession,
    modality: e.modality,
    patient_category: e.category,
    anchor: e.anchor,
    month_offset: e.monthOffset,
    day_offset: e.dayOffset,
    study_time: e.studyTime,
    completed_after_min: e.completedAfterMin,
    tat_min: e.tatMin ?? undefined,
    notes: e.note,
  }));
}
