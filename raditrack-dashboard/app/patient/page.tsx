import { getPublicActivityData } from "@/app/actions";
import {
  Activity,
  ShieldCheck,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import Link from "next/link";
import ModalityPieChart from "@/components/charts/ModalityPieChart";

// scale page to device 
// import type { Viewport } from 'next'

// export const viewport: Viewport = {
//   width: 'device-width',
//   initialScale: 1,
// }


export const dynamic = "force-dynamic";
export const revalidate = 60; // Automated re-render every 60 seconds (Client-confirmed TV heartbeat)

export default async function PatientActivityPage() {
  const data = await getPublicActivityData();

  const volumeDiff = data.todayGrandTotal - data.yesterdayGrandTotal;

  return (
    <main className="w-full min-h-screen max-w-[98vw] mx-auto px-4 py-6 space-y-6 bg-slate-950 text-slate-100 p-6 md:p-10 font-sans selection:bg-sky-500 selection:text-white">
      <div className="w-full mx-auto space-y-8">
        {/* Kiosk / TV Screen Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <Activity className="h-4 w-4 animate-pulse" />
              Department of Radiology • Live Public Monitor
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Radiology Activity Today
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {data.asOfDate} • 24-Hour Continuous Service Coverage 
            </p>
          </div> 

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs text-slate-300 font-medium">
                Live Sync: {data.lastUpdatedTime}
              </span>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 transition underline underline-offset-4"
            >
              Staff Portal Access →
            </Link>
          </div>
        </header>

        {/* Grand Total Comparison Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Today Volume */}
          <div className="bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-800/50 p-6 rounded-2xl shadow-xl flex items-center justify-between">
            <div>

              <div className="flex items-center gap-2 max-w-[200px] text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <div className="flex items-center justify-center w-20 h-20 bg-white rounded-full shrink-0">
                  <Users className="h-10 w-10 text-sky-400" />
                </div>
                <p className="text-xl font-bold text-white leading-snug max-w-[180px]">
                Total Examinations Completed
                </p>
              </div>

              <div className="text-[12px] text-sky-300 mt-3 font-medium">
                Patients served across all suites
              </div>

            </div>

            <div className="text-6xl font-black text-white tracking-tight ml-4">
              {data.todayGrandTotal}
            </div>

          </div>

          {/* Yesterday Volume Baseline */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>

              <div className="flex items-center gap-2 max-w-[200px] text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <div className="flex items-center justify-center w-20 h-20 bg-white rounded-full shrink-0">
                  <Clock className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-xl font-bold text-slate leading-snug max-w-[180px]">
                    Yesterday's Total Volume
                </p>
              </div>

              <div className="text-[12px] text-slate-400 mt-3">
                Previous 24-hour baseline
              </div>
            </div>

            <div className="text-6xl font-bold text-slate-300 tracking-tight ml-4">
              {data.yesterdayGrandTotal}
            </div>
            
          </div>
            

          {/* Day-Over-Day Shift Indicator */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-lg flex items-center justify-between">
            <div>
                <p className="text-xl font-bold text-slate leading-snug max-w-[180px]">
                  Day-Over-Day Shift Volume
                </p>
                <div className="text-[15px] text-slate-400 mt-3">
                  {volumeDiff > 0
                    ? "Higher patient volume compared to yesterday"
                    : volumeDiff < 0
                    ? "Lower patient volume compared to yesterday"
                    : "Equal volume to previous day"}
                </div>
            </div>


            <div className="flex items-center gap-2 mt-2">
              {volumeDiff > 0 ? (
                <span className="flex items-center gap-1 text-emerald-400 text-3xl font-bold">
                  <ArrowUpRight className="h-8 w-8" /> +{volumeDiff}
                </span>
              ) : volumeDiff < 0 ? (
                <span className="flex items-center gap-1 text-sky-400 text-3xl font-bold">
                  <ArrowDownRight className="h-8 w-8" /> {volumeDiff}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400 text-3xl font-bold">
                  <Minus className="h-8 w-8" /> Same
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Modality Breakdown Grid (Proposal Page 5) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.modalities.map((item) => (
              <div
                key={item.modalityCode}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 hover:border-slate-700 transition space-y-4 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[11px] font-mono font-semibold text-sky-400 uppercase tracking-wider">
                      {item.modalityCode}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {item.modalityName}
                    </h3>
                  </div>
                  {/*<div className="text-right">
                    <div className="text-2xl font-black text-white">
                      {item.today.total}
                    </div>
                    <span className="text-[10px] text-slate-400">Today</span>
                  </div>*/}
                </div>

                {/* Today vs Yesterday Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Today Column */}
                  <div className="p-3 rounded-xl border border-slate-800/60 space-y-2">
                    <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                      Today ({item.today.total})
                    </span>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">OPD:</span>
                      <strong className="text-white">{item.today.opd}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Inpatient:</span>
                      <strong className="text-white">{item.today.in}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">ER:</span>
                      <strong className="text-rose-300">{item.today.er}</strong>
                    </div>
                  </div>

                  {/* Yesterday Column */}
                  <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Yesterday ({item.yesterday.total})
                    </span>
                    <div className="flex justify-between text-slate-400">
                      <span>OPD:</span>
                      <span>{item.yesterday.opd}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Inpatient:</span>
                      <span>{item.yesterday.in}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>ER:</span>
                      <span>{item.yesterday.er}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <ModalityPieChart modalities={data.modalities} />
          </div>
        </section>

        

        {/* Privacy & Zero-PII Guarantee Banner */}
        <footer className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex items-center gap-3.5 text-xs text-emerald-300">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          <p>
            <strong>Strict Zero-PII Compliance:</strong> This display is strictly for department workload monitoring and waiting area information. No patient-identifiable data (names, identification numbers, clinical findings, or individual turnaround times) is processed or displayed.
          </p>
        </footer>
      </div>
    </main>
  );
}