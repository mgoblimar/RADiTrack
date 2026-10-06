"use client";

import { Sliders, ShieldCheck, Clock, Building2 } from "lucide-react";

export function ConfigurationsHub() {
  const modalities = [
    {
      code: "XRAY",
      name: "General Radiography (X-Ray)",
      room: "X-Ray Room 1",
      statSla: "30 mins",
      routineSla: "8 hrs (480 mins)",
    },
    {
      code: "US",
      name: "Ultrasound",
      room: "US Room 3",
      statSla: "45 mins",
      routineSla: "12 hrs (720 mins)",
    },
    {
      code: "CT",
      name: "Computed Tomography (CT-Scan)",
      room: "CT Suite 1",
      statSla: "60 mins",
      routineSla: "24 hrs (1,440 mins)",
    },
    {
      code: "MRI",
      name: "Magnetic Resonance Imaging",
      room: "MRI Basement",
      statSla: "—",
      routineSla: "48 hrs (2,880 mins)",
    },
    {
      code: "MAMMO",
      name: "Mammography",
      room: "Breast Imaging Center",
      statSla: "—",
      routineSla: "24 hrs (1,440 mins)",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-2xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Sliders className="h-5 w-5 text-sky-400" />
          Department Configurations & Service Level Agreements
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Registered imaging modalities, assigned department rooms, and benchmark SLA target thresholds
        </p>
      </div>

      {/* Modality & SLA Table */}
      <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">Modality Directory & SLA Target Benchmarks</h3>
          </div>
          <span className="text-xs text-slate-400">5 Active Imaging Modalities</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs text-slate-400 uppercase border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Modality Name</th>
                <th className="px-4 py-3">Room Location</th>
                <th className="px-4 py-3">Emergency STAT SLA</th>
                <th className="px-4 py-3">Routine Outpatient SLA</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {modalities.map((m) => (
                <tr key={m.code} className="hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-sky-400">{m.code}</td>
                  <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-slate-400">{m.room}</td>
                  <td className="px-4 py-3 font-semibold text-rose-400">
                    {m.statSla !== "—" ? (
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {m.statSla}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {m.routineSla}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Data Governance Banner */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Hospital Zero-PII Compliance Enforced</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              All demographic patient data (names, birth dates, case numbers) is strictly stripped before reaching the RADiTrack monitoring layer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
