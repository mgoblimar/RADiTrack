"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface ModalityItem {
  modalityCode: string;
  modalityName: string;
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
      label: modality.modalityName,
      value: modality.today.total,
    }),
  );

  const totalExams =
    chartData.reduce(
      (sum, item) =>
        sum + item.value,
      0,
    );

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
                innerRadius="53%"
                outerRadius="78%"
                paddingAngle={2}
                dataKey="value"
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

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">

            <span className="text-[44px] font-extrabold leading-none tracking-tight text-qc-navy">
              {totalExams.toLocaleString()}
            </span>

            <span className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
              Today
            </span>

          </div>

        </div>
      </div>

      {/* =====================================================
          MODALITY BREAKDOWN
          Two-column fixed public-display layout
      ===================================================== */}

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

                  <div className="flex min-w-0 items-center gap-2">

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

                  </div>

                  {/* =================================================
                      VALUE + %
                  ================================================= */}

                  <div className="ml-2 flex shrink-0 items-center gap-2.5">

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

                  </div>

                </div>
              );
            },
          )}

        </div>
      </div>

    </div>
  );
}