"use client";

import { useState, useTransition } from "react";
import {
  Sliders,
  ShieldCheck,
  Clock,
  Building2,
  UserCheck,
  RotateCcw,
  Pencil,
  Plus,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Hospital,
  Lock,
  Cpu,
  Power,
  Search,
} from "lucide-react";
import {
  ConfigurationsData,
  ModalityConfigItem,
  SlaRuleItem,
  RadiologistItem,
  updateSlaTargetAction,
  resetDefaultSlasAction,
  updateModalityDetailsAction,
  toggleModalityStatusAction,
  createRadiologistAction,
  toggleRadiologistStatusAction,
} from "@/app/actions";
import { MODALITY_CONFIG, ModalityCode, TRIAGE_CONFIG, URGENCY_CONFIG } from "@/lib/enums";

interface ConfigurationsHubProps {
  initialData?: ConfigurationsData;
}

type ConfigTab = "slas" | "rooms" | "radiologists" | "governance";

export function ConfigurationsHub({ initialData }: ConfigurationsHubProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>("slas");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fallback defaults if initialData is not supplied
  const modalities = initialData?.modalities || [];
  const radiologists = initialData?.radiologists || [];
  const governance = initialData?.hospitalGovernance || {
    hospitalName: "Quezon City General Hospital (QCGH)",
    department: "Department of Radiology & Medical Imaging",
    phiZeroCompliance: true,
    dohAccreditation: "Tertiary Level III Hospital Center",
    systemVersion: "RADiTrack v1.4.0 (Build 2026)",
  };

  // State for Edit SLA Dialog
  const [editingSla, setEditingSla] = useState<{
    modalityCode: string;
    modalityName: string;
    triageLevel: string;
    urgencyLevel: string;
    currentTargetMinutes: number;
  } | null>(null);

  // State for Edit Modality Dialog
  const [editingModality, setEditingModality] = useState<ModalityConfigItem | null>(null);

  // State for Add Radiologist Dialog
  const [isAddingRadiologist, setIsAddingRadiologist] = useState(false);

  // Helper to show temporary notification
  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Format minutes into human-readable hours and minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} mins`;
    const hrs = minutes / 60;
    return Number.isInteger(hrs) ? `${hrs} hrs (${minutes}m)` : `${hrs.toFixed(1)} hrs (${minutes}m)`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Card */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-sky-400" />
            Configurations & Clinical SLA Benchmarks
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {governance.hospitalName} • {governance.department}
          </p>
        </div>

        {/* Global Reset / Audit Shortcut */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to restore all SLA target benchmarks to hospital defaults?"
                )
              ) {
                startTransition(async () => {
                  const res = await resetDefaultSlasAction();
                  if (res.success) {
                    showFeedback("All SLA benchmarks successfully restored to QCGH hospital standards!");
                  }
                });
              }
            }}
            disabled={isPending}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
            Reset SLA Defaults
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
              : "bg-rose-950/80 border-rose-700 text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Workspace Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("slas")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition shrink-0 ${
            activeTab === "slas"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Clock className="h-4 w-4" />
          SLA Target Benchmarks
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition shrink-0 ${
            activeTab === "rooms"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Modality Rooms & Hardware ({modalities.length})
        </button>

        <button
          onClick={() => setActiveTab("radiologists")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition shrink-0 ${
            activeTab === "radiologists"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Radiologist Duty Roster ({radiologists.length})
        </button>

        <button
          onClick={() => setActiveTab("governance")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition shrink-0 ${
            activeTab === "governance"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Data Governance & Zero-PII
        </button>
      </div>

      {/* TAB 1: SLA TARGET BENCHMARKS */}
      {activeTab === "slas" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400" />
                Service Level Agreement (SLA) Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Maximum allowable Turnaround Time (TAT = T₂ Sign-off − T₁ Exam Completed) before an examination is flagged as an SLA breach.
              </p>
            </div>
            <div className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg">
              Live updates propagate instantly to compliance metrics & charts.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {modalities.map((m) => {
              const statSla = m.slaConfigs.find(
                (s) => s.urgencyLevel === "STAT" || s.triageLevel === "ER"
              );
              const opdSla = m.slaConfigs.find(
                (s) => s.urgencyLevel === "ROUTINE" && s.triageLevel === "OPD"
              );
              const inSla = m.slaConfigs.find(
                (s) => s.urgencyLevel === "ROUTINE" && s.triageLevel === "IN"
              );

              return (
                <div
                  key={m.modalityCode}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                >
                  {/* Modality Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm bg-sky-950/80 text-sky-300 border border-sky-800 px-2.5 py-1 rounded-lg">
                        {m.modalityCode}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{m.modalityName}</h4>
                        <span className="text-[11px] text-slate-400">
                          {m.departmentRoom || "Unassigned Room"} • {m.totalExams} total scans
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        m.isActive
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                          : "bg-amber-950/80 text-amber-300 border-amber-800"
                      }`}
                    >
                      {m.isActive ? "Online" : "Maintenance"}
                    </span>
                  </div>

                  {/* SLA Benchmarks List */}
                  <div className="space-y-2.5 text-xs">
                    {/* STAT / Emergency Target */}
                    <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                          STAT / ER
                        </span>
                        <span className="text-slate-300 font-medium">Emergency Priority</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-rose-400">
                          {statSla ? formatDuration(statSla.targetTatMinutes) : "60 mins (Default)"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSla({
                              modalityCode: m.modalityCode,
                              modalityName: m.modalityName,
                              triageLevel: "ER",
                              urgencyLevel: "STAT",
                              currentTargetMinutes: statSla?.targetTatMinutes || 60,
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                          title="Edit Target Benchmark"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Routine Outpatient (OPD) Target */}
                    <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 text-sky-300 border border-sky-800">
                          OPD
                        </span>
                        <span className="text-slate-300 font-medium">Routine Outpatient</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-400">
                          {opdSla ? formatDuration(opdSla.targetTatMinutes) : "24 hrs (Default)"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSla({
                              modalityCode: m.modalityCode,
                              modalityName: m.modalityName,
                              triageLevel: "OPD",
                              urgencyLevel: "ROUTINE",
                              currentTargetMinutes: opdSla?.targetTatMinutes || 1440,
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                          title="Edit Target Benchmark"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inpatient (IN) Target */}
                    <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                          INPATIENT
                        </span>
                        <span className="text-slate-300 font-medium">Hospital Ward / ICU</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-amber-400">
                          {inSla ? formatDuration(inSla.targetTatMinutes) : "24 hrs (Default)"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSla({
                              modalityCode: m.modalityCode,
                              modalityName: m.modalityName,
                              triageLevel: "IN",
                              urgencyLevel: "ROUTINE",
                              currentTargetMinutes: inSla?.targetTatMinutes || 1440,
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                          title="Edit Target Benchmark"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MODALITY ROOMS & HARDWARE */}
      {activeTab === "rooms" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Department Imaging Suites & Room Locations</h3>
            </div>
            <span className="text-xs text-slate-400">Total Modalities: {modalities.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Modality</th>
                  <th className="px-4 py-3">Official Service Title</th>
                  <th className="px-4 py-3">Assigned Suite / Room</th>
                  <th className="px-4 py-3">Recorded Scans</th>
                  <th className="px-4 py-3">Operational Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {modalities.map((m) => (
                  <tr key={m.modalityCode} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">{m.modalityCode}</td>
                    <td className="px-4 py-3 text-white font-medium">{m.modalityName}</td>
                    <td className="px-4 py-3 text-slate-300 font-medium">
                      {m.departmentRoom || <span className="text-slate-500 italic">None assigned</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{m.totalExams} scans</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1.5 ${
                          m.isActive
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                            : "bg-amber-950/80 text-amber-300 border-amber-800"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            m.isActive ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        {m.isActive ? "Online & Active" : "Under Maintenance"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingModality(m)}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                        >
                          Edit Room
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              const res = await toggleModalityStatusAction(
                                m.modalityCode,
                                !m.isActive
                              );
                              if (res.success) {
                                showFeedback(
                                  `${m.modalityCode} status updated to ${
                                    !m.isActive ? "Online" : "Under Maintenance"
                                  }`
                                );
                              }
                            });
                          }}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-semibold transition ${
                            m.isActive
                              ? "bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800"
                              : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800"
                          }`}
                        >
                          {m.isActive ? "Set Maintenance" : "Set Online"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RADIOLOGIST ROSTER */}
      {activeTab === "radiologists" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-400" />
                Interpreting Radiologists & Attending Roster
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Qualified physicians certified for diagnostic interpretation and report sign-off (T₂)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingRadiologist(true)}
              className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Register Radiologist
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Physician Name</th>
                  <th className="px-4 py-3">Subspecialty Fellowship</th>
                  <th className="px-4 py-3">PRC License</th>
                  <th className="px-4 py-3">Finalized Scans</th>
                  <th className="px-4 py-3">Duty Status</th>
                  <th className="px-4 py-3 text-right">Duty Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {radiologists.map((r) => (
                  <tr key={r.radiologistId} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-white">{r.fullName}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {r.subspecialty || <span className="text-slate-500 italic">General Radiology</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.licenseNumber || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{r.totalReports} finalized</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold border inline-flex items-center gap-1.5 ${
                          r.isActive
                            ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.isActive ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        {r.isActive ? "On Active Duty" : "Off Duty / Leave"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          startTransition(async () => {
                            const res = await toggleRadiologistStatusAction(
                              r.radiologistId,
                              !r.isActive
                            );
                            if (res.success) {
                              showFeedback(
                                `${r.fullName} is now ${!r.isActive ? "On Duty" : "Off Duty"}`
                              );
                            }
                          });
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border font-semibold transition ${
                          r.isActive
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                            : "bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800"
                        }`}
                      >
                        {r.isActive ? "Set Off-Duty" : "Activate Duty"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DATA GOVERNANCE & ZERO-PII */}
      {activeTab === "governance" && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Hospital Privacy & Zero-PII Compliance Architecture
                </h3>
                <span className="text-xs text-slate-400">
                  Strictly aligned with Philippine Republic Act 10173 (Data Privacy Act) & DOH Hospital Health Information Systems guidelines.
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              RADiTrack operates as a non-identifiable telemetry monitoring layer for the Quezon City General Hospital Department of Radiology. All direct identifiers (Patient Names, Civil Demographics, Hospital MRN, Diagnostic Reports text, and Medical Histories) are entirely stripped at the hospital RIS boundary before study metadata is indexed.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
                  <Lock className="h-4 w-4" />
                  De-Identified Accession Keys
                </div>
                <p className="text-xs text-slate-400">
                  Every examination is indexed solely via an ephemeral accession number (<code className="text-sky-300 font-mono">ACC-QCGH-XXXX</code>). No personal link is reconstructible from outside the internal hospital firewall.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Clock className="h-4 w-4" />
                  Telemetry Timestamp Isolation
                </div>
                <p className="text-xs text-slate-400">
                  Calculations strictly track turnaround durations between procedural acquisition (<code className="text-indigo-300">T₁</code>) and clinical sign-off (<code className="text-indigo-300">T₂</code>) for audit quality improvement.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <Hospital className="h-4 w-4" />
                  Department Accreditation
                </div>
                <p className="text-xs text-slate-400">
                  {governance.hospitalName} operates as a {governance.dohAccreditation}. System software build: <span className="text-slate-300 font-semibold">{governance.systemVersion}</span>.
                </p>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                  <Cpu className="h-4 w-4" />
                  Isolated Ingestion Engine
                </div>
                <p className="text-xs text-slate-400">
                  Clinical simulation scenarios and ingestion pathways are sandboxed on the <code className="text-purple-300 font-mono">/simulator</code> portal to prevent operational disruption to live dashboards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT SLA BENCHMARK DIALOG */}
      {editingSla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setEditingSla(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-400" />
                Edit SLA Benchmark Target
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {editingSla.modalityName} ({editingSla.modalityCode}) • {editingSla.triageLevel} / {editingSla.urgencyLevel}
              </p>
            </div>

            <form
              action={async (formData: FormData) => {
                startTransition(async () => {
                  const res = await updateSlaTargetAction(formData);
                  if (res.success) {
                    showFeedback(
                      `Updated SLA target for ${editingSla.modalityCode} (${editingSla.urgencyLevel}) to ${formData.get("targetTatMinutes")} minutes!`
                    );
                    setEditingSla(null);
                  } else {
                    showFeedback(res.message || "Failed to update SLA", "error");
                  }
                });
              }}
              className="space-y-4"
            >
              <input type="hidden" name="modalityCode" value={editingSla.modalityCode} />
              <input type="hidden" name="triageLevel" value={editingSla.triageLevel} />
              <input type="hidden" name="urgencyLevel" value={editingSla.urgencyLevel} />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Turnaround Time (Minutes)
                </label>
                <input
                  type="number"
                  name="targetTatMinutes"
                  required
                  min={5}
                  max={10080}
                  defaultValue={editingSla.currentTargetMinutes}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Current Target: {formatDuration(editingSla.currentTargetMinutes)}
                </span>
              </div>

              {/* Quick Duration Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Quick Duration Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "30m", val: 30 },
                    { label: "45m", val: 45 },
                    { label: "60m (1h)", val: 60 },
                    { label: "2 hrs", val: 120 },
                    { label: "8 hrs", val: 480 },
                    { label: "12 hrs", val: 720 },
                    { label: "24 hrs", val: 1440 },
                    { label: "48 hrs", val: 2880 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={(e) => {
                        const input = e.currentTarget.form?.elements.namedItem(
                          "targetTatMinutes"
                        ) as HTMLInputElement;
                        if (input) input.value = p.val.toString();
                      }}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSla(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Benchmark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT MODALITY ROOM DIALOG */}
      {editingModality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setEditingModality(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-400" />
                Edit Modality Suite & Room
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {editingModality.modalityName} ({editingModality.modalityCode})
              </p>
            </div>

            <form
              action={async (formData: FormData) => {
                startTransition(async () => {
                  const res = await updateModalityDetailsAction(formData);
                  if (res.success) {
                    showFeedback(`Updated room details for ${editingModality.modalityCode}!`);
                    setEditingModality(null);
                  }
                });
              }}
              className="space-y-4"
            >
              <input type="hidden" name="modalityCode" value={editingModality.modalityCode} />

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department Room Assignment
                </label>
                <input
                  type="text"
                  name="departmentRoom"
                  defaultValue={editingModality.departmentRoom || ""}
                  placeholder="e.g. CT Suite 1, X-Ray Room 2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operational Status
                </label>
                <select
                  name="isActive"
                  defaultValue={editingModality.isActive ? "true" : "false"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="true">Online & Operational</option>
                  <option value="false">Under Maintenance (Offline)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingModality(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD RADIOLOGIST DIALOG */}
      {isAddingRadiologist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsAddingRadiologist(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sky-400" />
                Register Attending Radiologist
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Add an interpreting medical doctor to the active departmental roster.
              </p>
            </div>

            <form
              action={async (formData: FormData) => {
                startTransition(async () => {
                  const res = await createRadiologistAction(formData);
                  if (res.success) {
                    showFeedback("New radiologist registered successfully!");
                    setIsAddingRadiologist(false);
                  } else {
                    showFeedback(res.message || "Failed to register radiologist", "error");
                  }
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Physician Full Name & Title
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Dr. Juan Santos, MD, FPCR"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subspecialty Fellowship
                </label>
                <input
                  type="text"
                  name="subspecialty"
                  placeholder="e.g. Neuroradiology, MSK, Thoracic"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PRC Medical License Number
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="e.g. PRC-0134812"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingRadiologist(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
