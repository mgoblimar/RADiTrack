"use client";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface MonthData {
  monthLabel: string;
  fullMonth: string;
  totalFinalized: number;
  avgTatHours: number;
  avgTatMinutes: number;
}

interface Props {
  data: MonthData[];
}

export function TwelveMonthTrendChart({ data }: Props) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            12-Month Historical Turnaround Time Trend
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Annual monthly average TAT (Hours) for departmental reviews and seasonal workload tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <Calendar className="h-4 w-4 text-indigo-400" />
          <span>Annual Cadence (12 Months)</span>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="fullMonth" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} unit="h" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "10px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              formatter={(value: any) => [`${value} hrs`, "Average TAT"]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="avgTatHours"
              stroke="#38bdf8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#tatGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}