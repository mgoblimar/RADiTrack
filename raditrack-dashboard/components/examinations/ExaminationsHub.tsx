"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ExportCsvButton } from "@/components/staff/ExportCsvButton";
import { EditExamDialog } from "@/components/dashboard/EditExamDialog";
import { DeleteExamDialog } from "@/components/dashboard/DeleteExamDialog";
import {
  fetchFilteredExaminationsAction,
  signOffReportAction,
  FilteredExaminationItem,
  FilteredExaminationsResult,
} from "@/app/actions";
import {
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
} from "@/lib/enums";

interface ExaminationsHubProps {
  queue: any[];
  finalizedCount: number;
}

export function ExaminationsHub({ queue, finalizedCount: initialFinalizedCount }: ExaminationsHubProps) {
  const [statusTab, setStatusTab] = useState<"backlog" | "finalized" | "all">("backlog");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all");

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [modalityCode, setModalityCode] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [result, setResult] = useState<FilteredExaminationsResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load / Refetch examinations matching active filter state
  const loadExaminations = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await fetchFilteredExaminationsAction({
          statusType: statusTab,
          datePreset,
          startDate: datePreset === "custom" ? startDate : undefined,
          endDate: datePreset === "custom" ? endDate : undefined,
          modalityCode,
          searchTerm,
        });
        setResult(data);
      } catch (err) {
        console.error("Failed to load examinations:", err);
      }
    });
  }, [statusTab, datePreset, startDate, endDate, modalityCode, searchTerm]);

  useEffect(() => {
    loadExaminations();
  }, [loadExaminations]);

  const handleResetFilters = () => {
    setDatePreset("all");
    setModalityCode("ALL");
    setSearchTerm("");
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const items = result?.items ?? [];
  const summary = result?.summary ?? {
    totalFinalized: initialFinalizedCount,
    totalBacklog: queue.length,
    avgTatMinutes: 0,
    avgTatHours: 0,
    totalBreached: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-sky-400" />
            Examinations Registry & Study Backlogs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and temporally filter all backlog queues and finalized radiological records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportCsvButton />
        </div>
      </div>

      {/* FILTER CONTROL SUITE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Row 1: Status Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusTab("backlog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "backlog"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Active Backlog ({summary.totalBacklog})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab("finalized")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "finalized"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalized Archive ({summary.totalFinalized})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              All Records ({result?.totalCount ?? 0})
            </button>
          </div>

          {/* Search by Accession Identifier */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Accession ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Row 2: Temporal Filtering Presets & Modality */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-sky-400" />
              Period:
            </span>

            {[
              { id: "all", label: "All Dates" },
              { id: "today", label: "Today" },
              { id: "week", label: "This Week (Mon–Sun)" },
              { id: "month", label: "This Month" },
              { id: "year", label: "This Year" },
              { id: "custom", label: "📅 Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as any)}
                className={`px-2.5 py-1.5 rounded-xl font-medium transition ${
                  datePreset === p.id
                    ? "bg-sky-600 text-white font-semibold shadow-sm"
                    : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Modality Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Modality:
            </span>
            <select
              value={modalityCode}
              onChange={(e) => setModalityCode(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL">All Modalities</option>
              {Object.entries(MODALITY_CONFIG).map(([code, config]) => (
                <option key={code} value={code}>
                  {config.shortName}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 transition ml-1"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 3: Custom Date Range Pickers (Visible when custom preset selected) */}
        {datePreset === "custom" && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="button"
              onClick={loadExaminations}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-3 py-1 rounded-lg text-xs transition shadow-sm"
            >
              Apply Custom Range
            </button>
          </div>
        )}

        {/* Summary Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-800">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Filtered Cohort</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{items.length} studies</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Finalized Count</span>
            <span className="text-emerald-400 font-bold text-sm mt-0.5 block">{summary.totalFinalized} signed</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Backlog</span>
            <span className="text-amber-400 font-bold text-sm mt-0.5 block">{summary.totalBacklog} pending</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Average TAT</span>
            <span className="text-sky-300 font-bold text-sm mt-0.5 block font-mono">
              {summary.avgTatMinutes > 0
                ? summary.avgTatHours >= 1
                  ? `${summary.avgTatHours} hrs`
                  : `${summary.avgTatMinutes} mins`
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* DYNAMIC RESULTS TABLE */}
      <div className={`bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Accession ID</th>
                <th className="px-4 py-3">Modality</th>
                <th className="px-4 py-3">Triage</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Study Date</th>
                {statusTab === "backlog" && (
                  <>
                    <th className="px-4 py-3">Dwell Latency</th>
                    <th className="px-4 py-3">Target SLA</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </>
                )}
                {statusTab === "finalized" && (
                  <>
                    <th className="px-4 py-3">Completed $T_1$</th>
                    <th className="px-4 py-3">Signed $T_2$</th>
                    <th className="px-4 py-3 text-right">Actual TAT</th>
                    <th className="px-4 py-3 text-center">SLA Compliance</th>
                  </>
                )}
                {statusTab === "all" && (
                  <>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">TAT / Dwell</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40 text-xs">
              {items.map((item) => (
                <tr key={item.examId} className="hover:bg-slate-800/40 transition">
                  {/* Accession ID */}
                  <td className="px-4 py-3 font-mono font-medium text-white flex items-center gap-2">
                    {item.identifier}
                    {item.isCarryOver && (
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                        Carry-Over
                      </span>
                    )}
                  </td>

                  {/* Modality */}
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {MODALITY_CONFIG[item.modalityCode as ModalityCode]?.shortName ?? item.modalityCode}
                  </td>

                  {/* Triage Origin */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] border font-medium ${
                        TRIAGE_CONFIG[item.triageLevel as TriageLevel]?.badgeClass ??
                        "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {item.triageLevel}
                    </span>
                  </td>

                  {/* Urgency */}
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] border font-medium ${
                        URGENCY_CONFIG[item.urgencyLevel as UrgencyLevel]?.badgeClass ??
                        "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {item.urgencyLevel}
                    </span>
                  </td>

                  {/* Study Date */}
                  <td className="px-4 py-3 text-slate-300 font-mono">
                    {item.studyDateFormatted}
                  </td>

                  {/* Backlog Specific Columns */}
                  {statusTab === "backlog" && (
                    <>
                      <td
                        className={`px-4 py-3 font-semibold font-mono ${
                          item.isBreached ? "text-rose-400 font-bold" : "text-amber-400"
                        }`}
                      >
                        {item.dwellMinutes} mins
                        {item.isBreached && (
                          <span className="ml-1 text-[10px] text-rose-400 font-bold">
                            (BREACHED)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {item.targetTatMinutes ? `${item.targetTatMinutes} mins` : "No Target"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditExamDialog item={item as any} />
                          <DeleteExamDialog examId={item.examId} identifier={item.identifier} />
                          <form
                            action={async (fd) => {
                              await signOffReportAction(fd);
                              loadExaminations();
                            }}
                            className="inline"
                          >
                            <input type="hidden" name="examId" value={item.examId} />
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition border border-emerald-500/40"
                            >
                              Sign ($T_2$)
                            </button>
                          </form>
                        </div>
                      </td>
                    </>
                  )}

                  {/* Finalized Specific Columns */}
                  {statusTab === "finalized" && (
                    <>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {item.examCompletedAtFormatted || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {item.reportSignedAtFormatted || "—"}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400">
                        {item.tatMinutes ? (
                          <span>
                            {item.tatHours && item.tatHours >= 1
                              ? `${item.tatHours} hrs`
                              : `${item.tatMinutes} mins`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {item.isBreached ? (
                          <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            BREACHED
                          </span>
                        ) : (
                          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            MET SLA
                          </span>
                        )}
                      </td>
                    </>
                  )}

                  {/* All Records Specific Columns */}
                  {statusTab === "all" && (
                    <>
                      <td className="px-4 py-3">
                        {item.isFinalized ? (
                          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            FINALIZED
                          </span>
                        ) : (
                          <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            PENDING BACKLOG
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {item.isFinalized ? (
                          <span className="text-emerald-400">
                            {item.tatHours && item.tatHours >= 1 ? `${item.tatHours}h` : `${item.tatMinutes}m`}
                          </span>
                        ) : (
                          <span className="text-amber-400">{item.dwellMinutes}m dwell</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {!item.isFinalized && (
                          <form
                            action={async (fd) => {
                              await signOffReportAction(fd);
                              loadExaminations();
                            }}
                            className="inline"
                          >
                            <input type="hidden" name="examId" value={item.examId} />
                            <button
                              type="submit"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2 py-0.5 rounded text-xs transition"
                            >
                              Sign ($T_2$)
                            </button>
                          </form>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 space-y-2">
                    <AlertTriangle className="h-8 w-8 text-slate-600 mx-auto" />
                    <div className="font-semibold text-slate-400">No examination records found</div>
                    <div className="text-xs text-slate-500">
                      Try adjusting your date range, modality filter, or search query.
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-sky-400 px-3 py-1.5 rounded-xl border border-slate-700 transition"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
