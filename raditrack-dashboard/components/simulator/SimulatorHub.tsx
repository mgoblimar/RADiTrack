"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Radio,
  PlusCircle,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Tv,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import {
  createExaminationAction,
  simulateScenarioAction,
  autoSignOldestBacklogAction,
  signOffReportAction,
} from "@/app/actions";
import {
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
} from "@/lib/enums";

interface SimulatorHubProps {
  initialQueue: any[];
  totalExamsCount: number;
}

export function SimulatorHub({ initialQueue, totalExamsCount }: SimulatorHubProps) {
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customId, setCustomId] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generateNextId = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCustomId(`ACC-QCGH-${randomSuffix}`);
  };

  const handleSimulateScenario = (scenario: "stat_ct" | "stat_xray" | "opd_us" | "in_mri") => {
    startTransition(async () => {
      try {
        const res = await simulateScenarioAction(scenario);
        showToast(`✅ Ingested scenario scan: ${res.identifier}`);
      } catch (err) {
        console.error("Simulation error:", err);
        showToast("❌ Failed to simulate scan");
      }
    });
  };

  const handleAutoSignOldest = () => {
    startTransition(async () => {
      try {
        const res = await autoSignOldestBacklogAction();
        if (res.success) {
          showToast(`✍️ Signed off ${res.identifier} (TAT: ${res.tatMinutes} mins)`);
        } else {
          showToast(`ℹ️ ${res.message}`);
        }
      } catch (err) {
        console.error("Auto sign error:", err);
        showToast("❌ Failed to sign study");
      }
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-sky-500/80 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="h-4 w-4 text-sky-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>Dedicated Ingestion Layer • Isolated from Main Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            QCGH RIS & Modality Simulator
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Simulate modality acquisitions (T₁) and test radiologist sign-offs (T₂) to stress-test the TAT monitoring system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition"
          >
            <ArrowLeft className="h-4 w-4 text-sky-400" />
            Back to Dashboard (/)
          </Link>
          <Link
            href="/patient"
            target="_blank"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition"
          >
            <Tv className="h-4 w-4 text-emerald-400" />
            Patient TV (/patient)
          </Link>
        </div>
      </header>

      {/* Grid: Left = Manual Entry Form | Right = One-Click Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MANUAL SCAN INGESTION FORM ($T_1$) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-sky-400" />
                Manual Examination Ingestion Form ($T_1$)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Stamps completion timestamp to begin the SLA countdown clock.
              </p>
            </div>
            <button
              type="button"
              onClick={generateNextId}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2.5 py-1 rounded-lg transition"
            >
              Auto-Generate ID
            </button>
          </div>

          <form
            action={async (formData) => {
              await createExaminationAction(formData);
              setCustomId("");
              showToast("✅ Scan logged successfully into active queue!");
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Accession Identifier
              </label>
              <input
                name="examinationIdentifier"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="e.g. ACC-QCGH-9501"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Modality
                </label>
                <select
                  name="modalityCode"
                  defaultValue={ModalityCode.CT}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  {Object.entries(MODALITY_CONFIG).map(([code, config]) => (
                    <option key={code} value={code}>
                      {config.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Triage Origin
                </label>
                <select
                  name="triageLevel"
                  defaultValue={TriageLevel.OPD}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  {Object.entries(TRIAGE_CONFIG).map(([level, config]) => (
                    <option key={level} value={level}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Urgency Level
                </label>
                <select
                  name="urgencyLevel"
                  defaultValue={UrgencyLevel.ROUTINE}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
                >
                  {Object.entries(URGENCY_CONFIG).map(([urgency, config]) => (
                    <option key={urgency} value={urgency}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-semibold">
                Clinical Notes / Indication (Optional)
              </label>
              <input
                name="notes"
                placeholder="e.g. Query acute intracranial hemorrhage; post-MVA"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-xs flex items-center justify-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Log Completed Scan ($T_1$)</span>
            </button>
          </form>
        </div>

        {/* ONE-CLICK WORKFLOW SIMULATION PRESETS */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                One-Click Quick Scenario Presets
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inject realistic clinical cases into the database with one click.
              </p>
            </div>

            <div className="space-y-2.5 pt-4">
              <button
                type="button"
                onClick={() => handleSimulateScenario("stat_ct")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-rose-900/60 hover:border-rose-700 text-left transition group"
              >
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    Emergency Trauma CT Scan
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Modality: CT • Origin: ER • Urgency: STAT (60m SLA)
                  </div>
                </div>
                <span className="text-[11px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                  + STAT CT
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScenario("stat_xray")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-amber-900/60 hover:border-amber-700 text-left transition group"
              >
                <div>
                  <div className="font-bold text-white text-xs">
                    Acute ER Chest Radiograph
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Modality: X-Ray • Origin: ER • Urgency: STAT (30m SLA)
                  </div>
                </div>
                <span className="text-[11px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                  + STAT X-Ray
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScenario("opd_us")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-sky-900/60 hover:border-sky-700 text-left transition group"
              >
                <div>
                  <div className="font-bold text-white text-xs">
                    Outpatient Abdominal Ultrasound
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Modality: US • Origin: OPD • Urgency: ROUTINE (12h SLA)
                  </div>
                </div>
                <span className="text-[11px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-mono font-bold">
                  + OPD US
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateScenario("in_mri")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-purple-900/60 hover:border-purple-700 text-left transition group"
              >
                <div>
                  <div className="font-bold text-white text-xs">
                    Inpatient Brain MRI Examination
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Modality: MRI • Origin: IN • Urgency: ROUTINE (48h SLA)
                  </div>
                </div>
                <span className="text-[11px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-mono font-bold">
                  + IN MRI
                </span>
              </button>
            </div>
          </div>

          {/* Instant Sign-Off Action */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleAutoSignOldest}
              disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20 text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Auto-Sign Oldest Backlog Study (T₂)</span>
            </button>
          </div>
        </div>
      </div>

      {/* LIVE SIMULATOR READING QUEUE FEED */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              Current Unfinalized Reading Queue ({initialQueue.length} Active Studies)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Studies currently sitting unread in the PACS reading worklist awaiting radiologist report sign-off.
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Total Ingested in System: {totalExamsCount}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Accession ID</th>
                <th className="px-4 py-3">Modality</th>
                <th className="px-4 py-3">Triage</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Current Dwell Latency</th>
                <th className="px-4 py-3">Target SLA</th>
                <th className="px-4 py-3 text-right">Simulation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40 text-xs">
              {initialQueue.map((item) => (
                <tr key={item.examId} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-mono font-medium text-white flex items-center gap-2">
                    {item.identifier}
                    {item.isCarryOver && (
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                        Carry-Over
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {MODALITY_CONFIG[item.modalityCode as ModalityCode]?.shortName ?? item.modalityCode}
                  </td>
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
                    {item.targetTat ? `${item.targetTat} mins` : "No Target"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={signOffReportAction}>
                      <input type="hidden" name="examId" value={item.examId} />
                      <button
                        type="submit"
                        className="bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-lg text-xs transition border border-emerald-500/40"
                      >
                        Sign-Off (T₂)
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {initialQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No active unfinalized studies in the queue. Use the ingestion form above to add a study.
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
