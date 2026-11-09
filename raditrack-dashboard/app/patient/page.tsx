
import { getPublicActivityData } from "@/app/actions";

import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ShieldCheck,
} from "lucide-react";

import { HospitalHeader } from "@/components/navigation/HospitalHeader";
import ModalityPieChart from "@/components/charts/ModalityPieChart";
import AutoRefresh from "@/components/dashboard/AutoRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const tableColumns =
  "grid-cols-[minmax(120px,2.5fr)_repeat(6,minmax(32px,1fr))]";

const MODALITY_ROW_COLORS: Record<
  string,
  { bg: string; badgeBg: string; badgeText: string; accentBorder: string }
> = {
  XRAY: {
    bg: "bg-[#00357a]/[0.05]",
    badgeBg: "bg-[#00357a]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#00357a]",
  },
  US: {
    bg: "bg-[#ffd230]/[0.12]",
    badgeBg: "bg-[#ffd230]",
    badgeText: "text-[#00357a]",
    accentBorder: "border-l-4 border-l-[#ffd230]",
  },
  CT: {
    bg: "bg-[#7a0000]/[0.05]",
    badgeBg: "bg-[#7a0000]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#7a0000]",
  },
  MRI: {
    bg: "bg-[#5267C7]/[0.07]",
    badgeBg: "bg-[#5267C7]",
    badgeText: "text-white",
    accentBorder: "border-l-4 border-l-[#5267C7]",
  },
  MAMMO: {
    bg: "bg-[#00357a]/[0.05]",
    badgeBg: "bg-[#00357a]",
    badgeText: "text-[#ffd230]",
    accentBorder: "border-l-4 border-l-[#00357a]",
  },
};

const DEFAULT_ROW_COLOR = {
  bg: "bg-white",
  badgeBg: "bg-[#00357a]",
  badgeText: "text-[#ffd230]",
  accentBorder: "border-l-4 border-l-[#00357a]",
};

export default async function PatientActivityPage() {
  const data = await getPublicActivityData();

  const volumeDiff =
    data.todayGrandTotal - data.yesterdayGrandTotal;

  const diffLabel =
    volumeDiff > 0
      ? "Higher than yesterday"
      : volumeDiff < 0
        ? "Lower than yesterday"
        : "Same as yesterday";

  return (
    <main className="relative isolate h-[100dvh] w-full overflow-hidden overscroll-none bg-[#F4F6FA] text-qc-blue">
      <AutoRefresh intervalMs={10000} />

      {/* SHARED HOSPITAL BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.34] saturate-[0.82]"
          style={{ backgroundImage: "url('/qcgh-background.jpg')" }}
        />
        <div className="absolute inset-0 bg-white/[0.34]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,249,252,0.08)_0%,rgba(247,249,252,0.02)_38%,rgba(247,249,252,0.16)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(0,53,122,0.045),transparent_28%),radial-gradient(circle_at_92%_7%,rgba(255,210,0,0.055),transparent_26%)]" />
      </div>

      <div className="pointer-events-none relative z-10 flex h-full min-h-0 select-none flex-col overflow-hidden p-3 sm:p-4 xl:p-5">
        {/* HOSPITAL HEADER */}
        <HospitalHeader
          pageTitle="Patient TV"
          asOfDate={data.asOfDate}
          lastUpdatedTime={data.lastUpdatedTime}
          variant="patient-display"
          className="mb-3 shrink-0"
        />

        <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col gap-3 overflow-hidden">
          {/* DAILY EXAMINATION SUMMARY */}
          <section className="grid shrink-0 grid-cols-12 gap-3">
            {/* TODAY */}
            <div className="relative col-span-12 flex h-[130px] items-center justify-between overflow-hidden rounded-[20px] border border-qc-yellow/40 bg-white px-5 shadow-[0_8px_26px_rgba(0,53,122,0.07)] lg:col-span-5 xl:px-8">
              <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-qc-yellow/20 blur-2xl" />
              <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-24 rounded-full bg-qc-blue/[0.045] blur-xl" />

              <div className="relative z-10 min-w-0">
                <p className="text-xl font-black leading-tight tracking-tight text-qc-blue sm:text-2xl xl:text-[28px]">
                  Today&apos;s Examinations
                </p>
                <p className="mt-2 text-sm font-bold leading-tight text-qc-blue/75 sm:text-base xl:text-lg">
                  All Imaging Modalities
                </p>
              </div>

              <div className="relative z-10 ml-3 flex shrink-0 flex-col items-end">
                <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-qc-blue/70 sm:text-[10px]">
                  Total Examinations
                </p>
                <div className="flex h-[68px] min-w-[90px] items-center justify-center rounded-2xl bg-qc-yellow px-4 shadow-[0_8px_20px_rgba(255,210,48,0.24)] sm:h-[76px] sm:min-w-[104px]">
                  <p className="whitespace-nowrap text-5xl font-black leading-none tracking-[-0.04em] text-qc-blue sm:text-6xl">
                    {data.todayGrandTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* YESTERDAY */}
            <div className="relative col-span-12 flex h-[130px] items-center justify-between overflow-hidden rounded-[20px] border border-qc-blue/15 bg-white px-5 shadow-[0_8px_26px_rgba(0,53,122,0.06)] lg:col-span-3 xl:px-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-qc-blue/[0.055] blur-xl" />

              <div className="relative z-10">
                <p className="text-lg font-extrabold tracking-tight text-qc-blue sm:text-xl xl:text-[22px]">
                  Yesterday
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">
                  Previous 24 Hours
                </p>
              </div>

              <p className="relative z-10 whitespace-nowrap text-4xl font-black leading-none tracking-tight text-qc-blue sm:text-5xl xl:text-6xl">
                {data.yesterdayGrandTotal.toLocaleString()}
              </p>
            </div>

            {/* DAY-OVER-DAY */}
            <div className="relative col-span-12 flex h-[130px] items-center justify-between overflow-hidden rounded-[20px] border border-qc-blue/15 bg-white px-5 shadow-[0_8px_26px_rgba(0,53,122,0.06)] lg:col-span-4 xl:px-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-qc-yellow/[0.10] blur-xl" />

              <div className="relative z-10">
                <p className="text-lg font-extrabold tracking-tight text-qc-blue sm:text-xl xl:text-[22px]">
                  Day-Over-Day
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500 sm:text-sm">
                  Compared with Yesterday
                </p>
              </div>

              <div className="relative z-10 text-right">
                <div className="flex items-center justify-end gap-2">
                  {volumeDiff > 0 ? (
                    <ArrowUpRight className="h-6 w-6 text-qc-blue sm:h-7 sm:w-7" />
                  ) : volumeDiff < 0 ? (
                    <ArrowDownRight className="h-6 w-6 text-qc-red sm:h-7 sm:w-7" />
                  ) : (
                    <Minus className="h-6 w-6 text-qc-yellow sm:h-7 sm:w-7" />
                  )}

                  <span
                    className={`whitespace-nowrap text-4xl font-black leading-none tracking-tight sm:text-5xl xl:text-6xl ${
                      volumeDiff > 0
                        ? "text-qc-blue"
                        : volumeDiff < 0
                          ? "text-qc-red"
                          : "text-qc-blue"
                    }`}
                  >
                    {volumeDiff > 0 ? "+" : ""}
                    {volumeDiff.toLocaleString()}
                  </span>
                </div>

                <p
                  className={`mt-2 text-[9px] font-extrabold uppercase tracking-[0.1em] sm:text-[10px] ${
                    volumeDiff < 0 ? "text-qc-red" : "text-slate-400"
                  }`}
                >
                  {diffLabel}
                </p>
              </div>
            </div>
          </section>

          {/* MAIN DISPLAY AREA */}
          <section className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden">
            {/* IMAGING ACTIVITIES TABLE */}
            <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-qc-blue/10 bg-white shadow-[0_8px_26px_rgba(0,53,122,0.055)] lg:col-span-8">
              <div className="flex shrink-0 flex-col overflow-hidden">
                {/* TABLE MAIN HEADER */}
                <div
                  className={`grid ${tableColumns} shrink-0 items-center border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F5F8FC_0%,#EDF3FA_65%,#FFF9E9_100%)]`}
                >
                  <div className="relative flex h-[50px] items-center overflow-hidden border-r border-slate-200/80 px-4 lg:px-6">
                    <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/15" />
                    <h2 className="relative z-10 text-base font-black tracking-tight text-qc-blue xl:text-lg">
                      Imaging Activities
                    </h2>
                  </div>

                  <div className="col-span-3 flex h-[50px] items-center justify-center gap-2 border-r border-slate-200/80 bg-qc-blue/[0.045] text-xs font-extrabold uppercase tracking-wider text-qc-blue xl:text-sm">
                    <span className="h-2 w-2 rounded-full bg-qc-blue" />
                    <span>Today</span>
                  </div>

                  <div className="col-span-3 flex h-[50px] items-center justify-center gap-2 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500 xl:text-sm">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Yesterday</span>
                  </div>
                </div>

                {/* TABLE COLUMN HEADERS */}
                <div
                  className={`grid ${tableColumns} shrink-0 items-center border-b border-slate-200/70 bg-slate-50/70 px-4 py-2.5 text-[9px] font-extrabold uppercase tracking-[0.09em] text-qc-blue lg:px-6 xl:text-[10px]`}
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-1.5 w-3 rounded-full border border-slate-300" />
                    <span>Code &amp; Name</span>
                  </div>

                  <span className="text-right">OPD</span>
                  <span className="text-right">IN</span>
                  <span className="border-r border-slate-200/80 pr-2 text-right text-qc-red xl:pr-4">
                    ER
                  </span>
                  <span className="pl-2 text-right text-slate-500 xl:pl-4">
                    OPD
                  </span>
                  <span className="text-right text-slate-500">IN</span>
                  <span className="text-right text-slate-500">ER</span>
                </div>
              </div>

              {/* TABLE DATA ROWS - NO SCROLLING */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {data.modalities.map((item) => {
                  const modStyle =
                    MODALITY_ROW_COLORS[item.modalityCode] ||
                    DEFAULT_ROW_COLOR;

                  return (
                    <div
                      key={item.modalityCode}
                      className={`grid ${tableColumns} min-h-0 flex-1 items-center border-b border-slate-200/70 px-4 last:border-b-0 lg:px-6 ${modStyle.bg} ${modStyle.accentBorder}`}
                    >
                      <div className="flex min-w-0 items-center gap-2 pr-2">
                        <span
                          className={`flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-[9px] font-extrabold shadow-sm xl:h-8 xl:min-w-10 xl:text-[10px] ${modStyle.badgeBg} ${modStyle.badgeText}`}
                        >
                          {item.modalityCode}
                        </span>

                        <span className="truncate text-xs font-extrabold text-qc-blue sm:text-sm xl:text-[15px]">
                          {item.modalityName}
                        </span>
                      </div>

                      <span className="whitespace-nowrap text-right text-sm font-bold text-qc-blue sm:text-base xl:text-lg">
                        {item.today.opd}
                      </span>
                      <span className="whitespace-nowrap text-right text-sm font-bold text-qc-blue sm:text-base xl:text-lg">
                        {item.today.in}
                      </span>
                      <span className="whitespace-nowrap border-r border-slate-200/80 pr-2 text-right text-sm font-extrabold text-qc-red sm:text-base xl:pr-4 xl:text-lg">
                        {item.today.er}
                      </span>

                      <span className="whitespace-nowrap pl-2 text-right text-sm font-semibold text-slate-500 sm:text-base xl:pl-4 xl:text-lg">
                        {item.yesterday.opd}
                      </span>
                      <span className="whitespace-nowrap text-right text-sm font-semibold text-slate-500 sm:text-base xl:text-lg">
                        {item.yesterday.in}
                      </span>
                      <span className="whitespace-nowrap text-right text-sm font-semibold text-slate-500 sm:text-base xl:text-lg">
                        {item.yesterday.er}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODALITY DISTRIBUTION */}
            <div className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-qc-blue/10 bg-white shadow-[0_8px_26px_rgba(0,53,122,0.055)] lg:col-span-4">
              <div className="relative flex h-[68px] shrink-0 items-center border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F5F8FC_0%,#EDF3FA_65%,#FFF9E9_100%)] px-6">
                <div className="pointer-events-none absolute -right-8 -top-12 h-24 w-24 rounded-full bg-qc-yellow/15" />

                <h2 className="relative z-10 text-xl font-black tracking-tight text-qc-blue xl:text-2xl">
                  Modality Distribution Today
                </h2>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 xl:p-4">
                <ModalityPieChart modalities={data.modalities} />
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="flex h-[26px] shrink-0 items-center justify-between px-1 text-[9px] font-semibold text-slate-400 xl:text-[10px]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-qc-blue" />
              <span>
                Public display · No patient-identifiable information
              </span>
            </div>

            <span>Auto-refresh · 10 sec</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
