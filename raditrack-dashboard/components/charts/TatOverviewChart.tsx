"use client";

import { useState } from "react";
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
import { Clock, Filter } from "lucide-react";

// Sample dataset: Turnaround Time performance by Modality
const initialData = [
  { modality: "CT", avgTat: 42, target: 60, volume: 18 },
  { modality: "XRAY", avgTat: 18, target: 30, volume: 45 },
  { modality: "MRI", avgTat: 85, target: 120, volume: 12 },
  { modality: "US", avgTat: 28, target: 45, volume: 22 },
  { modality: "MAMMO", avgTat: 55, target: 60, volume: 8 },
];

export function TatOverviewChart() {
  const [filter, setFilter] = useState<"ALL" | "EMERGENCY" | "ROUTINE">("ALL");

  // Adjust display data dynamically based on the active button filter
  const displayData = initialData.map((d) => {
    if (filter === "EMERGENCY") {
      return { ...d, avgTat: Math.round(d.avgTat * 0.7), target: Math.round(d.target * 0.5) };
    }
    if (filter === "ROUTINE") {
      return { ...d, avgTat: Math.round(d.avgTat * 1.3), target: Math.round(d.target * 1.5) };
    }
    return d;
  });

  return (
    <Card className="bg-slate-800/40 border-slate-700/80 text-slate-100 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-400" />
              Modality Turnaround Time (TAT) vs SLA Target
            </CardTitle>
            <Badge variant="outline" className="border-sky-500/40 text-sky-300 text-xs">
              Live Recharts
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-1">
            Comparing average minutes from exam completion ($T_1$) to report sign-off ($T_2$).
          </CardDescription>
        </div>

        {/* shadcn Buttons used as interactive filter toggles */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-slate-700/60">
          <Filter className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
          <Button
            size="xs"
            variant={filter === "ALL" ? "default" : "ghost"}
            onClick={() => setFilter("ALL")}
            className={filter === "ALL" ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium" : "text-slate-400"}
          >
            All Scans
          </Button>
          <Button
            size="xs"
            variant={filter === "EMERGENCY" ? "default" : "ghost"}
            onClick={() => setFilter("EMERGENCY")}
            className={filter === "EMERGENCY" ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium" : "text-slate-400"}
          >
            STAT / ER
          </Button>
          <Button
            size="xs"
            variant={filter === "ROUTINE" ? "default" : "ghost"}
            onClick={() => setFilter("ROUTINE")}
            className={filter === "ROUTINE" ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium" : "text-slate-400"}
          >
            Routine
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-72 w-full pt-2">
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
                formatter={(value: any, name: any) => [
                  `${value} mins`,
                  name === "avgTat" ? "Actual Avg TAT" : "SLA Target",
                ]}
              />
              <Bar dataKey="avgTat" radius={[6, 6, 0, 0]}>
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.avgTat > entry.target ? "#f87171" : "#38bdf8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 mt-4 border-t border-slate-700/60 pt-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
              Within SLA Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              SLA Breach Warning
            </span>
          </div>
          <span>Filter: <strong className="text-slate-200">{filter}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}