
"use client";

import Image from "next/image";

import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Radio,
  Settings2,
  Tv,
  type LucideIcon,
} from "lucide-react";

interface HospitalHeaderProps {
  pageTitle: string;
  asOfDate?: string;
  lastUpdatedTime?: string;
  className?: string;
  variant?: "default" | "patient-display";
}

const PAGE_ICONS: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Examinations: ClipboardList,
  Configurations: Settings2,
  "Patient TV": Tv,
  "RIS Simulator": Radio,
};

export function HospitalHeader({
  pageTitle,
  asOfDate,
  lastUpdatedTime,
  className = "",
  variant = "default",
}: HospitalHeaderProps) {
  const PageIcon = PAGE_ICONS[pageTitle] ?? Building2;
  const isPatientDisplay = variant === "patient-display";

  return (
    <header
      aria-label={`Quezon City General Hospital Department of Radiology — ${pageTitle}`}
      className={`relative isolate overflow-hidden rounded-[22px] border shadow-[0_5px_20px_rgba(0,53,122,0.10)] ${
        isPatientDisplay
          ? "border-white/15 bg-[#00357a] text-white"
          : "border-[#DDE3F2]/90 bg-white/95"
      } ${className}`}
    >
      {/* TOP BRAND ACCENT */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-[3px] ${
          isPatientDisplay
            ? "bg-[#ffd230]"
            : "bg-gradient-to-r from-qc-blue via-qc-yellow to-qc-blue"
        }`}
      />

      {/* BACKGROUND DECORATIONS */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-20 -top-24 z-0 h-56 w-56 rounded-full blur-3xl ${
          isPatientDisplay ? "bg-white/[0.07]" : "bg-qc-blue/[0.035]"
        }`}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-24 -left-20 z-0 h-56 w-56 rounded-full blur-3xl ${
          isPatientDisplay ? "bg-qc-yellow/[0.09]" : "bg-qc-yellow/[0.07]"
        }`}
      />

      {isPatientDisplay ? (
        /* =====================================================
           PATIENT TV HEADER
           Three equal columns keep the center truly centered.
        ===================================================== */
        <div className="relative z-10 grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-5 sm:py-3.5 lg:px-6">
          {/* LEFT: HOSPITAL LOGOS */}
          <div className="flex items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-white/30 bg-white p-1.5 shadow-sm sm:h-[58px] sm:w-[58px] lg:h-[62px] lg:w-[62px]">
              <Image
                src="/qcgh-hospital-logo.png"
                alt="Quezon City General Hospital logo"
                width={76}
                height={76}
                priority
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-white/30 bg-white p-1.5 shadow-sm sm:h-[58px] sm:w-[58px] lg:h-[62px] lg:w-[62px]">
              <Image
                src="/qcgh-radiology-logo.png"
                alt="Quezon City General Hospital Department of Radiology logo"
                width={76}
                height={76}
                priority
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* CENTER: HOSPITAL IDENTITY */}
          <div className="min-w-0 text-center sm:min-w-[360px]">
            <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/80 sm:text-[10px] sm:tracking-[0.17em]">
              Quezon City General Hospital
            </p>

            <h1 className="mt-1 text-[15px] font-black leading-tight tracking-tight text-white sm:text-lg md:text-xl">
              Department of Radiology
            </h1>

            <p className="mt-1 hidden text-[10px] font-medium leading-snug text-white/65 sm:block sm:text-[11px]">
              Radiology Activity, Turnaround-Time, and Workload Monitoring System
            </p>
          </div>

          {/* RIGHT: DATE AND LIVE STATUS */}
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 sm:justify-end">
            {asOfDate && (
              <div className="min-w-0 text-center sm:text-right">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-white/55">
                  As of today
                </p>

                <p className="text-xs font-bold text-white">
                  {asOfDate}
                </p>
              </div>
            )}

            {lastUpdatedTime && (
              <div className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.10] px-3.5 py-2">
                {/* PROMINENT RED LIVE DOT */}
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-3 w-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] ring-2 ring-red-300/40" />
                </span>

                <span className="whitespace-nowrap text-[11px] font-black tracking-wide text-white">
                  LIVE
                </span>

                <span className="h-4 w-px bg-white/25" />

                <span className="whitespace-nowrap text-[10px] font-semibold text-white/80">
                  {lastUpdatedTime}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =====================================================
           STANDARD HEADER FOR OTHER TABS
        ===================================================== */
        <div className="relative z-10 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-3.5 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:px-5 sm:py-3.5 lg:px-6">
          {/* HOSPITAL LOGOS */}
          <div className="flex shrink-0 items-center justify-center gap-2.5 sm:gap-3">
            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-[#E7EAF2] bg-white p-1.5 shadow-sm sm:h-[58px] sm:w-[58px] lg:h-[62px] lg:w-[62px]">
              <Image
                src="/qcgh-hospital-logo.png"
                alt="Quezon City General Hospital logo"
                width={76}
                height={76}
                priority
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex h-[50px] w-[50px] items-center justify-center rounded-xl border border-[#E7EAF2] bg-white p-1.5 shadow-sm sm:h-[58px] sm:w-[58px] lg:h-[62px] lg:w-[62px]">
              <Image
                src="/qcgh-radiology-logo.png"
                alt="Quezon City General Hospital Department of Radiology logo"
                width={76}
                height={76}
                priority
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* HOSPITAL IDENTITY */}
          <div className="min-w-0 text-center">
            <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.14em] text-qc-blue sm:text-[10px] sm:tracking-[0.17em]">
              Quezon City General Hospital
            </p>

            <h1 className="mt-1 text-[15px] font-black leading-tight tracking-tight text-qc-blue sm:text-lg md:text-xl">
              Department of Radiology
            </h1>

            <p className="mt-1 hidden text-[10px] font-medium leading-snug text-slate-500 sm:block sm:text-[11px]">
              Radiology Activity, Turnaround-Time, and Workload Monitoring System
            </p>
          </div>

          {/* PAGE INDICATOR AND INFORMATION */}
          <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-center gap-2 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
            <div
              aria-label={`Current page: ${pageTitle}`}
              className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-[#DCE4F8] bg-[#F4F7FF] px-3.5 py-2 text-qc-blue"
            >
              <PageIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
                strokeWidth={2.2}
              />

              <span className="truncate text-xs font-extrabold sm:text-[13px]">
                {pageTitle}
              </span>
            </div>

            {(asOfDate || lastUpdatedTime) && (
              <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
                {asOfDate && (
                  <div className="hidden text-right md:block">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                      As of today
                    </p>
                    <p className="text-xs font-bold text-qc-blue">
                      {asOfDate}
                    </p>
                  </div>
                )}

                {lastUpdatedTime && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>

                    <span className="whitespace-nowrap text-[10px] font-extrabold text-emerald-800">
                      Live · {lastUpdatedTime}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
