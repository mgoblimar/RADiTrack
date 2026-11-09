"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { ModalityCode } from "@/lib/enums";
import { fetchSevenDayAnalyticsAction } from "@/app/actions";
import type { DashboardFilters } from "@/lib/dashboard-types";
import { toIsoDate } from "@/lib/kpi-range";
import { SegmentedToggle } from "@/components/common/SegmentedToggle";
import { CompareToggle } from "@/components/common/CompareToggle";

import {
  Calendar,
  Layers,
} from "lucide-react";

interface CategoryDay {
  totalExams: number;
  finalizedCount: number;
  pendingCount: number;
  avgTatMinutes: number;
  avgTatHours: number;
}

interface DayRow {
  dayLabel: string;
  formattedDate: string;
  isoDate: string;
  totalExams: number;
  opdCount: number;
  inCount: number;
  erCount: number;
  finalizedCount: number;
  pendingCount: number;
  avgTatMinutes: number;
  avgTatHours: number;
  /** Per patient category; missing on data from before this field existed. */
  byCategory?: Record<"OPD" | "IN" | "ER", CategoryDay>;
}

interface ModalityAnalytics {
  dayRows: DayRow[];
  priorDayRows?: DayRow[];
  currentAvgTatMinutes: number;
  currentAvgTatHours: number;
  priorAvgTatMinutes: number;
  priorAvgTatHours: number;
  currentTotalVolume: number;
  priorTotalVolume: number;
  currentFinalizedCount?: number;
  priorFinalizedCount?: number;
  pctChange: number;
  anchorFormatted?: string;
  mode?: "rolling" | "static";
}

interface Props {
  analytics: {
    all: ModalityAnalytics;
    byModality: Record<string, ModalityAnalytics>;
  };
  /** Dashboard filter bar: only the modality applies (the window is always the latest 7 days). */
  filters: DashboardFilters;
}

type AnalyticsMode = "rolling" | "static";

// Same blue as the "previous" table's dot and figures.
const QC_BLUE = "#18298C";

const WINDOW_MODES: ReadonlyArray<{
  value: AnalyticsMode;
  label: string;
  hint: string;
}> = [
  { value: "rolling", label: "Last 7 days", hint: "Today and the 6 days before it" },
  { value: "static", label: "Mon–Sun week", hint: "This calendar week, Monday to Sunday" },
];

const MODALITY_TABS = [
  { key: "ALL", label: "All" },
  { key: ModalityCode.XRAY, label: "X-ray" },
  { key: ModalityCode.MAMMO, label: "Mammogram" },
  { key: ModalityCode.US, label: "Ultrasound" },
  { key: ModalityCode.CT, label: "CT" },
  { key: ModalityCode.MRI, label: "MRI" },
];

/** Sub-row order and labels, as in the proposal's 7-day table. */
const CATEGORY_SUB_ROWS = [
  { key: "OPD", label: "a. OPD", columnIndex: 0 },
  { key: "IN", label: "b. IN", columnIndex: 1 },
  { key: "ER", label: "c. ER", columnIndex: 2 },
] as const;

const CATEGORY_COLUMNS = [
  {
    key: "opdCount",
    letter: "O",
    label: "Outpatient",
    shortLabel: "OPD",
    headerClass: "bg-blue-50 text-blue-800",
    valueClass: "text-blue-800",
    totalClass: "bg-blue-50 text-blue-900",
  },
  {
    key: "inCount",
    letter: "I",
    label: "Inpatient",
    shortLabel: "IN",
    headerClass: "bg-indigo-50 text-indigo-800",
    valueClass: "text-indigo-800",
    totalClass: "bg-indigo-50 text-indigo-900",
  },
  {
    key: "erCount",
    letter: "E",
    label: "Emergency",
    shortLabel: "ER",
    headerClass: "bg-red-50 text-red-800",
    valueClass: "text-red-800",
    totalClass: "bg-red-50 text-red-900",
  },
] as const;

export function SevenDayTatTable({
  analytics: initialAnalytics,
  filters,
}: Props) {
  /* =========================================================
     UI state
  ========================================================= */

  // Modality comes from the dashboard filter bar.
  const activeTab: string = filters.modality;

  const [mode, setMode] =
    useState<AnalyticsMode>("rolling");

  // Off by default; shows the previous 7 days next to the current table.
  const [showPrevious, setShowPrevious] = useState(false);

  // Off by default; adds OPD / IN / ER sub-rows under each day.
  const [showCategoryRows, setShowCategoryRows] = useState(false);

  /* =========================================================
     Analytics: always the latest 7 days (ending today), the same
     window as Recent pulse. The date filter does not move it.
  ========================================================= */

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const requestKey = `${todayIso}|${mode}`;
  const isInitialRequest = mode === "rolling";

  const [fetched, setFetched] = useState<{
    key: string;
    data: Props["analytics"];
  } | null>(null);

  const [isTransitionPending, startTransition] = useTransition();

  useEffect(() => {
    if (isInitialRequest) return;

    let isCancelled = false;
    startTransition(async () => {
      try {
        const result = await fetchSevenDayAnalyticsAction(todayIso, mode);
        if (!isCancelled) setFetched({ key: requestKey, data: result });
      } catch (error) {
        console.error(
          "Failed to fetch seven-day Turnaround Time analytics:",
          error,
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isInitialRequest, todayIso, mode, requestKey]);

  // Keep showing the last result while a new window loads.
  const analytics = isInitialRequest
    ? initialAnalytics
    : (fetched?.data ?? initialAnalytics);
  const isPending =
    isTransitionPending || (!isInitialRequest && fetched?.key !== requestKey);

  /* =========================================================
     Current modality data
  ========================================================= */

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] ?? analytics.all;

  const currentTabLabel =
    MODALITY_TABS.find((tab) => tab.key === activeTab)
      ?.label ?? "All";

  const modalityScopeLabel =
    activeTab === "ALL"
      ? "For all Modalities"
      : `${currentTabLabel} only`;

  const previousLabel = mode === "rolling" ? "Previous 7 days" : "Previous week";

  /* =========================================================
     Date labels
  ========================================================= */

  const firstDay =
    currentData.dayRows[
      currentData.dayRows.length - 1
    ]?.formattedDate ?? "";

  const lastDay =
    currentData.dayRows[0]?.formattedDate ?? "";

  /* =========================================================
     Format Turnaround Time
  ========================================================= */

  const formatTurnaroundTime = (
    _minutes: number,
    hours: number,
  ) => `${hours} hrs`;

  /* =========================================================
     Render table
  ========================================================= */

  const renderTable = (
    rows: DayRow[],
    isPrior = false,
  ) => {
    const totalVolume = rows.reduce(
      (sum, row) => sum + row.totalExams,
      0,
    );

    const totalFinalized = rows.reduce(
      (sum, row) => sum + row.finalizedCount,
      0,
    );

    const totalPending = rows.reduce(
      (sum, row) => sum + row.pendingCount,
      0,
    );

    const totalOutpatient = rows.reduce(
      (sum, row) => sum + row.opdCount,
      0,
    );

    const totalInpatient = rows.reduce(
      (sum, row) => sum + row.inCount,
      0,
    );

    const totalEmergency = rows.reduce(
      (sum, row) => sum + row.erCount,
      0,
    );

    const weightedTatNumerator = rows.reduce(
      (sum, row) =>
        sum +
        (row.finalizedCount > 0
          ? row.avgTatMinutes * row.finalizedCount
          : 0),
      0,
    );

    const weightedTat =
      totalFinalized > 0
        ? Math.round(
            weightedTatNumerator / totalFinalized,
          )
        : 0;

    const weightedTatHours =
      weightedTat >= 60
        ? Number((weightedTat / 60).toFixed(1))
        : 0;

    const categoryTotals = [
      totalOutpatient,
      totalInpatient,
      totalEmergency,
    ];

    const tatTone = isPrior ? "text-qc-blue" : "text-qc-navy";

    return (
      <>
      {/* Phones and tablets: one card per day, totals last */}
      <ol className="space-y-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.isoDate} className="rounded-2xl border border-border bg-card p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-extrabold text-qc-navy">
                {row.formattedDate}
                <DayTag label={row.dayLabel} />
              </p>
              <p className={`font-mono text-sm font-extrabold ${row.finalizedCount > 0 ? tatTone : "text-muted-foreground"}`}>
                {row.finalizedCount > 0 ? `${row.avgTatHours} hrs` : "—"}
              </p>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              {[
                ["Exams", row.totalExams],
                ["OPD", row.opdCount],
                ["IN", row.inCount],
                ["ER", row.erCount],
                ["Signed", row.finalizedCount],
                ["Pending", row.pendingCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-background px-2 py-1.5">
                  <dt className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className={`font-mono text-sm font-extrabold ${label === "Pending" && Number(value) > 0 ? "text-qc-orange" : "text-qc-navy"}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {showCategoryRows && row.byCategory && (
              <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                {CATEGORY_SUB_ROWS.map((category) => {
                  const values = row.byCategory![category.key];
                  return (
                    <li key={category.key} className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-muted-foreground">{category.label}</span>
                      <span className="font-mono text-qc-navy">
                        {values.totalExams} exams · {values.finalizedCount} signed · {values.pendingCount} pending ·{" "}
                        <strong>{values.finalizedCount > 0 ? `${values.avgTatHours} hrs` : "—"}</strong>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
        <li className="rounded-2xl border border-qc-navy/15 bg-qc-navy/[0.04] p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-extrabold text-qc-navy">7-day total</p>
            <p className={`font-mono text-sm font-extrabold ${tatTone}`}>{weightedTat > 0 ? `${weightedTatHours} hrs` : "—"}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalVolume} exams · OPD {totalOutpatient} · IN {totalInpatient} · ER {totalEmergency} · {totalFinalized} signed · {totalPending} pending
          </p>
        </li>
      </ol>

      {/* Desktop: full table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              {/* Main header */}
              <tr className="border-b border-border bg-background/70 text-xs font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-3 align-middle"
                >
                  Day
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Exams
                </th>

                <th
                  colSpan={3}
                  className="border-x border-border/70 px-3 py-2.5 text-center"
                >
                  <span className="block text-xs font-extrabold text-qc-navy">
                    Patient Category
                  </span>
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Signed
                </th>

                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-3 py-3 text-center align-middle"
                >
                  Pending
                </th>

                <th
                  rowSpan={2}
                  className="min-w-[145px] whitespace-nowrap px-4 py-3 text-right align-middle"
                >
                  Avg. Turnaround Time
                </th>
              </tr>

              {/* Patient Category subheaders */}
              <tr className="border-b border-border bg-background/40">
                {CATEGORY_COLUMNS.map((category) => (
                  <th
                    key={category.key}
                    scope="col"
                    title={category.label}
                    aria-label={category.label}
                    className="min-w-[66px] px-2 py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`flex h-6 w-7 items-center justify-center rounded-md text-xs font-black ${category.headerClass}`}
                      >
                        {category.letter}
                      </span>

                      <span className="text-xs font-bold normal-case tracking-normal text-muted-foreground">
                        {category.shortLabel}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const isToday = row.isoDate === todayIso;

                const isSlow =
                  row.finalizedCount > 0 &&
                  row.avgTatMinutes > 120;

                const categoryValues = [
                  row.opdCount,
                  row.inCount,
                  row.erCount,
                ];

                return (
                  <Fragment key={`${row.isoDate}-${row.dayLabel}`}>
                  <tr
                    className={`transition-colors ${
                      isToday
                        ? "bg-qc-yellow/10"
                        : "hover:bg-qc-blue/[0.025]"
                    }`}
                  >
                    {/* Day: weekday and date, tagged Today / Yesterday */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="whitespace-nowrap text-xs font-extrabold text-qc-navy">
                          {row.formattedDate}
                        </span>
                        <DayTag label={row.dayLabel} />
                      </div>
                    </td>

                    {/* Total examinations */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-navy">
                        {row.totalExams}
                      </span>
                    </td>

                    {/* Category counts */}
                    {CATEGORY_COLUMNS.map((category, index) => (
                      <td
                        key={category.key}
                        className="px-2 py-3 text-center"
                        title={`${category.label}: ${categoryValues[index]}`}
                      >
                        <span
                          className={`inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 text-xs font-extrabold tabular-nums ${category.valueClass}`}
                        >
                          {categoryValues[index]}
                        </span>
                      </td>
                    ))}

                    {/* Signed */}
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-extrabold text-qc-blue">
                        {row.finalizedCount}
                      </span>
                    </td>

                    {/* Pending */}
                    <td className="px-3 py-3 text-center">
                      {row.pendingCount > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-50 px-1.5 py-0.5 text-xs font-extrabold text-qc-orange">
                          {row.pendingCount}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>

                    {/* Average Turnaround Time */}
                    <td className="px-4 py-3 text-right">
                      {row.finalizedCount === 0 ? (
                        <span className="text-xs font-medium text-muted-foreground/40">
                          —
                        </span>
                      ) : (
                        <span
                          className={`font-mono text-xs font-extrabold ${
                            isSlow
                              ? "text-qc-red"
                              : isPrior
                                ? "text-qc-blue"
                                : "text-qc-navy"
                          }`}
                        >
                          {formatTurnaroundTime(
                            row.avgTatMinutes,
                            row.avgTatHours,
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                  {showCategoryRows &&
                    row.byCategory &&
                    CATEGORY_SUB_ROWS.map((category) => (
                      <CategorySubRow
                        key={category.key}
                        label={category.label}
                        columnIndex={category.columnIndex}
                        values={row.byCategory![category.key]}
                        isPrior={isPrior}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>

            {/* Totals */}
            <tfoot className="border-t border-border bg-background/70">
              <tr>
                <td className="px-4 py-3">
                  <span className="text-xs font-extrabold text-qc-navy">
                    Total
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-navy">
                    {totalVolume}
                  </span>
                </td>

                {categoryTotals.map((total, index) => (
                  <td
                    key={CATEGORY_COLUMNS[index].key}
                    className="px-2 py-3 text-center"
                  >
                    <span
                      className={`inline-flex min-w-7 items-center justify-center rounded-lg px-2 py-1 text-xs font-extrabold tabular-nums ${CATEGORY_COLUMNS[index].totalClass}`}
                    >
                      {total}
                    </span>
                  </td>
                ))}

                <td className="px-3 py-3 text-center">
                  <span className="text-xs font-extrabold text-qc-blue">
                    {totalFinalized}
                  </span>
                </td>

                <td className="px-3 py-3 text-center">
                  {totalPending > 0 ? (
                    <span className="text-xs font-extrabold text-qc-orange">
                      {totalPending}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">
                      —
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-xs font-extrabold ${
                      isPrior ? "text-qc-blue" : "text-qc-navy"
                    }`}
                  >
                    {weightedTat > 0
                      ? `${weightedTatHours} hrs`
                      : "—"}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      </>
    );
  };

  /* =========================================================
     Return
  ========================================================= */

  return (
    <div className="min-w-0">
      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Date navigation and selected modality */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-1.5">
              {/* Read-only date span: plain text, not a pill */}
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-extrabold text-qc-navy">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-qc-blue" />
                {firstDay} – {lastDay}
              </span>

              {isPending && (
                <span className="ml-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-qc-yellow" />
              )}
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                activeTab === "ALL"
                  ? "border-qc-blue/10 bg-qc-blue/[0.06] text-qc-blue"
                  : "border-qc-yellow/40 bg-qc-yellow/15 text-qc-navy"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {modalityScopeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Window type first: it decides which days are shown */}
          <SegmentedToggle
            label="Seven-day window"
            options={WINDOW_MODES}
            value={mode}
            onChange={setMode}
          />

          <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />

          {/* Show the period before beside the current table */}
          <CompareToggle
            label={`Compare ${previousLabel.toLowerCase()}`}
            checked={showPrevious}
            onChange={() => setShowPrevious((previous) => !previous)}
            accentColor={QC_BLUE}
            swatch={<span className="h-2 w-2 rounded-full bg-qc-blue" />}
          />

          {/* OPD / IN / ER detail under each day */}
          <CompareToggle
            label="Show OPD / IN / ER rows"
            checked={showCategoryRows}
            onChange={() => setShowCategoryRows((previous) => !previous)}
            accentColor="#050E40"
            title="Signed, pending and average TAT for each patient category"
          />
          </div>
        </div>
      </div>

      {/* Current table, optionally beside the previous 7 days */}
      <div className="px-4 pb-5 pt-4 sm:px-5">
        <div
          className={`grid grid-cols-1 gap-5 ${
            showPrevious ? "xl:grid-cols-2" : ""
          }`}
        >
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-qc-yellow" />
                <span className="text-sm font-extrabold text-qc-navy">
                  Current
                </span>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {currentData.currentTotalVolume} exams
              </span>
            </div>

            {renderTable(currentData.dayRows)}
          </div>

          {showPrevious && (
            <div className="min-w-0 space-y-2.5">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-qc-blue" />
                  <span className="text-sm font-extrabold text-qc-navy">
                    {previousLabel}
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {currentData.priorTotalVolume} exams
                </span>
              </div>

              {currentData.priorDayRows &&
              currentData.priorDayRows.length > 0 ? (
                renderTable(currentData.priorDayRows, true)
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-border bg-background p-8 text-center">
                  <div>
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Layers className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-extrabold text-qc-navy">
                      No previous data
                    </p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                      There is no earlier seven-day period to compare with.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <WeekComparisonNote
          currentHours={currentData.currentAvgTatHours}
          priorHours={currentData.priorAvgTatHours}
          pctChange={currentData.pctChange}
          previousLabel={previousLabel.toLowerCase()}
        />
      </div>
    </div>
  );
}

interface CategorySubRowProps {
  label: string;
  /** Which of the OPD / IN / ER columns holds this category's count. */
  columnIndex: number;
  values: CategoryDay;
  isPrior: boolean;
}

/** One "a. OPD" style sub-row under a day: the same columns for one patient category. */
function CategorySubRow({ label, columnIndex, values, isPrior }: CategorySubRowProps) {
  const muted = <span className="text-xs text-muted-foreground/40">—</span>;
  return (
    <tr className="bg-background/50 text-xs">
      <td className="py-1.5 pl-9 pr-4 font-bold text-muted-foreground">{label}</td>
      <td className="px-3 py-1.5 text-center font-bold text-qc-navy">{values.totalExams}</td>
      {CATEGORY_COLUMNS.map((category, index) => (
        <td key={category.key} className={`px-2 py-1.5 text-center font-bold ${category.valueClass}`}>
          {index === columnIndex ? values.totalExams : ""}
        </td>
      ))}
      <td className="px-3 py-1.5 text-center font-bold text-qc-blue">{values.finalizedCount}</td>
      <td className="px-3 py-1.5 text-center">
        {values.pendingCount > 0 ? (
          <span className="font-extrabold text-qc-orange">{values.pendingCount}</span>
        ) : (
          muted
        )}
      </td>
      <td className="px-4 py-1.5 text-right">
        {values.finalizedCount > 0 ? (
          <span className={`font-mono font-bold ${isPrior ? "text-qc-blue" : "text-qc-navy"}`}>
            {values.avgTatHours} hrs
          </span>
        ) : (
          muted
        )}
      </td>
    </tr>
  );
}

interface WeekComparisonNoteProps {
  currentHours: number;
  priorHours: number;
  pctChange: number;
  previousLabel: string;
}

/**
 * The proposal's note under the weekly table: "There is a longer / shorter (_%)
 * TAT than the previous week (average _ hours)".
 */
function WeekComparisonNote({ currentHours, priorHours, pctChange, previousLabel }: WeekComparisonNoteProps) {
  const boxClass = "mt-4 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground";

  if (currentHours <= 0) {
    return (
      <p className={boxClass}>
        No signed reports in this period yet, so there is no average TAT to compare.
      </p>
    );
  }

  const summary = <strong className="text-qc-navy">{currentHours} hrs</strong>;

  if (priorHours <= 0) {
    return (
      <p className={boxClass}>
        Average TAT for this period: {summary}. No signed reports in the {previousLabel} to compare with.
      </p>
    );
  }

  const isSame = Math.abs(pctChange) < 0.05;
  const isLonger = pctChange > 0;

  return (
    <p className={boxClass}>
      Average TAT for this period: {summary}.{" "}
      {isSame ? (
        <>The same as the {previousLabel}</>
      ) : (
        <>
          <strong className={isLonger ? "text-qc-red" : "text-emerald-700"}>
            {Math.abs(pctChange)}% {isLonger ? "longer" : "shorter"}
          </strong>{" "}
          than the {previousLabel}
        </>
      )}{" "}
      (average {priorHours} hrs).
    </p>
  );
}
/** Small "Today" / "Yesterday" pill next to a day's date; nothing otherwise. */
function DayTag({ label }: { label: string }) {
  if (label !== "Today" && label !== "Yesterday") return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
        label === "Today"
          ? "bg-qc-yellow text-qc-navy"
          : "bg-qc-blue/10 text-qc-blue"
      }`}
    >
      {label}
    </span>
  );
}
