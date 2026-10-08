"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ModalityItem {
  modalityCode: string;
  modalityName: string;
  today: { total: number };
}

// Color palette matching your dark theme
const COLORS = ["#0284c7", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"];

export default function ModalityPieChart({ modalities }: { modalities: ModalityItem[] }) {
  const chartData = modalities.map((m) => ({
    name: m.modalityCode || m.modalityName,
    value: m.today.total,
  }));

  const totalExams = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Recent Examinations
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Distribution across modalities today
        </p>
      </div>

      {/* Donut Chart */}
      <div className="h-48 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                borderColor: "#334155",
                borderRadius: "8px",
                color: "#f8fafc",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-black text-white">{totalExams}</span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
        </div>
      </div>

      {/* Progress Bars / Legend Breakdown */}
      <div className="space-y-3 my-4">
        {chartData.map((item, index) => {
          const percentage = totalExams > 0 ? Math.round((item.value / totalExams) * 100) : 0;
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span style={{ color: COLORS[index % COLORS.length] }}>
                  {item.name}
                </span>
                <span className="text-slate-400">{item.value} ({percentage}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}