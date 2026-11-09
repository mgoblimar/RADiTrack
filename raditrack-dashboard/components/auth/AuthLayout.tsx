import Image from "next/image";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared frame for the sign-in and change-password pages. */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-qc-surface lg:grid-cols-[1.1fr_1fr]">
      {/* Hospital panel: photo under a navy wash; hidden on phones to keep the form first */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-qc-navy lg:block"
        style={{
          backgroundImage: "url('/qcgh-background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(5,6,64,0.92)_0%,rgba(24,41,140,0.86)_55%,rgba(5,6,64,0.95)_100%)]" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-qc-yellow/10 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <Image src="/qcgh-hospital-logo.png" alt="" width={52} height={52} className="rounded-full bg-white p-0.5" />
            <Image src="/qcgh-radiology-logo.png" alt="" width={52} height={52} className="rounded-full bg-white p-0.5" />
            <div className="ml-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Quezon City General Hospital</p>
              <p className="text-lg font-extrabold">Department of Radiology</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-qc-yellow">RADiTrack</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">
              Reporting workload and turnaround time, at a glance.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Department-level monitoring of examinations, backlog and SLA compliance. No patient
              names or identifiers are shown.
            </p>
          </div>

          <p className="text-xs text-white/40">For Department of Radiology staff only.</p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow">
              <Activity className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-base font-extrabold text-qc-navy">RADiTrack</p>
              <p className="text-xs text-muted-foreground">QCGH Department of Radiology</p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-qc-navy">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
