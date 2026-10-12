import { getPublicActivityData } from "@/app/actions";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ShieldCheck,
} from "lucide-react";
import ModalityPieChart from "@/components/charts/ModalityPieChart";
import AutoRefresh from "@/components/dashboard/AutoRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const tableColumns =
  "grid-cols-[minmax(0,1fr)_70px_70px_100px_60px]";

export default async function PatientActivityPage() {
  const data = await getPublicActivityData();

  const volumeDiff =
    data.todayGrandTotal -
    data.yesterdayGrandTotal;

  const diffLabel =
    volumeDiff > 0
      ? "Higher than yesterday"
      : volumeDiff < 0
        ? "Lower than yesterday"
        : "Same as yesterday";

  return (
    <main className="h-[100dvh] w-screen overflow-hidden bg-[#F4F6FA] text-qc-navy">
      <AutoRefresh intervalMs={10000} />

      <div className="flex h-full min-h-0 flex-col">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-white/10 bg-qc-navy px-6 text-white shadow-[0_4px_16px_rgba(5,14,64,0.10)] xl:px-9">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-qc-blue text-qc-yellow shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
              <span className="text-base font-extrabold">
                R
              </span>
            </div>

            <div>
              <p className="text-base font-extrabold tracking-tight">
                RADiTrack
              </p>

              <p className="text-[11px] font-medium text-white/50">
                QCGH · Department of Radiology
              </p>
            </div>

          </div>

          <div className="flex items-center gap-5">

            <div className="hidden text-right md:block">

              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/40">
                AS OF TODAY
              </p>

              <p className="text-sm font-bold text-white">
                {data.asOfDate}
              </p>

            </div>

            <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 shadow-sm">

              <span className="h-2.5 w-2.5 rounded-full bg-qc-yellow shadow-[0_0_0_3px_rgba(242,203,73,0.12)]" />

              <span className="text-[11px] font-bold text-white">
                Live · {data.lastUpdatedTime}
              </span>

            </div>

          </div>
        </header>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <div className="min-h-0 flex-1 overflow-hidden p-4 xl:p-5">

          <div className="mx-auto flex h-full min-h-0 max-w-[1800px] flex-col gap-3">

            {/* =================================================
                SUMMARY
            ================================================= */}

            <section className="grid shrink-0 grid-cols-12 gap-3">

              {/* =================================================
                  TODAY
              ================================================= */}

              <div className="relative col-span-12 flex h-[138px] items-center justify-between overflow-hidden rounded-[22px] border border-qc-yellow/30 bg-white px-6 shadow-[0_8px_24px_rgba(5,14,64,0.06)] lg:col-span-5 xl:px-8">

                <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-qc-yellow/20" />

                <div className="pointer-events-none absolute bottom-0 right-20 h-20 w-20 rounded-full bg-qc-blue/[0.04]" />

                <div className="relative z-10 min-w-0">

                  <p className="text-[21px] font-extrabold leading-tight tracking-tight text-qc-navy xl:text-[24px]">
                    Today&apos;s Examinations
                  </p>

                  <p className="mt-2 text-[16px] font-bold leading-tight text-qc-blue xl:text-[18px]">
                    All Imaging Modalities
                  </p>

                </div>

                <div className="relative z-10 flex shrink-0 flex-col items-end">

                  <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                    Total Examinations
                  </p>

                  <div className="flex h-[68px] min-w-[96px] items-center justify-center rounded-2xl bg-qc-yellow px-5 shadow-[0_8px_20px_rgba(242,203,73,0.22)] xl:h-[70px] xl:min-w-[110px]">

                    <p className="whitespace-nowrap text-6xl font-black leading-none tracking-[-0.04em] text-qc-navy xl:text-7xl">
                      {data.todayGrandTotal.toLocaleString()}
                    </p>

                  </div>

                </div>

              </div>

              {/* =================================================
                  YESTERDAY
              ================================================= */}

              <div className="relative col-span-12 flex h-[138px] items-center justify-between overflow-hidden rounded-[22px] border border-qc-blue/15 bg-white px-6 shadow-[0_8px_24px_rgba(5,14,64,0.06)] lg:col-span-3 xl:px-8">

                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-qc-blue/[0.05]" />

                <div className="relative z-10">

                  <p className="text-[17px] font-extrabold tracking-tight text-qc-navy xl:text-[20px]">
                    Yesterday
                  </p>

                  <p className="mt-1.5 text-[14px] font-semibold text-slate-500 xl:text-[16px]">
                    Previous 24 Hours
                  </p>

                </div>

                <p className="relative z-10 whitespace-nowrap text-5xl font-extrabold leading-none tracking-tight text-qc-blue xl:text-6xl">
                  {data.yesterdayGrandTotal.toLocaleString()}
                </p>

              </div>

              {/* =================================================
                  DAY OVER DAY
              ================================================= */}

              <div className="relative col-span-12 flex h-[138px] items-center justify-between overflow-hidden rounded-[22px] border border-qc-blue/15 bg-white px-6 shadow-[0_8px_24px_rgba(5,14,64,0.06)] lg:col-span-4 xl:px-8">

                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-qc-yellow/[0.08]" />

                <div className="relative z-10">

                  <p className="text-[17px] font-extrabold tracking-tight text-qc-navy xl:text-[20px]">
                    Day-Over-Day
                  </p>

                  <p className="mt-1.5 text-[14px] font-semibold text-slate-500 xl:text-[16px]">
                    Compared with Yesterday
                  </p>

                </div>

                <div className="relative z-10 text-right">

                  <div className="flex items-center justify-end gap-2">

                    {volumeDiff > 0 ? (
                      <ArrowUpRight className="h-7 w-7 text-qc-blue xl:h-8 xl:w-8" />
                    ) : volumeDiff < 0 ? (
                      <ArrowDownRight className="h-7 w-7 text-qc-red xl:h-8 xl:w-8" />
                    ) : (
                      <Minus className="h-7 w-7 text-qc-yellow xl:h-8 xl:w-8" />
                    )}

                    <span
                      className={`whitespace-nowrap text-5xl font-extrabold leading-none tracking-tight xl:text-6xl ${
                        volumeDiff > 0
                          ? "text-qc-blue"
                          : volumeDiff < 0
                            ? "text-qc-red"
                            : "text-qc-yellow"
                      }`}
                    >
                      {volumeDiff > 0
                        ? "+"
                        : ""}
                      {volumeDiff.toLocaleString()}
                    </span>

                  </div>

                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 xl:text-[11px]">
                    {diffLabel}
                  </p>

                </div>

              </div>

            </section>

            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <section className="grid min-h-0 flex-1 grid-cols-12 gap-3">

              {/* =================================================
                  IMAGING ACTIVITIES
              ================================================= */}

              <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)] lg:col-span-8">

                <div className="relative flex h-[60px] shrink-0 items-center overflow-hidden border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6">

                  <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/10" />

                  <h2 className="relative z-10 text-xl font-extrabold tracking-tight text-qc-navy">
                    Imaging Activities Today
                  </h2>

                </div>

                {/* TABLE HEADER */}
                <div
                  className={`grid ${tableColumns} shrink-0 items-center border-b border-slate-200/70 bg-qc-blue/[0.035] px-6 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-qc-blue`}
                >
                  <span>
                    Modality
                  </span>

                  <span className="whitespace-nowrap text-right">
                    Total
                  </span>

                  <span className="whitespace-nowrap text-right">
                    OPD
                  </span>

                  <span className="whitespace-nowrap text-right">
                    Inpatient
                  </span>

                  <span className="whitespace-nowrap text-right text-qc-red">
                    ER
                  </span>
                </div>

                {/* TABLE ROWS */}
                <div className="min-h-0 flex-1 overflow-hidden">

                  <div className="h-full">

                    {data.modalities.map(
                      (item) => (
                        <div
                          key={
                            item.modalityCode
                          }
                          className={`grid ${tableColumns} h-[64px] items-center border-b border-slate-200/70 px-6 last:border-b-0`}
                        >

                          <div className="flex min-w-0 items-center gap-3 pr-3">

                            <span className="flex h-9 min-w-12 shrink-0 items-center justify-center rounded-lg bg-qc-navy px-2 text-[11px] font-extrabold text-qc-yellow">
                              {
                                item.modalityCode
                              }
                            </span>

                            <span className="truncate text-sm font-extrabold text-qc-navy xl:text-[15px]">
                              {
                                item.modalityName
                              }
                            </span>

                          </div>

                          {/* TOTAL */}
                          <span className="whitespace-nowrap text-right text-lg font-extrabold text-qc-blue xl:text-xl">
                            {item.today.total}
                          </span>

                          {/* OPD */}
                          <span className="whitespace-nowrap text-right text-sm font-bold text-qc-blue xl:text-[15px]">
                            {item.today.opd}
                          </span>

                          {/* INPATIENT — same visual treatment as OPD */}
                          <span className="whitespace-nowrap text-right text-sm font-bold text-qc-blue xl:text-[15px]">
                            {item.today.in}
                          </span>

                          {/* ER */}
                          <span className="whitespace-nowrap text-right text-sm font-extrabold text-qc-red xl:text-[15px]">
                            {item.today.er}
                          </span>

                        </div>
                      ),
                    )}

                  </div>
                </div>

              </div>

              {/* =================================================
                  MODALITY DISTRIBUTION
              ================================================= */}

              <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)] lg:col-span-4">

                <div className="relative flex h-[60px] shrink-0 items-center overflow-hidden border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6">

                  <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/10" />

                  <h2 className="relative z-10 text-xl font-extrabold tracking-tight text-qc-navy">
                    Modality Distribution
                  </h2>

                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-4 py-2.5 sm:px-5">

                  <ModalityPieChart
                    modalities={
                      data.modalities
                    }
                  />

                </div>

              </div>

            </section>

            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="flex h-[28px] shrink-0 items-center justify-between px-1 text-[9px] font-semibold text-slate-400 xl:text-[10px]">

              <div className="flex items-center gap-1.5">

                <ShieldCheck className="h-3.5 w-3.5 text-qc-blue" />

                <span>
                  Public display · No patient-identifiable information
                </span>

              </div>

              <span>
                Auto-refresh · 10 sec
              </span>

            </footer>

          </div>
        </div>
      </div>
    </main>
  );
}