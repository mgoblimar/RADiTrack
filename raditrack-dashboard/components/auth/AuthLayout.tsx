import Image from "next/image";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared frame for the sign-in and change-password pages. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
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

        {/* Subtle brand accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-1/4 h-80 w-80 rounded-full bg-qc-yellow/[0.07] blur-3xl"
        />

        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-10 py-10 xl:px-12 xl:py-12">

          {/* =================================================
              HOSPITAL IDENTITY
          ================================================= */}

          <header className="flex items-center gap-4 xl:gap-5">
            <Image
              src="/qcgh-hospital-logo.png"
              alt="Quezon City General Hospital"
              width={72}
              height={72}
              className="h-[66px] w-[66px] shrink-0 rounded-full bg-white p-1 shadow-md xl:h-[72px] xl:w-[72px]"
              priority
            />

            <Image
              src="/qcgh-radiology-logo.png"
              alt="Department of Radiology"
              width={72}
              height={72}
              className="h-[66px] w-[66px] shrink-0 rounded-full bg-white p-1 shadow-md xl:h-[72px] xl:w-[72px]"
              priority
            />

            <div className="min-w-0 border-l border-white/25 pl-4 xl:pl-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/75 xl:text-[13px]">
                Quezon City General Hospital
              </p>

              <p className="mt-1 text-lg font-extrabold leading-tight tracking-tight text-white xl:text-[21px]">
                Department of Radiology
              </p>
            </div>
          </header>

          {/* =================================================
              PROJECT INTRODUCTION
          ================================================= */}

          <div className="max-w-xl py-12">
            <p className="text-sm font-extrabold tracking-[0.04em] text-qc-yellow">
              RADiTrack
            </p>

            <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.16] tracking-tight text-white xl:text-[44px]">
              Improving the efficiency and timeliness of radiology reporting.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 xl:text-base">
              RADiTrack monitors examinations from completion
              to report sign-off, calculates turnaround time,
              and tracks reading backlogs and SLA compliance.
              It helps the Department identify reporting delays
              and make informed operational decisions.
            </p>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <footer className="flex items-center justify-between gap-4 border-t border-white/[0.15] pt-5">
            <p className="text-xs font-medium text-white/60">
              For Department of Radiology staff only.
            </p>
          </footer>

        </div>
      </section>

      {/* =====================================================
          SIGN-IN PANEL
      ===================================================== */}

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(145deg,#F9FAFD_0%,#F4F6FA_65%,#FFF9F0_100%)] px-5 py-10 sm:px-8 lg:px-10 xl:px-14">

        {/* Background accents */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-qc-blue/[0.045] blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-qc-yellow/[0.09] blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1/4 right-0 h-56 w-56 rounded-full bg-[#7A0000]/[0.025] blur-3xl"
        />

        <div className="relative z-10 w-full max-w-[450px]">

          {/* =================================================
              MOBILE HOSPITAL BRANDING
          ================================================= */}

          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Image
              src="/qcgh-hospital-logo.png"
              alt="Quezon City General Hospital"
              width={48}
              height={48}
              className="h-11 w-11 rounded-full border border-[#E4E8F1] bg-white p-0.5"
            />

            <Image
              src="/qcgh-radiology-logo.png"
              alt="Department of Radiology"
              width={48}
              height={48}
              className="h-11 w-11 rounded-full border border-[#E4E8F1] bg-white p-0.5"
            />

            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-qc-blue">
                Quezon City General Hospital
              </p>

              <p className="mt-0.5 text-sm font-extrabold text-qc-navy">
                Department of Radiology
              </p>
            </div>
          </div>

          {/* =================================================
              SIGN-IN CARD
          ================================================= */}

          <div className="relative overflow-hidden rounded-[28px] border border-[#E4E8F1] bg-white shadow-[0_16px_48px_rgba(0,53,122,0.07)]">

            {/* Blue, yellow and red top accent */}
            <div
              aria-hidden="true"
              className="h-[4px] w-full bg-[linear-gradient(90deg,#00357a_0%,#2d3e9d_40%,#ffd230_72%,#7a0000_100%)]"
            />

            <div className="px-6 py-8 sm:px-9 sm:py-10">

              {/* Page heading */}
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy sm:text-[34px]">
                  {title}
                </h1>

                <div className="mt-3 flex items-center gap-2">
                  <span className="h-1 w-7 rounded-full bg-qc-yellow" />
                  <span className="h-1 w-3 rounded-full bg-qc-blue" />
                  <span className="h-1 w-2 rounded-full bg-qc-red" />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-500">
                  {subtitle}
                </p>
              </div>

              {/* Existing authentication form */}
              <div className="mt-8">
                {children}
              </div>

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