"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, ActiveTab } from "@/components/navigation/Sidebar";
import { ExaminationsHub } from "@/components/examinations/ExaminationsHub";
import { ConfigurationsHub } from "@/components/config/ConfigurationsHub";
import { TatOverviewChart } from "@/components/charts/TatOverviewChart";
import { SevenDayTatTable } from "@/components/staff/SevenDayTatTable";
import { TwelveMonthTrendChart } from "@/components/staff/TwelveMonthTrendChart";
import { ExportCsvButton } from "@/components/staff/ExportCsvButton";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tv,
  Calendar,
  Radio,
} from "lucide-react";

interface DashboardShellProps {
  data: any;
  sevenDayAnalytics: any;
  twelveMonthTrend: any;
  modalityTatOverview: any;
  prevMonth: any;
  configurationsData: any;
}

export function DashboardShell({
  data,
  sevenDayAnalytics,
  twelveMonthTrend,
  modalityTatOverview,
  prevMonth,
  configurationsData,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={data.pendingReadingQueue.length}
      />

      {/* Main Viewport Content Area */}
      <div className="flex-1 min-w-0 lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          {/* TAB 1: OVERVIEW & ANALYTICS DASHBOARD */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Header Bar */}
              <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                    <Activity className="text-sky-400 h-7 w-7 sm:h-8 sm:w-8" />
                    RADiTrack Operations & TAT Intelligence
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Quezon City General Hospital • Department of Radiology RIS Monitoring Layer
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/patient"
                    target="_blank"
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition"
                  >
                    <Tv className="h-4 w-4 text-emerald-400" />
                    Patient Display (/patient)
                  </Link>
                  <Link
                    href="/simulator"
                    className="flex items-center gap-2 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-800 font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-sm"
                  >
                    <Radio className="h-4 w-4 text-sky-400" />
                    RIS Simulator (/simulator)
                  </Link>
                  <ExportCsvButton />
                </div>
              </header>

              {/* Executive KPI Summary Cards (5-Card Responsive Suite) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Total Volume</span>
                    <Activity className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {data.totalVolume}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">All recorded scans</div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Average TAT</span>
                    <Clock className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {data.avgTatMinutes}{" "}
                    <span className="text-lg font-normal text-slate-400">mins</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    Median: <strong className="text-slate-200">{data.medianTatMinutes} mins</strong>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>SLA Compliance</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-2">
                    {data.pctOnTime}%
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {data.finalizedCount} reports finalized
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Reading Backlog</span>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-amber-400 mt-2">
                    {data.pendingReadingCount}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Pending Radiologist Sign-off</div>
                </div>

                {/* Client Requested Metric: Previous Month Average TAT */}
                <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <span>Prev Month TAT</span>
                    <Calendar className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-purple-300 mt-2">
                    {prevMonth ? (
                      prevMonth.avgTatHours >= 1 ? (
                        <>
                          {prevMonth.avgTatHours}{" "}
                          <span className="text-lg font-normal text-slate-400">hrs</span>
                        </>
                      ) : (
                        <>
                          {prevMonth.avgTatMinutes}{" "}
                          <span className="text-lg font-normal text-slate-400">mins</span>
                        </>
                      )
                    ) : (
                      <span className="text-lg text-slate-500 font-normal">N/A</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {prevMonth
                      ? `${prevMonth.fullMonth} • ${prevMonth.totalFinalized} finalized`
                      : "No prior month data"}
                  </div>
                </div>
              </div>

              {/* Proposal 7-Day Performance Table */}
              <SevenDayTatTable analytics={sevenDayAnalytics} />

              {/* Recharts Analytics Suite */}
              <div className="space-y-6">
                <TatOverviewChart data={modalityTatOverview} />
                <TwelveMonthTrendChart data={twelveMonthTrend} />
              </div>
            </div>
          )}

          {/* TAB 2: EXAMINATIONS HUB */}
          {activeTab === "examinations" && (
            <ExaminationsHub
              queue={data.pendingReadingQueue}
              finalizedCount={data.finalizedCount}
            />
          )}

          {/* TAB 3: CONFIGURATIONS & SLA */}
          {activeTab === "config" && (
            <ConfigurationsHub initialData={configurationsData} />
          )}
        </main>
      </div>
    </div>
  );
}
