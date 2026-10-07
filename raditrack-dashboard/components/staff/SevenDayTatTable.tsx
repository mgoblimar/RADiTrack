"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
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
  ChevronDown,
  X,
  Check,
  Settings2,
  Filter,
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
  const [viewLayout, setViewLayout] = useState<"sideBySide" | "single">("sideBySide");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const optionsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target as Node)) {
        setIsOptionsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOptionsOpen(false);
      }
    }
    if (isOptionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOptionsOpen]);

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

  const currentTabLabel = tabs.find((t) => t.key === activeTab)?.label || "All Modalities";

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
                    isToday ? "bg-indigo-950/30 font-medium" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white">{row.dayLabel}</span>
                      <span className="text-[11px] text-slate-400">({row.formattedDate})</span>
                      {isToday && (
                        <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] px-1.5 py-0.2 rounded font-semibold">
                          Today
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-white">
                    {row.totalExams}
                  </td>
                  <td className="px-2 py-2.5 text-center whitespace-nowrap text-[11px] text-slate-400">
                    <span className="text-sky-400 font-medium">{row.opdCount}</span>
                    <span className="mx-1 text-slate-600">•</span>
                    <span className="text-indigo-400 font-medium">{row.inCount}</span>
                    <span className="mx-1 text-slate-600">•</span>
                    <span className="text-amber-400 font-medium">{row.erCount}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className="text-emerald-400 font-semibold">{row.finalizedCount}</span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span className={row.pendingCount > 0 ? "text-amber-400 font-semibold" : "text-slate-500"}>
                      {row.pendingCount}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium">
                    {row.finalizedCount === 0 ? (
                      <span className="text-slate-500 text-[11px]">No data</span>
                    ) : (
                      <span
                        className={
                          row.avgTatMinutes > 120
                            ? "text-rose-400 font-bold"
                            : isPrior
                            ? "text-purple-300"
                            : "text-indigo-300 font-semibold"
                        }
                      >
                        {row.avgTatHours >= 1 ? `${row.avgTatHours}h` : `${row.avgTatMinutes}m`}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-950/80 font-semibold text-slate-300 border-t border-slate-800">
            <tr>
              <td className="px-3 py-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-400">
                  {isPrior ? "Prior 7D Totals" : "Active 7D Totals"}
                </span>
              </td>
              <td className="px-2 py-2 text-center text-white font-bold">{totalVolume}</td>
              <td className="px-2 py-2 text-center text-[10px] text-slate-500">Totals</td>
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
      {/* Top Header: Title & Consolidated Options Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
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

        {/* Consolidated Single Table Options Dropdown */}
        <div className="relative self-start sm:self-auto" ref={optionsDropdownRef}>
          <button
            type="button"
            onClick={() => setIsOptionsOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition shadow-sm ${
              isOptionsOpen
                ? "bg-sky-600 text-white border-sky-500 shadow-sky-950/40"
                : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            aria-expanded={isOptionsOpen}
          >
            <Settings2 className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-semibold">Table Options</span>
            <span className="text-slate-400 text-[11px]">
              ({currentTabLabel} • {viewLayout === "sideBySide" ? "Side-by-Side" : "Single"})
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                isOptionsOpen ? "rotate-180 text-white" : ""
              }`}
            />
          </button>

          {/* Floating Table Options Popover */}
          {isOptionsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-30 bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Filter className="h-3.5 w-3.5 text-sky-400" />
                  <span>7-Day Table Configuration</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOptionsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Section 1: Modality Selection */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Modality Focus
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition flex items-center justify-between ${
                        activeTab === tab.key
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      {activeTab === tab.key && <Check className="h-3 w-3 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Mode & Date Anchor */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Time Window & Date Anchor
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFetch(anchorDate, "rolling")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition ${
                      mode === "rolling"
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    🔄 Rolling 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFetch(anchorDate, "static")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition ${
                      mode === "static"
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    📆 Mon–Sun Week
                  </button>
                </div>

                {/* Date Stepper */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Anchor:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => stepAnchor(-7)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                      title="Previous 7 Days"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="date"
                      value={anchorDate}
                      onChange={(e) => {
                        if (e.target.value) handleFetch(e.target.value, mode);
                      }}
                      className="bg-transparent text-white text-xs font-mono focus:outline-none px-1 cursor-pointer [color-scheme:dark]"
                    />
                    <button
                      type="button"
                      onClick={() => stepAnchor(7)}
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                      title="Next 7 Days"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToday}
                      className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-800 transition ml-1"
                      title="Reset to Today"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Layout Switcher */}
              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Layout Presentation
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewLayout("sideBySide")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      viewLayout === "sideBySide"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout("single")}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      viewLayout === "single"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Single Table
                  </button>
                </div>
              </div>
            </div>
          )}
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

        {/* Right: Comparative Delta Badge */}
        <div className="flex items-center gap-3">
          {currentData.pctChange !== 0 && (
            <div
              className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl border text-xs shadow-sm ${
                currentData.pctChange < 0
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                  : "bg-rose-950/60 border-rose-800 text-rose-400"
              }`}
            >
              {currentData.pctChange < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span>
                {Math.abs(currentData.pctChange)}%{" "}
                {currentData.pctChange < 0 ? "faster TAT velocity" : "longer TAT latency"} vs prior
                period
              </span>
            </div>
          )}

          <div className="text-slate-400">
            Modality: <strong className="text-white">{currentTabLabel}</strong>
          </div>
        </div>
      </div>

      {/* Main Table Body: Side-by-Side Comparison vs Single Table View */}
      {viewLayout === "sideBySide" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Column A: Active 7-Day Period */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-indigo-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Active 7 Days ({firstDay} – {lastDay})
              </span>
              <span className="text-slate-400">
                Total Exams: <strong className="text-white">{currentData.currentTotalVolume}</strong>
              </span>
            </div>
            {renderTable(currentData.dayRows, false)}
          </div>

          {/* Column B: Preceding 7-Day Period (Baseline) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-purple-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                Prior 7-Day Baseline ({priorFirstDay} – {priorLastDay})
              </span>
              <span className="text-slate-400">
                Total Exams: <strong className="text-white">{currentData.priorTotalVolume}</strong>
              </span>
            </div>
            {currentData.priorDayRows && currentData.priorDayRows.length > 0 ? (
              renderTable(currentData.priorDayRows, true)
            ) : (
              <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                No baseline data available for preceding 7-day period.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-indigo-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              Active 7 Days ({firstDay} – {lastDay})
            </span>
            <span className="text-slate-400">
              Total Exams: <strong className="text-white">{currentData.currentTotalVolume}</strong>
            </span>
          </div>
          {renderTable(currentData.dayRows, false)}
        </div>
      )}
    </div>
  );
}