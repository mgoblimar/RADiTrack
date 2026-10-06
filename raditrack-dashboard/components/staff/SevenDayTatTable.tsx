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
  Eye,
  EyeOff,
  Layers,
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
  const [showPriorWeek, setShowPriorWeek] = useState(false);
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

          {/* Date Picker & Navigation Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => stepAnchor(-7)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title={mode === "rolling" ? "Previous 7 Days" : "Previous Week"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={anchorDate}
              onChange={(e) => handleFetch(e.target.value, mode)}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer py-0.5"
            />

            <button
              type="button"
              onClick={() => stepAnchor(7)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title={mode === "rolling" ? "Next 7 Days" : "Next Week"}
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

        {/* Prior Week Visibility Toggle Button */}
        {currentData.priorDayRows && currentData.priorDayRows.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPriorWeek(!showPriorWeek)}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl transition"
          >
            {showPriorWeek ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                Hide Prior Week Table
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-sky-400" />
                Show Prior Week Workload ({currentData.priorTotalVolume} exams)
              </>
            )}
          </button>
        )}
      </div>

      {/* DUAL METRICS COMPARISON SUITE (Beyond Percentage) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        {/* Left: Actual Numerical Averages */}
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
                Prior 7-Day Window Avg TAT
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

      {/* 7-Day Performance Table (Current Selected Window) */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Day / Date</th>
              <th className="px-4 py-3 text-center">Total Exams</th>
              <th className="px-4 py-3 text-center">Triage Breakdown (OPD • IN • ER)</th>
              <th className="px-4 py-3 text-center">Finalized</th>
              <th className="px-4 py-3 text-center">Pending Backlog</th>
              <th className="px-4 py-3 text-right">Average TAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
            {currentData.dayRows.map((row) => {
              const isToday = row.isoDate === todayIso;
              return (
                <tr
                  key={row.isoDate + row.dayLabel}
                  className={`hover:bg-slate-800/40 transition ${
                    isToday ? "bg-indigo-950/40 border-l-4 border-l-indigo-500" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isToday ? "text-indigo-200" : ""}`}>
                        {row.formattedDate}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {row.dayLabel}
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          TODAY
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center font-bold text-white">
                    {row.totalExams}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs">
                      <span className="bg-sky-950/80 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded text-[11px]">
                        OPD: {row.opdCount}
                      </span>
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[11px]">
                        IN: {row.inCount}
                      </span>
                      <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[11px]">
                        ER: {row.erCount}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center font-medium text-emerald-400">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {row.finalizedCount}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center font-medium">
                    {row.pendingCount > 0 ? (
                      <span className="text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {row.pendingCount} pending
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">0</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-300">
                    {row.avgTatMinutes > 0 ? (
                      <span>
                        {row.avgTatHours >= 1 ? `${row.avgTatHours} hrs` : `${row.avgTatMinutes} mins`}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* OPTIONAL PRIOR WEEK BREAKDOWN TABLE (When Toggled On) */}
      {showPriorWeek && currentData.priorDayRows && (
        <div className="space-y-3 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              Prior 7-Day Workload Detail (Historical Baseline)
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              Total: {currentData.priorTotalVolume} exams recorded
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Prior Day / Date</th>
                  <th className="px-4 py-3 text-center">Total Exams</th>
                  <th className="px-4 py-3 text-center">Triage Breakdown (OPD • IN • ER)</th>
                  <th className="px-4 py-3 text-center">Finalized</th>
                  <th className="px-4 py-3 text-center">Pending Backlog</th>
                  <th className="px-4 py-3 text-right">Average TAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                {currentData.priorDayRows.map((row) => {
                  const isToday = row.isoDate === todayIso;
                  return (
                    <tr
                      key={row.isoDate + row.dayLabel}
                      className={`hover:bg-slate-800/40 transition ${
                        isToday ? "bg-indigo-950/40 border-l-4 border-l-indigo-500" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isToday ? "text-indigo-200" : ""}`}>
                            {row.formattedDate}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {row.dayLabel}
                          </span>
                          {isToday && (
                            <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              TODAY
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-white">
                        {row.totalExams}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs">
                          <span className="bg-sky-950/80 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded text-[11px]">
                            OPD: {row.opdCount}
                          </span>
                          <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[11px]">
                            IN: {row.inCount}
                          </span>
                          <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[11px]">
                            ER: {row.erCount}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-medium text-emerald-400">
                        <span className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {row.finalizedCount}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center font-medium">
                        {row.pendingCount > 0 ? (
                          <span className="text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full text-xs font-semibold">
                            {row.pendingCount} pending
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">0</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-purple-300">
                        {row.avgTatMinutes > 0 ? (
                          <span>
                            {row.avgTatHours >= 1 ? `${row.avgTatHours} hrs` : `${row.avgTatMinutes} mins`}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}