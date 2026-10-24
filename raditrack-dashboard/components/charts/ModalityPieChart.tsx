"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import {
  CheckCircle2,
  FileQuestion,
  Wrench,
} from "lucide-react";

interface ModalityItem {
  modalityCode: string;
  modalityName: string;
  departmentRoom?: string;
  isActive?: boolean;
  today: {
    total: number;
  };
}

const COLORS = [
  "#18298C",
  "#F2CB49",
  "#A60808",
  "#5267C7",
  "#050E40",
];

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, value }: any) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  // Adjusted label placement for larger outerRadius
  const radius = outerRadius * 0.7;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-base font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
    >
      {value}
    </text>
  );
};

export default function ModalityPieChart({
  modalities,
}: {
  modalities: ModalityItem[];
}) {
  const chartData = modalities.map((modality) => ({
    name: modality.modalityCode || modality.modalityName,
    fullName: modality.modalityName,
    value: modality.today.total,
    room: modality.departmentRoom,
    isActive: modality.isActive !== false,
  }));

  const totalExams = chartData.reduce((sum, item) => sum + item.value, 0);
  const activeSlicesCount = chartData.filter((item) => item.value > 0).length;

  const maintenanceRooms = chartData.filter((item) => item.isActive === false);
  const allRoomsWorking = maintenanceRooms.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden">
      {/* =====================================================
          ENLARGED PIE CHART CANVAS (Fills flex-1 space)
      ===================================================== */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
        {totalExams === 0 ? (
          /* ZERO EXAMS FALLBACK STATE */
          <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileQuestion className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-extrabold text-qc-navy">
              No Examinations Today
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Data will update as examinations are scheduled.
            </p>
          </div>
        ) : (
          /* RECHARTS PIE CHART WITH EXPANDED RADIUS */
          <div className="h-full w-full max-w-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="0"
                  outerRadius="95%" // Increased radius to enlarge the chart
                  paddingAngle={activeSlicesCount > 1 ? 1 : 0}
                  stroke="#FFFFFF"
                  strokeWidth={activeSlicesCount > 1 ? 1 : 0}
                  dataKey="value"
                  label={renderCustomizedLabel}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* =====================================================
          FIXED STATUS BAR AT BOTTOM
      ===================================================== */}
      <div className="mt-2 shrink-0 border-t border-slate-200/80 pt-3">
        {allRoomsWorking ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>All examination rooms are working</span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800 shadow-sm">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Maintenance Alert:</span>{" "}
              {maintenanceRooms.map((r) => `(${r.room})`).join(", ")}{" "}
              {maintenanceRooms.length === 1 ? "is" : "are"} currently under
              maintenance.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}