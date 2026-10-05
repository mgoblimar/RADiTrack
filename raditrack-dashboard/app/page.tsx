import {
  getDashboardData,
  createExaminationAction,
  signOffReportAction,
} from "./actions";
import {
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";

import { TatOverviewChart } from "@/components/charts/TatOverviewChart";
import {
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Activity className="text-sky-400 h-8 w-8" />
              RADiTrack Operations & TAT Intelligence (Prisma 7)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live Radiology Information System (RIS) Turnaround Time & Workload
              Monitor
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-300">
              Localhost:3000
            </span>
          </div>
        </header>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Total Volume</span>
              <Activity className="h-5 w-5 text-sky-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {data.totalVolume}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              All recorded scans
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Average TAT</span>
              <Clock className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {data.avgTatMinutes}{" "}
              <span className="text-lg font-normal text-slate-400">mins</span>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Median:{" "}
              <strong className="text-slate-200">
                {data.medianTatMinutes} mins
              </strong>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>SLA Compliance</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 mt-2">
              {data.pctOnTime}%
            </div>
            <div className="text-xs text-slate-400 mt-2">
              {data.finalizedCount} reports finalized
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
              <span>Reading Backlog</span>
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mt-2">
              {data.pendingReadingCount}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Pending Radiologist Sign-off
            </div>
          </div>
        </div>
     
        {/* Manual Input Form */}
        <section className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <PlusCircle className="text-sky-400 h-5 w-5" />
            Quick Manual Exam Ingestion
          </h2>
          <form
            action={createExaminationAction}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4"
          >
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Accession Identifier
              </label>
              <input
                name="examinationIdentifier"
                placeholder="e.g. ACC-2026-001"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Modality
              </label>
              <select
                name="modalityCode"
                defaultValue={ModalityCode.CT}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {Object.entries(MODALITY_CONFIG).map(([code, config]) => (
                  <option key={code} value={code}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Triage Level
              </label>
              <select
                name="triageLevel"
                defaultValue={TriageLevel.OPD}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {Object.entries(TRIAGE_CONFIG).map(([level, config]) => (
                  <option key={level} value={level}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Urgency
              </label>
              <select
                name="urgencyLevel"
                defaultValue={UrgencyLevel.ROUTINE}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {Object.entries(URGENCY_CONFIG).map(([urgency, config]) => (
                  <option key={urgency} value={urgency}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold py-2 px-4 rounded-lg text-sm transition"
              >
                Log Examination
              </button>
            </div>
          </form>
        </section>

        {/* Live Interpretation Queue */}
        <section className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Active Reading Queue & Dwell Sitting Times
            </h2>
            <span className="text-xs text-slate-400">
              {data.pendingReadingQueue.length} scans waiting for reading
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Accession ID</th>
                  <th className="px-4 py-3">Modality</th>
                  <th className="px-4 py-3">Triage</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Sitting Latency</th>
                  <th className="px-4 py-3">SLA Target</th>
                  <th className="px-4 py-3 text-right">Sign-Off Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.pendingReadingQueue.map((item) => (
                  <tr
                    key={item.examId}
                    className="hover:bg-slate-800/50 transition"
                  >
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
                      <form action={signOffReportAction} className="inline">
                        <input
                          type="hidden"
                          name="examId"
                          value={item.examId}
                        />
                        <button
                          type="submit"
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 py-1 rounded-md text-xs transition"
                        >
                          Mark Signed
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {data.pendingReadingQueue.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      🎉 No pending interpretation backlog! All scans are
                      finalized.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <TatOverviewChart />
      </div>
    </main>
  );
}
