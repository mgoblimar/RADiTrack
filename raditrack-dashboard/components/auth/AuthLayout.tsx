import Image from "next/image";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
}

/** Shared frame for the sign-in and change-password pages. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps & { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[#F7F9FC] lg:grid-cols-[1.05fr_0.95fr]">
      {/* =====================================================
          HOSPITAL BRANDING PANEL
      ===================================================== */}

      <section
        aria-label="Quezon City General Hospital, Department of Radiology"
        className="relative hidden min-h-screen overflow-hidden bg-qc-navy lg:flex"
      >
        {/* Hospital background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/qcgh-background.jpg')",
          }}
        />

        {/* Navy overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(145deg,rgba(0,53,122,0.88)_0%,rgba(0,35,87,0.91)_55%,rgba(5,20,58,0.96)_100%)]"
        />

        {/* Subtle yellow accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-1/4 h-80 w-80 rounded-full bg-qc-yellow/[0.07] blur-3xl"
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-10 py-10 xl:px-12 xl:py-12">

          {/* Hospital identity */}
          <header className="flex items-center gap-3.5">
            <Image
              src="/qcgh-hospital-logo.png"
              alt="Quezon City General Hospital"
              width={54}
              height={54}
              className="h-[50px] w-[50px] shrink-0 rounded-full bg-white p-1 shadow-sm"
            />

            <Image
              src="/qcgh-radiology-logo.png"
              alt="Department of Radiology"
              width={54}
              height={54}
              className="h-[50px] w-[50px] shrink-0 rounded-full bg-white p-1 shadow-sm"
            />

            <div className="ml-1 min-w-0 border-l border-white/20 pl-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">
                Quezon City General Hospital
              </p>

              <p className="mt-0.5 text-base font-extrabold tracking-tight text-white sm:text-lg">
                Department of Radiology
              </p>
            </div>
          </header>

          {/* Main introduction */}
          <div className="max-w-xl py-12">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[3px] w-8 rounded-full bg-qc-yellow" />

              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-qc-yellow">
                RADiTrack
              </p>
            </div>

            <h2 className="max-w-lg text-4xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-[46px]">
              Reporting workload and turnaround time, at a glance.
            </h2>

            <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 xl:text-base">
              Monitor examinations, reading backlog, and SLA
              performance across the Department of Radiology.
            </p>
          </div>

          {/* Footer */}
          <footer className="flex items-center justify-between gap-4 border-t border-white/[0.15] pt-5">
            <p className="text-xs font-medium text-white/55">
              For Department of Radiology staff only.
            </p>
          </footer>
        </div>
      </section>

      {/* =====================================================
          SIGN-IN PANEL
      ===================================================== */}

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#F9FAFD_0%,#F4F6FA_100%)] px-5 py-10 sm:px-8 lg:px-10 xl:px-14">

        {/* Subtle background accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-qc-blue/[0.035] blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-qc-yellow/[0.07] blur-3xl"
        />

        <div className="relative z-10 w-full max-w-[440px]">

          {/* Mobile hospital branding */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Image
              src="/qcgh-hospital-logo.png"
              alt="Quezon City General Hospital"
              width={44}
              height={44}
              className="h-10 w-10 rounded-full border border-[#E4E8F1] bg-white p-0.5"
            />

            <Image
              src="/qcgh-radiology-logo.png"
              alt="Department of Radiology"
              width={44}
              height={44}
              className="h-10 w-10 rounded-full border border-[#E4E8F1] bg-white p-0.5"
            />

            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-qc-navy">
                RADiTrack
              </p>

              <p className="text-xs text-muted-foreground">
                QCGH · Department of Radiology
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-[28px] border border-[#E4E8F1] bg-white px-6 py-8 shadow-[0_12px_40px_rgba(0,53,122,0.055)] sm:px-9 sm:py-10">

            {/* Small brand indicator */}
            <div className="mb-7 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qc-navy text-qc-yellow">
                <Activity
                  className="h-[17px] w-[17px]"
                  strokeWidth={2.2}
                />
              </div>

              <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-qc-blue">
                RADiTrack
              </span>
            </div>

            {/* Page title */}
            <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy">
              {title}
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {subtitle}
            </p>

            {/* Existing authentication form */}
            <div className="mt-8">
              {children}
            </div>

          </div>

          {/* Mobile footer */}
          <p className="mt-5 text-center text-[11px] font-medium text-slate-400 lg:hidden">
            For Department of Radiology staff only.
          </p>

        </div>
      </section>
    </main>
  );
}