"use client";

import { useState, useTransition, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Filter,
  Calendar,
  Zap,
  RotateCcw,
  CalendarDays,
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

  return (
    <Card className="bg-slate-800/40 border-slate-700/80 text-slate-100 shadow-md">
      <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-4 gap-4">
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

        {/* Dual Control Toggles: Temporal Window & Urgency */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Temporal Period Selector */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/70">
            <Calendar className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
            <Button
              size="xs"
              variant={temporalPeriod === "ALL" ? "default" : "ghost"}
              onClick={() => setTemporalPeriod("ALL")}
              className={
                temporalPeriod === "ALL"
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              All Time
            </Button>
            <Button
              size="xs"
              variant={temporalPeriod === "7D" ? "default" : "ghost"}
              onClick={() => setTemporalPeriod("7D")}
              className={
                temporalPeriod === "7D"
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              Past 7 Days
            </Button>
            <Button
              size="xs"
              variant={temporalPeriod === "MONTH" ? "default" : "ghost"}
              onClick={() => setTemporalPeriod("MONTH")}
              className={
                temporalPeriod === "MONTH"
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              This Month
            </Button>
            <Button
              size="xs"
              variant={temporalPeriod === "YEAR" ? "default" : "ghost"}
              onClick={() => setTemporalPeriod("YEAR")}
              className={
                temporalPeriod === "YEAR"
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              This Year
            </Button>
            <Button
              size="xs"
              variant={temporalPeriod === "CUSTOM" ? "default" : "ghost"}
              onClick={() => {
                if (!customDataset) {
                  handleFetchCustomRange(customStartDate, customEndDate);
                } else {
                  setTemporalPeriod("CUSTOM");
                }
              }}
              className={
                temporalPeriod === "CUSTOM"
                  ? "bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1 text-sky-300" />
              Custom Range
            </Button>
          </div>

          {/* Clinical Urgency Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/70">
            <Filter className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
            <Button
              size="xs"
              variant={urgencyFilter === "ALL" ? "default" : "ghost"}
              onClick={() => setUrgencyFilter("ALL")}
              className={
                urgencyFilter === "ALL"
                  ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              All Scans
            </Button>
            <Button
              size="xs"
              variant={urgencyFilter === "EMERGENCY" ? "default" : "ghost"}
              onClick={() => setUrgencyFilter("EMERGENCY")}
              className={
                urgencyFilter === "EMERGENCY"
                  ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              STAT / ER
            </Button>
            <Button
              size="xs"
              variant={urgencyFilter === "ROUTINE" ? "default" : "ghost"}
              onClick={() => setUrgencyFilter("ROUTINE")}
              className={
                urgencyFilter === "ROUTINE"
                  ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs"
                  : "text-slate-400 hover:text-white text-xs"
              }
            >
              Routine
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Custom Calendar Date Range Picker Toolbar (Appears when Custom Range is active) */}
        {temporalPeriod === "CUSTOM" && (
          <div className="bg-slate-950/80 border border-sky-900/50 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Custom Calendar Range:
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                <span className="text-slate-500 text-[11px]">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    if (e.target.value && customEndDate) {
                      handleFetchCustomRange(e.target.value, customEndDate);
                    }
                  }}
                  className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                />
              </div>

              <span className="text-slate-500">to</span>

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                <span className="text-slate-500 text-[11px]">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    if (customStartDate && e.target.value) {
                      handleFetchCustomRange(customStartDate, e.target.value);
                    }
                  }}
                  className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  const now = new Date();
                  now.setDate(now.getDate() - 30);
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, "0");
                  const d = String(now.getDate()).padStart(2, "0");
                  handleFetchCustomRange(`${y}-${m}-${d}`, todayIso);
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Last 30 Days
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleFetchCustomRange(customStartDate, customEndDate)}
                disabled={isPending}
                className="text-xs bg-slate-900 border-slate-700 text-sky-300 hover:bg-slate-800"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Refresh Range
              </Button>
            </div>
          </div>
        )}

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
            Window: <strong className="text-slate-300">{temporalPeriod}</strong> • Urgency:{" "}
            <strong className="text-slate-300">{urgencyFilter}</strong>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}