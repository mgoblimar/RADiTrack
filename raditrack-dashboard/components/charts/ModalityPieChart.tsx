"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

import {
  CheckCircle2,
  Wrench
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

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, value}: any) => {if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 0.65;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle *RADIAN);

  return (
    <text 
    x = {x}
    y = {y}
    fill="ffffff"
    textAnchor="middle"
    dominantBaseline="central"
    className="text-sm font-blck drop-shadow-[0_1px,2px_rgba(0,0,0,0.8)">
      {value}
    </text>
  );
};

export default function ModalityPieChart({
  modalities,
}: {
  modalities: ModalityItem[];
}) {
  const chartData = modalities.map(
    (modality) => ({
      name:
        modality.modalityCode ||
        modality.modalityName,
      fullName: modality.modalityName,
      value: modality.today.total,
      room: modality.departmentRoom,
      isActive: modality.isActive !== false,
    }),
  );

  const totalExams =
    chartData.reduce(
      (sum, item) =>
        sum + item.value,
      0,
    );

  const maintenanceRooms = chartData.filter((item) => item.isActive === false);
  const allRoomsWorking = maintenanceRooms.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">

      {/* =====================================================
          DONUT
      ===================================================== */}

      <div className="flex h-[178px] shrink-0 items-center justify-center">

        <div className="relative h-full w-full max-w-[285px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>

              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="0"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                label={renderCustomizedLabel}
                labelLine={false}
                stroke="#FFFFFF"
                strokeWidth={5}
                isAnimationActive={false}
              >
                {chartData.map(
                  (_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          index %
                            COLORS.length
                        ]
                      }
                    />
                  ),
                )}
              </Pie>

            </PieChart>
          </ResponsiveContainer>

          {/* =================================================
              DONUT CENTER
          ================================================= */}

          {/*<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">

            <span className="text-[44px] font-extrabold leading-none tracking-tight text-qc-navy">
              {totalExams.toLocaleString()}
            </span>

            <span className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
              Today
            </span>

          </div>*/}

        </div>
      </div>

      {/* Modality Room Operational Status */}
      <div className="mt-4 border-t border-slate-800/80 pt-4">
        {allRoomsWorking ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>All examination rooms are working</span>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-400">
            <Wrench className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">Maintenance Alert:</span>{" "}
              {maintenanceRooms.map((r) => `(${r.room})`).join(", ")}{" "}
              {maintenanceRooms.length === 1 ? "is" : "are"} currently under maintenance.
            </div>
          </div>
        )}
      </div>



      {/* =====================================================
          MODALITY BREAKDOWN
          Two-column fixed public-display layout
      ===================================================== 

      <div className="min-h-0 flex-1 overflow-hidden pt-1">

        <div className="grid h-full grid-cols-2 content-start gap-2">

          {chartData.map(
            (item, index) => {
              const percentage =
                totalExams > 0
                  ? Math.round(
                      (item.value /
                        totalExams) *
                        100,
                    )
                  : 0;

              const color =
                COLORS[
                  index %
                    COLORS.length
                ];

              return (
                <div
                  key={item.name}
                  className="flex h-[46px] min-w-0 items-center justify-between rounded-xl border border-slate-200/70 bg-[#FAFBFD] px-3.5"
                >

                  {/* =================================================
                      MODALITY LABEL
                  ================================================= */}

                  {/*<div className="flex min-w-0 items-center gap-2">

                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          color,
                      }}
                    />

                    <span className="truncate text-[11px] font-extrabold text-qc-navy">
                      {item.name}
                    </span>

                  </div>*/}

                  {/* =================================================
                      VALUE + %
                  ================================================= */}

                  {/*<div className="ml-2 flex shrink-0 items-center gap-2.5">

                    <span
                      className="text-[14px] font-extrabold leading-none"
                      style={{
                        color,
                      }}
                    >
                      {item.value}
                    </span>

                    <span className="min-w-[28px] text-right text-[9px] font-bold leading-none text-slate-400">
                      {percentage}%
                    </span>

                  </div>*

                </div>
              );
            },
          )}

        </div>
      </div>*/}

    </div>
  );
}