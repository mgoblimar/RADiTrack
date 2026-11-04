"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

// Fixed-size, non-animated charts so they render fully before printing.
const WIDTH = 680;
const HEIGHT = 250;
const NAVY = "#050E40";
const BLUE = "#18298C";
const RED = "#C53030";
const YELLOW = "#F2CB49";
const GRID = "#E2E8F0";
const MUTED = "#64748B";

export interface ReportModalityBar {
  label: string;
  avgTatHours: number;
  targetHours: number | null;
  volume: number;
  isHighlighted: boolean;
}

export function ReportModalityChart({ rows }: { rows: ReportModalityBar[] }) {
  const hasTargets = rows.some((r) => r.targetHours !== null);

  return (
    <BarChart width={WIDTH} height={HEIGHT} data={rows} margin={{ top: 20, right: 12, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke={NAVY} />
      <YAxis tickLine={false} axisLine={false} fontSize={10} stroke={MUTED} width={48} tickFormatter={(v) => `${v} hrs`} />
      {hasTargets && <Legend wrapperStyle={{ fontSize: 10 }} />}
      {hasTargets && (
        <Bar dataKey="targetHours" name="Target SLA" fill="#4A69BD" fillOpacity={0.35} isAnimationActive={false} radius={[4, 4, 0, 0]} />
      )}
      <Bar dataKey="avgTatHours" name="Actual Turnaround Time" isAnimationActive={false} radius={[4, 4, 0, 0]}>
        {rows.map((row) => {
          const isBreach = row.targetHours !== null && row.avgTatHours > row.targetHours;
          return (
            <Cell
              key={row.label}
              fill={row.volume === 0 ? "#CBD5E1" : isBreach ? RED : NAVY}
              stroke={row.isHighlighted ? YELLOW : undefined}
              strokeWidth={row.isHighlighted ? 3 : 0}
            />
          );
        })}
        <LabelList dataKey="avgTatHours" position="top" fontSize={10} fill={NAVY} formatter={(v) => `${v} hrs`} />
      </Bar>
    </BarChart>
  );
}

export interface ReportTrendPoint {
  label: string;
  avgTatHours: number;
  priorYearAvgTatHours: number;
}

export function ReportTrendChart({ points, seriesLabel }: { points: ReportTrendPoint[]; seriesLabel: string }) {
  return (
    <LineChart width={WIDTH} height={HEIGHT} data={points} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke={NAVY} />
      <YAxis tickLine={false} axisLine={false} fontSize={10} stroke={MUTED} width={48} tickFormatter={(v) => `${v} hrs`} />
      <Legend wrapperStyle={{ fontSize: 10 }} />
      <Line type="monotone" dataKey="avgTatHours" name={seriesLabel} stroke={BLUE} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
      <Line type="monotone" dataKey="priorYearAvgTatHours" name="Same month last year" stroke="#7C3AED" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
    </LineChart>
  );
}
