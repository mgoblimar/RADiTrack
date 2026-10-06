"use client";

import { useState } from "react";
import { Search, FileSpreadsheet, CheckCircle2, Clock } from "lucide-react";
import { ExportCsvButton } from "@/components/staff/ExportCsvButton";
import { EditExamDialog } from "@/components/dashboard/EditExamDialog";
import { DeleteExamDialog } from "@/components/dashboard/DeleteExamDialog";
import {
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
} from "@/lib/enums";

interface PendingExamItem {
  examId: string;
  identifier: string;
  modalityCode: string;
  triageLevel: string;
  urgencyLevel: string;
  dwellMinutes: number;
  targetTat: number | null;
  isBreached: boolean;
  isCarryOver: boolean;
  notes?: string;
}

interface ExaminationsHubProps {
  queue: PendingExamItem[];
  finalizedCount: number;
}

export function ExaminationsHub({ queue, finalizedCount }: ExaminationsHubProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"backlog" | "finalized">("backlog");

  const filteredBacklog = queue.filter((item) =>
    item.identifier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/40 border border-slate-700/80 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-sky-400" />
            Examinations Registry & Study Backlogs
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, and manage ongoing reading queues and finalized radiological records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportCsvButton />
        </div>
      </div>

      {/* Sub-Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-800/80 border border-slate-700 rounded-xl">
          <button
            onClick={() => setActiveSubTab("backlog")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === "backlog"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Active Reading Backlog ({queue.length})
          </button>
          <button
            onClick={() => setActiveSubTab("finalized")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === "finalized"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Finalized Archive ({finalizedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Accession ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Backlog Table */}
      {activeSubTab === "backlog" ? (
        <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Accession ID</th>
                  <th className="px-4 py-3">Modality</th>
                  <th className="px-4 py-3">Triage</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Dwell Latency</th>
                  <th className="px-4 py-3">Target SLA</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBacklog.map((item) => (
                  <tr key={item.examId} className="hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono font-medium text-white flex items-center gap-2">
                      {item.identifier}
                      {item.isCarryOver && (
                        <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700">
                          Carry-Over
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {MODALITY_CONFIG[item.modalityCode as ModalityCode]?.shortName ?? item.modalityCode}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs border font-medium ${
                          TRIAGE_CONFIG[item.triageLevel as TriageLevel]?.badgeClass ??
                          "bg-slate-700 text-slate-300 border-slate-600"
                        }`}
                      >
                        {item.triageLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs border font-medium ${
                          URGENCY_CONFIG[item.urgencyLevel as UrgencyLevel]?.badgeClass ??
                          "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {item.urgencyLevel}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
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
                    <td className="px-4 py-3 text-slate-400">
                      {item.targetTat ? `${item.targetTat} mins` : "No Target"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditExamDialog item={item} />
                        <DeleteExamDialog examId={item.examId} identifier={item.identifier} />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredBacklog.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No active backlog records match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Finalized Archive */
        <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-10 text-center text-slate-400 space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            Full Historical Archive Active ({finalizedCount} Completed Reports)
          </h3>
          <p className="text-xs max-w-md mx-auto leading-relaxed">
            All finalized radiological studies across the past 14 months are cataloged with complete timestamps ($T_1$ and $T_2$).
            Click <strong>Export Raw Data (CSV)</strong> above to download the de-identified dataset for clinical audit and validation.
          </p>
        </div>
      )}
    </div>
  );
}
