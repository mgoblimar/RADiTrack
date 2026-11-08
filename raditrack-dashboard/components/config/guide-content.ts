// Text content for the in-app RADiTrack guide (Configurations → RADiTrack Guide).
// Mirrors docs/computations.md; keep the two in sync when rules change.

import {
  BookOpen,
  Calculator,
  CalendarRange,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  MonitorPlay,
  Settings2,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";

export const GUIDE_SECTIONS = [
  { id: "guide-start", label: "Start here", icon: BookOpen },
  { id: "guide-parts", label: "Parts of RADiTrack", icon: LayoutDashboard },
  { id: "guide-formulas", label: "How numbers work", icon: Calculator },
  { id: "guide-terms", label: "Terms", icon: ClipboardList },
  { id: "guide-sla", label: "SLA targets", icon: Target },
  { id: "guide-windows", label: "Time windows", icon: CalendarRange },
  { id: "guide-privacy", label: "Data & privacy", icon: ShieldCheck },
  { id: "guide-checking", label: "Checking the numbers", icon: FlaskConical },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon }[];

export const ROUTINE = [
  { title: "Exam is logged", text: "Each completed scan enters RADiTrack with its accession number, modality and patient category: from the RIS, an import, or the RIS Simulator." },
  { title: "It waits in the reading queue", text: "Examinations → Backlog lists every completed exam not yet signed, how long it has waited, and whether it is past its SLA." },
  { title: "Radiologist signs off", text: "Signing stops the clock. RADiTrack saves the Turnaround Time (TAT) and whether it breached the SLA target." },
  { title: "Dashboard and TV update", text: "KPI cards, charts and the Patient TV display refresh automatically for everyone." },
  { title: "Review and report", text: "Pick a period, modality or patient category in the filter bar, then Generate report for a PDF summary." },
];

export const PARTS: { icon: LucideIcon; title: string; summary: string; items: string[] }[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    summary: "The big picture for any period.",
    items: [
      "Filter bar: one time window, modality and patient category for every section below it.",
      "KPI cards: total scans, average TAT (with median), SLA compliance and reading backlog, compared with the previous period.",
      "TAT by modality: average TAT per modality; pick a patient category to see its SLA targets (red = over target).",
      "7-day table: always the latest 7 days (today and the 6 days before), like Recent pulse. Exams per day, OPD/IN/ER split, signed, pending and average TAT. Switch between 'Last 7 days' and 'Mon–Sun week'; 'Compare previous 7 days' shows the 7 days before.",
      "12-month trend: monthly average TAT. Opens on the current calendar year (January–December). 'Last 12 months' instead shows the month your date filter ends in plus the 11 months before it, so it crosses into the previous year. Hover a month for the previous month and the same month last year.",
      "Generate report: a printable PDF for a chosen period, modality, category and sections.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Examinations",
    summary: "Every exam, one row each.",
    items: [
      "Backlog / Finalized / All tabs. All always equals Finalized + Backlog for the current filters.",
      "Search by accession number; filter by date, modality and patient category.",
      "Sign off, edit or delete an exam from its row.",
      "Import exams (.xlsx or .csv) with a preview first; Export CSV for audits.",
    ],
  },
  {
    icon: Settings2,
    title: "Configurations",
    summary: "Targets, rooms and this guide.",
    items: [
      "SLA targets: maximum TAT per modality and patient category. Changes apply to reports signed afterwards.",
      "Modality rooms: room assignment and whether a modality is online or under maintenance.",
    ],
  },
  {
    icon: FlaskConical,
    title: "RIS Simulator",
    summary: "Practice and testing.",
    items: [
      "Log test scans and run preset scenarios for demonstrations.",
      "Load the 100-exam validation dataset, then restore the real data.",
    ],
  },
  {
    icon: MonitorPlay,
    title: "Patient TV display",
    summary: "For the waiting area.",
    items: ["Shows current queue information with no patient names or identifying details."],
  },
];

export const TERMS: [string, string][] = [
  ["Examination (exam)", "One imaging study for one patient, identified by its accession number."],
  ["Modality", "The imaging service: X-ray, Mammogram, Ultrasound, CT-Scan or MRI (always in this order)."],
  ["Patient category", "Where the patient comes from: Outpatient (OPD), Inpatient (IN) or Emergency (ER)."],
  ["Study date/time", "When the study took place. Every date filter uses this time."],
  ["Exam completed", "When the imaging itself finished. The TAT clock starts here."],
  ["Report signed", "When the radiologist signed off the report. The TAT clock stops here."],
  ["Finalized", "An exam whose report has been signed."],
  ["Backlog (pending)", "A completed exam whose report is not signed yet."],
  ["TAT (Turnaround Time)", "Time from exam completed to report signed."],
  ["SLA target", "Service Level Agreement: the maximum TAT allowed for a modality and patient category."],
  ["SLA breach", "A signed report whose TAT is longer than its SLA target."],
  ["Past SLA, still unsigned", "A backlog exam that has already waited longer than its SLA target."],
  ["Median", "The middle value when TATs are sorted; less affected by a few very slow reports than the average."],
  ["Cancelled", "An exam with status Cancelled. Left out of every count and average."],
];

export const FORMULAS = [
  { name: "Turnaround Time (TAT)", formula: "Report signed − Exam completed", example: "Completed 6 Nov 08:10, signed 7 Nov 09:40 → 25 h 30 min (25.5 h)." },
  { name: "SLA breach", formula: "TAT > SLA target", example: "ER target 48 h: exactly 48 h is within SLA; 48 h 1 min is a breach." },
  { name: "SLA compliance", formula: "(Finalized − Breached) ÷ Finalized × 100", example: "25 signed, 4 breached → 21 ÷ 25 × 100 = 84%." },
  { name: "Average TAT", formula: "Sum of TATs ÷ signed reports", example: "600 + 1,500 + 2,000 + 4,400 min → 8,500 ÷ 4 = 2,125 min (35.4 h)." },
  { name: "Median TAT", formula: "Middle TAT (average of the middle two if even)", example: "Same four reports → (1,500 + 2,000) ÷ 2 = 1,750 min." },
  { name: "Change vs previous period", formula: "(Current − Previous) ÷ Previous × 100", example: "26.4 h now vs 37.8 h before → −30%, shown as '30% faster'." },
];

export const FORMULA_NOTES = [
  "Only signed reports have a TAT; pending exams never count in averages or medians.",
  "Averages are rounded to 0.1 minute, then shown in hours to 0.1. Percentages use 1 decimal place.",
  "When nothing is signed in a period, SLA compliance shows 100% and average TAT shows 0 or a dash.",
  "Whether a report breached is decided when it is signed, using the SLA targets in force then.",
];

export const WINDOWS: { name: string; includes: string; compared: string }[] = [
  { name: "Today", includes: "00:00 to 23:59 today", compared: "Yesterday" },
  { name: "Rolling 7 days", includes: "00:00 six days ago to the end of today", compared: "The 7 days before" },
  { name: "This week / Last week", includes: "Monday 00:00 to Sunday 23:59", compared: "The week before" },
  { name: "This month / Last month", includes: "1st 00:00 to the month's last day 23:59", compared: "The month before" },
  { name: "This year", includes: "1 January to 31 December", compared: "Last year" },
  { name: "Custom", includes: "00:00 of the start date to 23:59 of the end date", compared: "Same number of days just before" },
  { name: "All time", includes: "Every recorded exam", compared: "The previous calendar month" },
];

export const CHECKING_STEPS = [
  { title: "Load test data", text: "RIS Simulator → Load 100-exam test dataset. Real data is backed up first." },
  { title: "Open the workbook", text: "Download the test workbook. Its Expected sheets show what every card and chart should read today." },
  { title: "Compare", text: "Check the dashboard against the workbook, or run npm run test-data:verify for an automatic PASS/FAIL report." },
  { title: "Restore", text: "RIS Simulator → Restore real data. Exams added by others meanwhile are discarded, so keep tests short." },
];
