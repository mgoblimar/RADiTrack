"use client";

import { useState, useTransition } from "react";
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            Multi-Year & 12-Month Historical TAT Trend
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Annual monthly average turnaround time, seasonal workload velocity, and year-over-year comparisons.
          </p>
        </div>

        {/* Period Selector Tabs & Compare Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Year / Period Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleSelectPeriod("rolling")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedPeriod === "rolling"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔄 Past 12M
            </button>

            {data.availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => handleSelectPeriod(String(yr))}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
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

          <div className="border-l border-slate-800 pl-6 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                {data.priorPeriodLabel} Baseline
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
        </div>

        {/* Right: YoY Velocity & Volume Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {data.pctChangeTat !== 0 ? (
            data.pctChangeTat > 0 ? (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold bg-rose-950/60 border border-rose-800 px-3 py-1.5 rounded-xl shadow-sm">
                <TrendingUp className="h-4 w-4" />
                <span>{Math.abs(data.pctChangeTat)}% longer TAT vs prior year</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl shadow-sm">
                <TrendingDown className="h-4 w-4" />
                <span>{Math.abs(data.pctChangeTat)}% faster TAT vs prior year</span>
              </span>
            )
          ) : (
            <span className="text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              Consistent with prior baseline
            </span>
          )}

          {data.fastestMonth && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sky-300 bg-sky-950/60 border border-sky-800/80 px-2.5 py-1.5 rounded-xl">
              <Zap className="h-3.5 w-3.5 text-sky-400" />
              <span>Fastest: {data.fastestMonth.monthLabel} ({data.fastestMonth.avgTatHours}h)</span>
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className={`h-72 w-full pt-1 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.months} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="fullMonth" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} unit="h" tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />

            {/* Selected Period Area */}
            <Area
              type="monotone"
              dataKey="avgTatHours"
              name={data.selectedPeriodLabel}
              stroke="#38bdf8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#tatGradient)"
              activeDot={{ r: 5, fill: "#38bdf8", stroke: "#0284c7" }}
            />

            {/* Prior Year Baseline Overlay Line (When Toggled) */}
            {comparePriorYear && (
              <Line
                type="monotone"
                dataKey="priorYearAvgTatHours"
                name={data.priorPeriodLabel}
                stroke="#c084fc"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: "#c084fc" }}
                activeDot={{ r: 5, fill: "#c084fc", stroke: "#7e22ce" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-6 rounded bg-sky-400 inline-block" />
            <span className="text-white font-medium">{data.selectedPeriodLabel} (Monthly Avg TAT)</span>
          </div>

          {comparePriorYear && (
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-6 border-b-2 border-dashed border-purple-400 inline-block" />
              <span className="text-purple-300 font-medium">{data.priorPeriodLabel} (Historical Baseline)</span>
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-400">
          Showing 12 monthly cohorts ({data.annualTotalFinalized} exams analyzed)
        </span>
      </div>

      {/* Glanceable 12-Month Snapshot Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 pt-2">
        {data.months.map((m) => (
          <div
            key={m.monthIndex + m.fullMonth}
            className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2 text-center hover:border-slate-700 transition"
          >
            <span className="text-[11px] text-slate-400 block font-semibold">{m.monthLabel}</span>
            <span className="text-xs font-bold text-sky-300 font-mono mt-0.5 block">
              {m.avgTatHours > 0 ? `${m.avgTatHours}h` : "—"}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {m.totalFinalized} {m.totalFinalized === 1 ? "exam" : "exams"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}