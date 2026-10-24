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
  "grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr_1fr]";

/* =========================================================
   MODALITY COLOR MAP DICTIONARY
========================================================= */
const MODALITY_ROW_COLORS: Record<
  string,
  { bg: string; badgeBg: string; badgeText: string; accentBorder: string }
> = {
  XRAY: {
    bg: "bg-[#18298C]/[0.05] hover:bg-[#18298C]/10",
    badgeBg: "bg-[#18298C]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#18298C]",
  },
  US: {
    bg: "bg-[#F2CB49]/[0.12] hover:bg-[#F2CB49]/20",
    badgeBg: "bg-[#F2CB49]",
    badgeText: "text-[#050E40]",
    accentBorder: "border-l-4 border-l-[#F2CB49]",
  },
  CT: {
    bg: "bg-[#A60808]/[0.05] hover:bg-[#A60808]/10",
    badgeBg: "bg-[#A60808]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#A60808]",
  },
  MRI: {
    bg: "bg-[#5267C7]/[0.07] hover:bg-[#5267C7]/15",
    badgeBg: "bg-[#5267C7]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#5267C7]",
  },
  MAMMO: {
    bg: "bg-[#050E40]/[0.05] hover:bg-[#050E40]/10",
    badgeBg: "bg-[#050E40]",
    badgeText: "text-[#F2CB49]",
    accentBorder: "border-l-4 border-l-[#050E40]",
  },
};

const DEFAULT_ROW_COLOR = {
  bg: "hover:bg-qc-blue/[0.015]",
  badgeBg: "bg-qc-navy",
  badgeText: "text-qc-yellow",
  accentBorder: "border-l-4 border-l-qc-navy",
};

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

              {/* TODAY */}
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

              {/* YESTERDAY */}
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

              {/* DAY OVER DAY */}
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
                      {volumeDiff > 0 ? "+" : ""}
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
                {/* TOP HEADER ROW */}
                <div className={`grid ${tableColumns} shrink-0 items-center border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)]`}>
                  <div className="relative flex h-[50px] items-center overflow-hidden border-r border-slate-200/80 px-6">
                    <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/10" />
                    <h2 className="relative z-10 text-lg font-extrabold tracking-tight text-qc-navy">
                      Imaging Activities
                    </h2>
                  </div>

                  <div className="col-span-3 flex h-[50px] items-center justify-center gap-2 border-r border-slate-200/80 bg-qc-blue/[0.03] text-sm font-extrabold uppercase tracking-wider text-qc-navy">
                    <span className="h-2.5 w-2.5 rounded-full bg-qc-blue" />
                    <span>TODAY</span>
                  </div>

                  <div className="col-span-3 flex h-[50px] items-center justify-center gap-2 bg-slate-50 text-sm font-extrabold uppercase tracking-wider text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span>YESTERDAY</span>
                  </div>
                </div>

                {/* SUB-HEADER ROW */}
                <div className={`grid ${tableColumns} shrink-0 items-center border-b border-slate-200/70 bg-slate-50/60 px-6 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-qc-blue`}>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-4 rounded-full border border-slate-300" />
                    <span>Code & Name</span>
                  </div>

                  <span className="text-right">OPD</span>
                  <span className="text-right">IN</span>
                  <span className="text-right border-r border-slate-200/80 pr-4 text-qc-red">ER</span>

                  <span className="text-right pl-4 text-slate-500">OPD</span>
                  <span className="text-right text-slate-500">IN</span>
                  <span className="text-right text-slate-500">ER</span>
                </div>

                {/* TABLE DATA ROWS */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  <div className="h-full">
                    {data.modalities.map((item) => {
                      const modStyle =
                        MODALITY_ROW_COLORS[item.modalityCode] || DEFAULT_ROW_COLOR;

                      return (
                        <div
                          key={item.modalityCode}
                          className={`grid ${tableColumns} h-[64px] items-center border-b border-slate-200/70 px-6 last:border-b-0 transition-colors ${modStyle.bg} ${modStyle.accentBorder}`}
                        >
                          {/* ICON / BADGE + MODALITY NAME */}
                          <div className="flex min-w-0 items-center gap-3 pr-2">
                            <span className={`flex h-8 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-[11px] font-extrabold shadow-sm ${modStyle.badgeBg} ${modStyle.badgeText}`}>
                              {item.modalityCode}
                            </span>
                            <span className="truncate text-sm font-extrabold text-qc-navy xl:text-[15px]">
                              {item.modalityName}
                            </span>
                          </div>

                          {/* TODAY VALUES */}
                          <span className="whitespace-nowrap text-right text-base font-bold text-qc-blue xl:text-lg">
                            {item.today.opd}
                          </span>
                          <span className="whitespace-nowrap text-right text-base font-bold text-qc-blue xl:text-lg">
                            {item.today.in}
                          </span>
                          <span className="whitespace-nowrap text-right text-base font-extrabold border-r border-slate-200/80 pr-4 text-qc-red xl:text-lg">
                            {item.today.er}
                          </span>

                          {/* YESTERDAY VALUES */}
                          <span className="whitespace-nowrap text-right text-base font-semibold pl-4 text-slate-500 xl:text-lg">
                            {item.yesterday.opd}
                          </span>
                          <span className="whitespace-nowrap text-right text-base font-semibold text-slate-500 xl:text-lg">
                            {item.yesterday.in}
                          </span>
                          <span className="whitespace-nowrap text-right text-base font-semibold text-slate-500 xl:text-lg">
                            {item.yesterday.er}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* =================================================
                  MODALITY DISTRIBUTION
              ================================================= */}

              <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)] lg:col-span-4">
                <div className="relative flex h-[60px] shrink-0 items-center border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6">
                  <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/10" />
                  <h2 className="relative z-10 text-xl font-extrabold tracking-tight text-qc-navy">
                    Modality Distribution Today
                  </h2>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <ModalityPieChart modalities={data.modalities} />
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