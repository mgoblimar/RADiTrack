"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Filter,
  Calendar,
  Zap,
  RotateCcw,
  CalendarDays,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import {
  fetchModalityTatCustomRangeAction,
  type ModalityTatOverviewItem,
  type MultiPeriodModalityTatOverview,
  type ModalityTemporalPeriod,
} from "@/app/actions";

interface Props {
  data?: ModalityTatOverviewItem[] | MultiPeriodModalityTatOverview;
}

type ExtendedTemporalPeriod = ModalityTemporalPeriod | "CUSTOM";

export function TatOverviewChart({ data }: Props) {
  const [temporalPeriod, setTemporalPeriod] = useState<ExtendedTemporalPeriod>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<"ALL" | "EMERGENCY" | "ROUTINE">("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);

  // Local ISO string for today (YYYY-MM-DD)
  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const defaultStartIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 14);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Custom Calendar Date Range state
  const [customStartDate, setCustomStartDate] = useState(defaultStartIso);
  const [customEndDate, setCustomEndDate] = useState(todayIso);
  const [customDataset, setCustomDataset] = useState<ModalityTatOverviewItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper to fetch custom range
  const handleFetchCustomRange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setTemporalPeriod("CUSTOM");
    startTransition(async () => {
      try {
        const res = await fetchModalityTatCustomRangeAction(start, end);
        setCustomDataset(res);
      } catch (err) {
        console.error("Failed to fetch custom modality TAT range:", err);
      }
    });
  };

  // Resolve datasets across either custom range, multi-period structure, or raw array
  let activeDataset: ModalityTatOverviewItem[] = [];

  if (temporalPeriod === "CUSTOM" && customDataset) {
    activeDataset = customDataset;
  } else if (data) {
    if ("periods" in data && data.periods) {
      const key = temporalPeriod === "CUSTOM" ? "ALL" : temporalPeriod;
      activeDataset = data.periods[key] || data.periods.ALL || [];
    } else if (Array.isArray(data)) {
      activeDataset = data;
    }
  }

  // Compute live display data dynamically based on the active urgency filter
  const displayData = activeDataset.map((d) => {
    const stats =
      urgencyFilter === "EMERGENCY"
        ? d.emergency
        : urgencyFilter === "ROUTINE"
        ? d.routine
        : d.all;

    return {
      modality: d.modality,
      name: d.name,
      avgTat: stats.avgTat,
      target: stats.target,
      volume: stats.volume,
    };
  });

  // Calculate quick summary metrics for the active period
  const totalVolume = displayData.reduce((acc, curr) => acc + curr.volume, 0);
  const activeModalitiesWithScans = displayData.filter((d) => d.volume > 0);
  const breachedCount = activeModalitiesWithScans.filter((d) => d.avgTat > d.target).length;

  // Find fastest modality
  const fastest =
    activeModalitiesWithScans.length > 0
      ? [...activeModalitiesWithScans].sort((a, b) => a.avgTat - b.avgTat)[0]
      : null;

  // Human-readable labels
  const temporalLabels: Record<ExtendedTemporalPeriod, string> = {
    ALL: "All Time",
    "7D": "Past 7 Days",
    MONTH: "This Month",
    YEAR: "This Year",
    CUSTOM: "Custom Range",
  };

  const urgencyLabels: Record<"ALL" | "EMERGENCY" | "ROUTINE", string> = {
    ALL: "All Scans",
    EMERGENCY: "STAT / ER",
    ROUTINE: "Routine",
  };

  const isFiltered = temporalPeriod !== "ALL" || urgencyFilter !== "ALL";

  const handleResetFilters = () => {
    setTemporalPeriod("ALL");
    setUrgencyFilter("ALL");
  };

  return (
    <Card className="bg-slate-800/40 border-slate-700/80 text-slate-100 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-400" />
              Modality Turnaround Time (TAT) vs SLA Target
            </CardTitle>
            <Badge variant="outline" className="border-sky-500/40 text-sky-300 text-xs">
              Live Recharts
            </Badge>
            {isPending && (
              <span className="text-[11px] text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded-full animate-pulse">
                Filtering...
              </span>
            )}
          </div>
          <CardDescription className="text-xs text-slate-400 mt-1">
            Comparing average minutes from examination completion (T₁) to radiologist report sign-off (T₂).
          </CardDescription>
        </div>

        {/* Consolidated Single Filter Dropdown */}
        <div className="relative self-start sm:self-auto" ref={filterDropdownRef}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition shadow-sm ${
                isFilterOpen
                  ? "bg-sky-600 text-white border-sky-500 shadow-sky-950/40"
                  : isFiltered
                  ? "bg-sky-950/70 border-sky-800 text-sky-200 hover:bg-sky-900/60"
                  : "bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              aria-expanded={isFilterOpen}
            >
              <Filter className={`h-3.5 w-3.5 ${isFiltered ? "text-sky-400" : "text-slate-400"}`} />
              <span className="font-semibold">Filter Chart</span>
              <span className="text-slate-400 text-[11px]">
                ({temporalLabels[temporalPeriod]} • {urgencyLabels[urgencyFilter]})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                  isFilterOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset filters to All Time & All Scans"
                className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Floating Filter Popover */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 z-30 bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Filter className="h-3.5 w-3.5 text-sky-400" />
                  <span>Modality Chart Filters</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Section 1: Temporal Period */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-sky-400" />
                    Time Window
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["ALL", "7D", "MONTH", "YEAR"] as ExtendedTemporalPeriod[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setTemporalPeriod(period)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition flex items-center justify-between ${
                        temporalPeriod === period
                          ? "bg-indigo-600 text-white font-semibold"
                          : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <span>{temporalLabels[period]}</span>
                      {temporalPeriod === period && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>

                {/* Custom Range Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!customDataset) {
                      handleFetchCustomRange(customStartDate, customEndDate);
                    } else {
                      setTemporalPeriod("CUSTOM");
                    }
                  }}
                  className={`w-full mt-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition flex items-center justify-between ${
                    temporalPeriod === "CUSTOM"
                      ? "bg-sky-600 text-white font-semibold"
                      : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
                    Custom Calendar Range
                  </span>
                  {temporalPeriod === "CUSTOM" && <Check className="h-3 w-3" />}
                </button>

                {/* Custom Range Picker Inputs (when custom is active) */}
                {temporalPeriod === "CUSTOM" && (
                  <div className="p-2.5 bg-slate-950 border border-sky-900/60 rounded-xl space-y-2 mt-2 animate-in fade-in duration-100">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 text-[11px] w-10">From:</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          if (e.target.value && customEndDate) {
                            handleFetchCustomRange(e.target.value, customEndDate);
                          }
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 text-[11px] w-10">To:</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          if (customStartDate && e.target.value) {
                            handleFetchCustomRange(customStartDate, e.target.value);
                          }
                        }}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Clinical Urgency */}
              <div className="space-y-1.5 border-t border-slate-800 pt-3">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-sky-400" />
                  Clinical Urgency
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["ALL", "EMERGENCY", "ROUTINE"] as const).map((urgency) => (
                    <button
                      key={urgency}
                      type="button"
                      onClick={() => setUrgencyFilter(urgency)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium text-center transition ${
                        urgencyFilter === urgency
                          ? "bg-sky-500 text-slate-950 font-bold"
                          : "bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {urgencyLabels[urgency]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Period Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-slate-300 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">
              {temporalPeriod === "ALL"
                ? "All Recorded History"
                : temporalPeriod === "7D"
                ? "Past 7-Day Window"
                : temporalPeriod === "MONTH"
                ? "Current Calendar Month"
                : temporalPeriod === "YEAR"
                ? "Current Calendar Year"
                : `Custom Range (${customStartDate} to ${customEndDate})`}
              :
            </span>
            <span className="text-sky-300 font-bold">{totalVolume} finalized scans analyzed</span>
          </div>

          <div className="flex items-center gap-3">
            {fastest && (
              <span className="text-emerald-300 flex items-center gap-1 font-medium">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                Fastest: <strong className="text-white">{fastest.modality}</strong> ({fastest.avgTat}m)
              </span>
            )}
            <span className="text-slate-400">
              SLA Status:{" "}
              {breachedCount === 0 ? (
                <strong className="text-emerald-400">100% Compliant</strong>
              ) : (
                <strong className="text-rose-400">{breachedCount} Breaching</strong>
              )}
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-72 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="modality" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} unit="m" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(51, 65, 85, 0.3)" }}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
                formatter={(value: any, name: any, item: any) => {
                  const vol = item?.payload?.volume ?? 0;
                  const target = item?.payload?.target ?? 0;
                  if (vol === 0) {
                    return ["0 mins (No scans finalized in this period)", "Actual Avg TAT"];
                  }
                  return [
                    `${value} mins (${vol} scans • Target: ${target}m)`,
                    name === "avgTat" ? "Actual Avg TAT" : "SLA Target",
                  ];
                }}
                labelFormatter={(label) => `Modality: ${label}`}
              />
              <Bar dataKey="avgTat" radius={[6, 6, 0, 0]}>
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.volume === 0
                        ? "#475569"
                        : entry.avgTat > entry.target
                        ? "#f87171"
                        : "#38bdf8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Within SLA Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              SLA Breach Warning
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
              No Data in Period
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Window: <strong className="text-slate-300">{temporalLabels[temporalPeriod]}</strong> • Urgency:{" "}
            <strong className="text-slate-300">{urgencyLabels[urgencyFilter]}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}