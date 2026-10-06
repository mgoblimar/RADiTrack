"use client";

import { useState, useTransition, useMemo } from "react";
import { ModalityCode } from "@/lib/enums";
import { fetchSevenDayAnalyticsAction } from "@/app/actions";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Layers,
  Columns2,
  Maximize2,
} from "lucide-react";

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
}

export function SevenDayTatTable({ analytics: initialAnalytics }: Props) {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [mode, setMode] = useState<"rolling" | "static">("rolling");
  // Side-by-side view requested by user as primary comparison layout
  const [viewLayout, setViewLayout] = useState<"sideBySide" | "single">("sideBySide");

  // Local ISO string for today (YYYY-MM-DD)
  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [anchorDate, setAnchorDate] = useState<string>(() => {
    return initialAnalytics.all.anchorFormatted || todayIso;
  });
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [isPending, startTransition] = useTransition();

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] || analytics.all;

  const tabs = [
    { key: "ALL", label: "All Modalities" },
    { key: ModalityCode.XRAY, label: "X-ray" },
    { key: ModalityCode.US, label: "Ultrasound" },
    { key: ModalityCode.CT, label: "CT-Scan" },
    { key: ModalityCode.MRI, label: "MRI" },
    { key: ModalityCode.MAMMO, label: "Mammogram" },
  ];

  // Helper to trigger refetch when anchor or mode changes
  const handleFetch = (newAnchor: string, newMode: "rolling" | "static") => {
    setAnchorDate(newAnchor);
    setMode(newMode);
    startTransition(async () => {
      try {
        const result = await fetchSevenDayAnalyticsAction(newAnchor, newMode);
        setAnalytics(result);
      } catch (err) {
        console.error("Failed to fetch 7-day analytics:", err);
      }
    });
  };

  // Step anchor date by +/- 7 days safely in local time
  const stepAnchor = (days: number) => {
    const parts = anchorDate.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const newAnchorStr = `${y}-${m}-${day}`;
    handleFetch(newAnchorStr, mode);
  };

  // Reset to today
  const handleResetToday = () => {
    handleFetch(todayIso, mode);
  };

  const firstDay = currentData.dayRows[currentData.dayRows.length - 1]?.formattedDate ?? "";
  const lastDay = currentData.dayRows[0]?.formattedDate ?? "";

  const priorFirstDay =
    currentData.priorDayRows && currentData.priorDayRows.length > 0
      ? currentData.priorDayRows[currentData.priorDayRows.length - 1]?.formattedDate ?? ""
      : "";
  const priorLastDay =
    currentData.priorDayRows && currentData.priorDayRows.length > 0
      ? currentData.priorDayRows[0]?.formattedDate ?? ""
      : "";

  // Render a 7-day table given an array of DayRows
  const renderTable = (rows: DayRow[], isPrior: boolean = false) => {
    const totalVolume = rows.reduce((acc, r) => acc + r.totalExams, 0);
    const totalFinalized = rows.reduce((acc, r) => acc + r.finalizedCount, 0);
    const totalPending = rows.reduce((acc, r) => acc + r.pendingCount, 0);

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/90 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-3 py-2.5">Day / Date</th>
              <th className="px-2 py-2.5 text-center">Exams</th>
              <th className="px-2 py-2.5 text-center">Triage (OPD • IN • ER)</th>
              <th className="px-2 py-2.5 text-center">Finalized</th>
              <th className="px-2 py-2.5 text-center">Pending</th>
              <th className="px-3 py-2.5 text-right">Avg TAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
            {rows.map((row) => {
              const isToday = row.isoDate === todayIso;
              return (
                <tr
                  key={row.isoDate + row.dayLabel}
                  className={`hover:bg-slate-800/40 transition ${
                    isToday ? "bg-indigo-950/40 border-l-4 border-l-indigo-500" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-medium text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${isToday ? "text-indigo-200" : ""}`}>
                        {row.formattedDate}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                        {row.dayLabel}
                      </span>
                      {isToday && (
                        <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          TODAY
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-2 py-2.5 text-center font-bold text-white">
                    {row.totalExams}
                  </td>

                  <td className="px-2 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px]">
                      <span className="bg-sky-950/80 text-sky-300 border border-sky-800 px-1 py-0.5 rounded">
                        O:{row.opdCount}
                      </span>
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1 py-0.5 rounded">
                        I:{row.inCount}
                      </span>
                      <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-1 py-0.5 rounded">
                        E:{row.erCount}
                      </span>
                    </div>
                  </td>

                  <td className="px-2 py-2.5 text-center font-medium text-emerald-400 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {row.finalizedCount}
                    </span>
                  </td>

                  <td className="px-2 py-2.5 text-center font-medium whitespace-nowrap">
                    {row.pendingCount > 0 ? (
                      <span className="text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {row.pendingCount}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">0</span>
                    )}
                  </td>

                  <td
                    className={`px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap ${
                      isPrior ? "text-purple-300" : "text-indigo-300"
                    }`}
                  >
                    {row.avgTatMinutes > 0 ? (
                      <span>
                        {row.avgTatHours >= 1
                          ? `${row.avgTatHours}h`
                          : `${row.avgTatMinutes}m`}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-950 text-[11px] font-semibold border-t border-slate-800 text-slate-400">
            <tr>
              <td className="px-3 py-2 text-white">7-Day Total</td>
              <td className="px-2 py-2 text-center text-white font-bold">{totalVolume}</td>
              <td className="px-2 py-2 text-center text-[10px] text-slate-400">7 Days Sum</td>
              <td className="px-2 py-2 text-center text-emerald-400 font-bold">{totalFinalized}</td>
              <td className="px-2 py-2 text-center text-amber-400 font-bold">{totalPending}</td>
              <td
                className={`px-3 py-2 text-right font-mono font-bold ${
                  isPrior ? "text-purple-300" : "text-indigo-300"
                }`}
              >
                {isPrior
                  ? currentData.priorAvgTatHours >= 1
                    ? `${currentData.priorAvgTatHours}h`
                    : `${currentData.priorAvgTatMinutes}m`
                  : currentData.currentAvgTatHours >= 1
                  ? `${currentData.currentAvgTatHours}h`
                  : `${currentData.currentAvgTatMinutes}m`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Top Header: Title & Dual Mode Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              7-Day Turnaround Time (TAT) Performance Analysis
            </h2>
            {isPending && (
              <span className="text-[11px] text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded-full animate-pulse">
                Updating...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing {mode === "rolling" ? "rolling 7 days" : "static calendar week (Mon–Sun)"}:{" "}
            <span className="text-slate-200 font-semibold">{firstDay}</span> to{" "}
            <span className="text-slate-200 font-semibold">{lastDay}</span>
          </p>
        </div>

        {/* Mode Toggle & Calendar Selector Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => handleFetch(anchorDate, "rolling")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === "rolling"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔄 Rolling 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleFetch(anchorDate, "static")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                mode === "static"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📆 Static Week (Mon–Sun)
            </button>
          </div>

          {/* Calendar Anchor & Step Navigation */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => stepAnchor(-7)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition mr-1"
              title="Previous 7 Days"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={anchorDate}
              onChange={(e) => {
                if (e.target.value) handleFetch(e.target.value, mode);
              }}
              className="bg-transparent text-white text-xs font-mono focus:outline-none px-1 cursor-pointer"
            />

            <button
              type="button"
              onClick={() => stepAnchor(7)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition ml-1"
              title="Next 7 Days"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleResetToday}
              className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-800 transition ml-1"
              title="Reset to Today"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Layout View Switcher: Side-by-Side vs Single Table */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewLayout("sideBySide")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewLayout === "sideBySide"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Side-by-Side Comparison Layout"
            >
              <Columns2 className="h-3.5 w-3.5" />
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("single")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewLayout === "single"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Single Full-Width Table View"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Single Table
            </button>
          </div>
        </div>
      </div>

      {/* Modality Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400">
          Showing: <strong className="text-white">{tabs.find((t) => t.key === activeTab)?.label}</strong>
        </div>
      </div>

      {/* DUAL METRICS COMPARISON SUITE (Top Comparison Banner) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        {/* Left: Numerical Averages for Both Periods */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Selected 7-Day Window Avg TAT
              </span>
              <span className="text-white font-bold text-sm">
                {currentData.currentAvgTatHours >= 1
                  ? `${currentData.currentAvgTatHours} hrs`
                  : `${currentData.currentAvgTatMinutes} mins`}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                ({currentData.currentTotalVolume} exams • {currentData.currentAvgTatMinutes}m)
              </span>
            </div>
          </div>

          <div className="border-l border-slate-800 pl-6 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Prior 7-Day Window Avg TAT (Baseline)
              </span>
              <span className="text-slate-300 font-bold text-sm">
                {currentData.priorAvgTatHours >= 1
                  ? `${currentData.priorAvgTatHours} hrs`
                  : `${currentData.priorAvgTatMinutes} mins`}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                ({currentData.priorTotalVolume} exams • {currentData.priorAvgTatMinutes}m)
              </span>
            </div>
          </div>
        </div>

        {/* Right: Velocity Percentage Shift Badge */}
        <div>
          {currentData.currentFinalizedCount === 0 ? (
            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              No finalized exams in window
            </span>
          ) : currentData.priorFinalizedCount === 0 ? (
            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              No prior finalized baseline
            </span>
          ) : currentData.pctChange !== 0 ? (
            currentData.pctChange > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-950/60 border border-rose-800 px-3 py-1.5 rounded-xl shadow-sm">
                <TrendingUp className="h-4 w-4" />
                <span>{Math.abs(currentData.pctChange)}% longer TAT than prior week</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl shadow-sm">
                <TrendingDown className="h-4 w-4" />
                <span>{Math.abs(currentData.pctChange)}% faster TAT than prior week</span>
              </span>
            )
          ) : (
            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              Consistent with prior 7-day average
            </span>
          )}
        </div>
      </div>

      {/* SIDE-BY-SIDE COMPARISON LAYOUT */}
      {viewLayout === "sideBySide" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-in fade-in duration-200">
          {/* LEFT COLUMN: SELECTED 7-DAY WINDOW */}
          <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-2xl border border-indigo-900/40">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Selected 7-Day Window
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {firstDay} to {lastDay}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-indigo-300 font-mono">
                  {currentData.currentAvgTatHours >= 1
                    ? `${currentData.currentAvgTatHours} hrs`
                    : `${currentData.currentAvgTatMinutes} mins`}
                </span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  {currentData.currentTotalVolume} exams
                </span>
              </div>
            </div>
            {renderTable(currentData.dayRows, false)}
          </div>

          {/* RIGHT COLUMN: PRIOR 7-DAY BASELINE WINDOW */}
          <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-2xl border border-purple-900/40">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-400">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Prior 7-Day Baseline Window
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {priorFirstDay} to {priorLastDay}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-purple-300 font-mono">
                  {currentData.priorAvgTatHours >= 1
                    ? `${currentData.priorAvgTatHours} hrs`
                    : `${currentData.priorAvgTatMinutes} mins`}
                </span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  {currentData.priorTotalVolume} exams
                </span>
              </div>
            </div>
            {currentData.priorDayRows && currentData.priorDayRows.length > 0 ? (
              renderTable(currentData.priorDayRows, true)
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
                No prior week records recorded for this timeframe.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SINGLE TABLE FULL-WIDTH VIEW */
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              Selected 7-Day Window Detail ({firstDay} to {lastDay})
            </h3>
            <span className="text-xs text-slate-400">
              Total Volume: <strong className="text-white">{currentData.currentTotalVolume} exams</strong>
            </span>
          </div>
          {renderTable(currentData.dayRows, false)}
        </div>
      )}
    </div>
  );
}