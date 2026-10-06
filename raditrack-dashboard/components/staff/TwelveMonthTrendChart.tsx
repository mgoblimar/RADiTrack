"use client";

import { useState, useTransition, useMemo } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Clock,
  Zap,
  BarChart2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { fetchYearlyTrendAction, TwelveMonthTrendResult } from "@/app/actions";

interface Props {
  data: TwelveMonthTrendResult;
}

export function TwelveMonthTrendChart({ data: initialData }: Props) {
  const [data, setData] = useState<TwelveMonthTrendResult>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialData.selectedPeriod || "rolling");
  const [comparePriorYear, setComparePriorYear] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  const handleSelectPeriod = (period: string) => {
    setSelectedPeriod(period);
    startTransition(async () => {
      try {
        const result = await fetchYearlyTrendAction(period);
        setData(result);
      } catch (err) {
        console.error("Failed to fetch yearly trend:", err);
      }
    });
  };

  // Step year backwards or forwards
  const currentTargetYear = useMemo(() => {
    if (selectedPeriod === "rolling") return new Date().getFullYear();
    const parsed = parseInt(selectedPeriod, 10);
    return isNaN(parsed) ? new Date().getFullYear() : parsed;
  }, [selectedPeriod]);

  const handleStepYear = (step: number) => {
    const target = currentTargetYear + step;
    handleSelectPeriod(String(target));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const curItem = payload.find((p: any) => p.dataKey === "avgTatHours");
      const priItem = payload.find((p: any) => p.dataKey === "priorYearAvgTatHours");
      const dataPoint = curItem?.payload;

      return (
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-[220px]">
          <div className="font-bold text-white border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
            <span>{dataPoint?.fullMonth || label}</span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              {dataPoint?.monthLabel}
            </span>
          </div>

          <div className="space-y-1.5">
            {curItem && (
              <div className="flex items-center justify-between">
                <span className="text-sky-400 flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {data.selectedPeriodLabel}:
                </span>
                <span className="font-mono font-bold text-white">
                  {curItem.value}h{" "}
                  <span className="text-slate-400 font-normal">
                    ({dataPoint?.totalFinalized ?? 0} scans)
                  </span>
                </span>
              </div>
            )}

            {comparePriorYear && priItem && priItem.value > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-purple-400 flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  {data.priorPeriodLabel}:
                </span>
                <span className="font-mono font-bold text-slate-300">
                  {priItem.value}h{" "}
                  <span className="text-slate-400 font-normal">
                    ({dataPoint?.priorYearTotalFinalized ?? 0} scans)
                  </span>
                </span>
              </div>
            )}

            {comparePriorYear && priItem && curItem && priItem.value > 0 && curItem.value > 0 && (
              <div className="border-t border-slate-800/80 pt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">YoY Variance:</span>
                <span
                  className={`font-semibold ${
                    curItem.value < priItem.value
                      ? "text-emerald-400"
                      : curItem.value > priItem.value
                      ? "text-rose-400"
                      : "text-slate-400"
                  }`}
                >
                  {curItem.value < priItem.value
                    ? `-${Math.abs(
                        Number((((priItem.value - curItem.value) / priItem.value) * 100).toFixed(1))
                      )}% faster`
                    : `+${Math.abs(
                        Number((((curItem.value - priItem.value) / priItem.value) * 100).toFixed(1))
                      )}% longer`}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
      {/* Header Bar with Period Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-sky-400" />
              Multi-Year & 12-Month Historical TAT Trend
            </h2>
            {isPending && (
              <span className="text-[11px] text-sky-400 bg-sky-950/60 border border-sky-800 px-2 py-0.5 rounded-full animate-pulse">
                Updating Year...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzing {data.selectedPeriodLabel} • Compared against {data.priorPeriodLabel}.
          </p>
        </div>

        {/* Year Calendar Picker Toolbar & Compare Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Quick Rolling 12M Button */}
          <button
            type="button"
            onClick={() => handleSelectPeriod("rolling")}
            className={`px-3 py-1.5 rounded-xl font-semibold border transition ${
              selectedPeriod === "rolling"
                ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🔄 Past 12M (Rolling)
          </button>

          {/* Dedicated Calendar Year Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 gap-1">
            <CalendarDays className="h-3.5 w-3.5 text-sky-400 mr-1" />
            <button
              type="button"
              onClick={() => handleStepYear(-1)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Previous Year"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <select
              value={selectedPeriod === "rolling" ? String(new Date().getFullYear()) : selectedPeriod}
              onChange={(e) => handleSelectPeriod(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer px-1 py-0.5"
            >
              {data.availableYears.map((yr) => (
                <option key={yr} value={String(yr)} className="bg-slate-950 text-white">
                  📅 Year {yr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleStepYear(1)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
              title="Next Year"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Year Pill Shortcuts for Most Recent Years */}
          <div className="hidden sm:flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {data.availableYears.slice(0, 3).map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => handleSelectPeriod(String(yr))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedPeriod === String(yr)
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Toggle Prior Year Comparison Overlay */}
          <button
            type="button"
            onClick={() => setComparePriorYear(!comparePriorYear)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
              comparePriorYear
                ? "bg-purple-950/80 border-purple-800 text-purple-200"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle previous year overlay line"
          >
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span>Compare Prior Year</span>
          </button>
        </div>
      </div>

      {/* DUAL ANNUAL COMPARISON SUITE (Top Summary Banner) */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        {/* Left: Numerical Annual Averages */}
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                {data.selectedPeriodLabel} Avg TAT
              </span>
              <span className="text-white font-bold text-sm">
                {data.annualAvgTatHours >= 1
                  ? `${data.annualAvgTatHours} hrs`
                  : `${data.annualAvgTatMinutes} mins`}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                ({data.annualTotalFinalized} finalized • {data.annualAvgTatMinutes}m)
              </span>
            </div>
          </div>

          {comparePriorYear && (
            <div className="border-l border-slate-800 pl-6 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  {data.priorPeriodLabel} Avg TAT (Baseline)
                </span>
                <span className="text-slate-300 font-bold text-sm">
                  {data.priorAnnualAvgTatHours >= 1
                    ? `${data.priorAnnualAvgTatHours} hrs`
                    : `${data.priorAnnualAvgTatMinutes} mins`}
                </span>
                <span className="text-[11px] text-slate-400 ml-1.5 font-normal">
                  ({data.priorAnnualTotalFinalized} finalized • {data.priorAnnualAvgTatMinutes}m)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: YoY Velocity Shift & Volume Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {comparePriorYear && data.priorAnnualTotalFinalized > 0 && (
            <>
              {data.pctChangeTat !== 0 && (
                <div
                  className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl border text-xs shadow-sm ${
                    data.pctChangeTat < 0
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                      : "bg-rose-950/60 border-rose-800 text-rose-400"
                  }`}
                >
                  {data.pctChangeTat < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <TrendingUp className="h-4 w-4" />
                  )}
                  <span>
                    {Math.abs(data.pctChangeTat)}%{" "}
                    {data.pctChangeTat < 0 ? "faster TAT velocity" : "longer TAT latency"} vs prior period
                  </span>
                </div>
              )}

              {data.pctChangeVolume !== 0 && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs">
                  <BarChart2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>
                    {data.pctChangeVolume > 0 ? `+${data.pctChangeVolume}%` : `${data.pctChangeVolume}%`} volume change
                  </span>
                </div>
              )}
            </>
          )}

          {data.fastestMonth && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl text-xs">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>
                Fastest: <strong className="text-white">{data.fastestMonth.monthLabel}</strong> (
                {data.fastestMonth.avgTatHours}h)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recharts Multi-Year Area & Baseline Line Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} unit="h" tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />

            {/* Selected Period Filled Area */}
            <Area
              type="monotone"
              dataKey="avgTatHours"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#tatGradient)"
              name={data.selectedPeriodLabel}
            />

            {/* Prior Year Baseline Comparison Line (Overlay) */}
            {comparePriorYear && (
              <Line
                type="monotone"
                dataKey="priorYearAvgTatHours"
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#c084fc" }}
                name={data.priorPeriodLabel}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Telemetry Indicators */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span className="text-slate-300 font-medium">{data.selectedPeriodLabel}</span>
          </span>
          {comparePriorYear && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 border-t-2 border-dashed border-purple-400" />
              <span className="text-purple-300 font-medium">{data.priorPeriodLabel} (YoY Baseline)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          {data.peakVolumeMonth && (
            <span>
              Peak Ingestion: <strong className="text-slate-300">{data.peakVolumeMonth.monthLabel}</strong> (
              {data.peakVolumeMonth.volume} scans)
            </span>
          )}
          <span>
            Annual Total: <strong className="text-slate-300">{data.annualTotalFinalized} finalized</strong>
          </span>
        </div>
      </div>
    </div>
  );
}