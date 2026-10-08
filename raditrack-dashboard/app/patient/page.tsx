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
export const revalidate = 60;

export default async function PatientActivityPage() {
  const data = await getPublicActivityData();

  const volumeDiff = data.todayGrandTotal - data.yesterdayGrandTotal;

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* =========================================================
            HEADER
            ========================================================= */}
        <header className="flex flex-col gap-5 border-b border-border pb-7 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-qc-blue">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-qc-yellow/25">
                <Activity className="h-4 w-4" />
              </span>

              <span>Department of Radiology · Live Public Monitor</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy md:text-4xl">
              Radiology Activity Today
            </h1>

            <p className="text-sm font-medium text-muted-foreground">
              {data.asOfDate} · 24-hour continuous service coverage
            </p>
          </div> 

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-qc-yellow" />

              <span className="text-xs font-semibold text-qc-navy">
                Live sync: {data.lastUpdatedTime}
              </span>
            </div>

            <Link
              href="/"
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-qc-blue"
            >
              Staff portal access →
            </Link>
          </div>
        </header>

        {/* =========================================================
            SUMMARY CARDS
            ========================================================= */}
        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Today's Volume */}
          <div className="rounded-3xl border border-border bg-qc-navy p-6 shadow-[0_14px_35px_rgba(5,6,64,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-white/70">
                  Total examinations today
                </p>

                <p className="text-5xl font-extrabold tracking-tight text-white">
                  {data.todayGrandTotal}
                </p>

                <p className="text-sm leading-relaxed text-white/65">
                  Patients served across all imaging suites today
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-yellow text-qc-navy">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Yesterday's Volume */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-muted-foreground">
                  Yesterday's total volume
                </p>

                <p className="text-5xl font-extrabold tracking-tight text-qc-navy">
                  {data.yesterdayGrandTotal}
                </p>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  Previous 24-hour baseline
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-qc-blue">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </div>
            

          {/* Day-over-Day */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  Day-over-day volume
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Compared with yesterday
                </p>
              </div>

              <div className="flex items-center gap-3">
                {volumeDiff > 0 ? (
                  <div className="flex items-center gap-2 text-qc-blue">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-qc-yellow/30">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>

                    <span className="text-3xl font-extrabold tracking-tight">
                      +{volumeDiff}
                    </span>
                  </div>
                ) : volumeDiff < 0 ? (
                  <div className="flex items-center gap-2 text-qc-orange">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                      <ArrowDownRight className="h-5 w-5" />
                    </span>

                    <span className="text-3xl font-extrabold tracking-tight">
                      {volumeDiff}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
                      <Minus className="h-5 w-5" />
                    </span>

                    <span className="text-3xl font-extrabold tracking-tight">
                      Same
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">
                {volumeDiff > 0
                  ? "Higher examination volume compared with yesterday."
                  : volumeDiff < 0
                    ? "Lower examination volume compared with yesterday."
                    : "Examination volume is the same as the previous day."}
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            MODALITY BREAKDOWN
            ========================================================= */}
        <section className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold text-qc-blue">
                Imaging workload
              </p>

              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-qc-navy">
                Breakdown by modality & patient origin
              </h2>
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-right">
              Aggregated statistics across OPD, inpatient, and emergency
              examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.modalities.map((item) => (
              <div
                key={item.modalityCode}
                className="group rounded-3xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Modality Header */}
                <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <span className="inline-flex rounded-full bg-qc-blue/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-qc-blue">
                      {item.modalityCode}
                    </span>

                    <h3 className="text-lg font-bold text-qc-navy">
                      {item.modalityName}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-3xl font-extrabold tracking-tight text-qc-navy">
                      {item.today.total}
                    </div>

                    <span className="text-xs font-medium text-muted-foreground">
                      today
                    </span>
                  </div>
                </div>

                {/* Today / Yesterday */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Today */}
                  <div className="rounded-2xl bg-qc-cream-dark/45 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-qc-blue">
                        Today
                      </span>

                      <span className="text-xs font-extrabold text-qc-navy">
                        {item.today.total}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">OPD</span>
                        <strong className="font-bold text-qc-navy">
                          {item.today.opd}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Inpatient
                        </span>
                        <strong className="font-bold text-qc-navy">
                          {item.today.in}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ER</span>
                        <strong className="font-bold text-qc-red">
                          {item.today.er}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Yesterday */}
                  <div className="rounded-2xl border border-border bg-background/60 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        Yesterday
                      </span>

                      <span className="text-xs font-extrabold text-qc-navy">
                        {item.yesterday.total}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">OPD</span>
                        <span className="font-semibold text-qc-navy">
                          {item.yesterday.opd}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Inpatient
                        </span>
                        <span className="font-semibold text-qc-navy">
                          {item.yesterday.in}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ER</span>
                        <span className="font-semibold text-qc-navy">
                          {item.yesterday.er}
                        </span>
                      </div>
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

        {/* =========================================================
            PRIVACY / ZERO-PII NOTICE
            ========================================================= */}
        <footer className="flex items-start gap-3 rounded-2xl border border-qc-blue/15 bg-qc-blue/5 px-5 py-4 text-sm text-qc-navy">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
            <ShieldCheck className="h-5 w-5" />
          </span>

          <p className="leading-relaxed">
            <strong className="font-extrabold">Strict Zero-PII compliance:</strong>{" "}
            This display is intended only for department workload monitoring
            and waiting-area information. No patient-identifiable data such as
            names, identification numbers, clinical findings, or individual
            turnaround times is processed or displayed.
          </p>
        </footer>
      </div>
    </main>
  );
}