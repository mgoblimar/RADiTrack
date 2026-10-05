"use client";

import { useState } from "react";
import { ModalityCode } from "@/lib/enums";
import { Calendar, TrendingUp, TrendingDown, Clock, CheckCircle2 } from "lucide-react";

interface DayRow {
  dayLabel: string;
  formattedDate: string;
  totalExams: number;
  opdCount: number;
  inCount: number;
  erCount: number;
  finalizedCount: number;
  pendingCount: number;
  avgTatMinutes: number;
  avgTatHours: number;
}

interface ModalityAnalytics {
  dayRows: DayRow[];
  currentAvgTatMinutes: number;
  currentAvgTatHours: number;
  priorAvgTatMinutes: number;
  pctChange: number;
}

interface Props {
  analytics: {
    all: ModalityAnalytics;
    byModality: Record<string, ModalityAnalytics>;
  };
}

export function SevenDayTatTable({ analytics }: Props) {
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const currentData: ModalityAnalytics =
    activeTab === "ALL"
      ? analytics.all
      : analytics.byModality[activeTab] || analytics.all;

  const tabs = [
    { key: "ALL", label: "All Modalities" },
    { key: ModalityCode.XRAY, label: "X-ray" },
    { key: ModalityCode.US, label: "Ultrasound" },
    { key: ModalityCode.CT, label: "CT-Scan" },
    { key: ModalityCode.MRI, label: "MRI" },
    { key: ModalityCode.MAMMO, label: "Mammogram" },
  ];

  return (
    <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            7-Day Retrospective Turnaround Time (TAT) Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Proposal Section X: Daily exam counts (OPD, IN, ER), reporting backlog, and finalized average TAT.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7-Day Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th className="px-4 py-3">Day / Date</th>
              <th className="px-4 py-3 text-center">Total Exams</th>
              <th className="px-4 py-3 text-center">Triage Breakdown (OPD • IN • ER)</th>
              <th className="px-4 py-3 text-center">Finalized</th>
              <th className="px-4 py-3 text-center">Pending Backlog</th>
              <th className="px-4 py-3 text-right">Average TAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {currentData.dayRows.map((row) => (
              <tr key={row.formattedDate} className="hover:bg-slate-800/40 transition">
                <td className="px-4 py-3 font-medium text-white">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{row.formattedDate}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {row.dayLabel}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-center font-bold text-white">
                  {row.totalExams}
                </td>

                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <span className="bg-sky-950/80 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded text-[11px]">
                      OPD: {row.opdCount}
                    </span>
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[11px]">
                      IN: {row.inCount}
                    </span>
                    <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[11px]">
                      ER: {row.erCount}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-center font-medium text-emerald-400">
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {row.finalizedCount}
                  </span>
                </td>

                <td className="px-4 py-3 text-center font-medium">
                  {row.pendingCount > 0 ? (
                    <span className="text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {row.pendingCount} pending
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">0</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right font-mono font-semibold text-indigo-300">
                  {row.avgTatMinutes > 0 ? (
                    <span>
                      {row.avgTatHours > 1 ? `${row.avgTatHours} hrs` : `${row.avgTatMinutes} mins`}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Proposal Weekly Comparative Note */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>
            <strong>7-Day Rolling Average:</strong>{" "}
            {currentData.currentAvgTatHours > 1
              ? `${currentData.currentAvgTatHours} hours`
              : `${currentData.currentAvgTatMinutes} minutes`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {currentData.pctChange !== 0 ? (
            currentData.pctChange > 0 ? (
              <span className="flex items-center gap-1 text-rose-400 font-semibold bg-rose-950/60 border border-rose-800 px-2.5 py-1 rounded-lg">
                <TrendingUp className="h-4 w-4" />
                {Math.abs(currentData.pctChange)}% longer than previous week
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
                <TrendingDown className="h-4 w-4" />
                {Math.abs(currentData.pctChange)}% faster than previous week
              </span>
            )
          ) : (
            <span className="text-slate-400">Consistent with previous 7-day average</span>
          )}
        </div>
      </div>
    </div>
  );
}