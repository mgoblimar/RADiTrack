"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Radio,
  PlusCircle,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Tv,
  Layers,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

import {
  createExaminationAction,
  simulateScenarioAction,
  autoSignOldestBacklogAction,
  signOffReportAction,
} from "@/app/actions";

import {
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
} from "@/lib/enums";

interface SimulatorHubProps {
  initialQueue: any[];
  totalExamsCount: number;
}

export function SimulatorHub({
  initialQueue,
  totalExamsCount,
}: SimulatorHubProps) {
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] =
    useState<string | null>(null);
  const [customId, setCustomId] = useState("");

  // =========================================================
  // Toast feedback
  // =========================================================

  const showToast = (msg: string) => {
    setToastMessage(msg);

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // =========================================================
  // Generate accession ID
  // =========================================================

  const generateNextId = () => {
    const randomSuffix = Math.floor(
      1000 + Math.random() * 9000,
    );

    setCustomId(`ACC-QCGH-${randomSuffix}`);
  };

  // =========================================================
  // Quick simulation scenarios
  // =========================================================

  const handleSimulateScenario = (
    scenario:
      | "stat_ct"
      | "stat_xray"
      | "opd_us"
      | "in_mri",
  ) => {
    startTransition(async () => {
      try {
        const res =
          await simulateScenarioAction(scenario);

        showToast(
          `Ingested scenario scan: ${res.identifier}`,
        );
      } catch (err) {
        console.error("Simulation error:", err);

        showToast("Failed to simulate scan.");
      }
    });
  };

  // =========================================================
  // Automatically sign oldest backlog
  // =========================================================

  const handleAutoSignOldest = () => {
    startTransition(async () => {
      try {
        const res =
          await autoSignOldestBacklogAction();

        if (res.success) {
          showToast(
            `Signed off ${res.identifier} · TAT: ${res.tatMinutes} mins`,
          );
        } else {
  showToast("No backlog study is available to sign off.");
}
      } catch (err) {
        console.error("Auto sign error:", err);

        showToast("Failed to sign study.");
      }
    });
  };

  // =========================================================
  // Visual helpers for queue badges
  // =========================================================

  const getTriageClass = (triage: string) => {
    switch (triage) {
      case TriageLevel.ER:
        return "border-red-200 bg-red-50 text-qc-red";

      case TriageLevel.IN:
        return "border-qc-blue/15 bg-qc-blue/5 text-qc-blue";

      case TriageLevel.OPD:
        return "border-border bg-background text-muted-foreground";

      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case UrgencyLevel.STAT:
        return "border-orange-200 bg-orange-50 text-qc-orange";

      case UrgencyLevel.ROUTINE:
        return "border-border bg-background text-muted-foreground";

      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* =========================================================
          TOAST
          ========================================================= */}

      {toastMessage && (
        <div className="fixed right-5 top-5 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border border-qc-blue/15 bg-card px-4 py-3.5 text-sm font-semibold text-qc-navy shadow-[0_18px_45px_rgba(5,6,64,0.14)] animate-in fade-in slide-in-from-top-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-qc-yellow/25 text-qc-navy">
            <Sparkles className="h-4 w-4" />
          </div>

          <span className="pt-1 leading-relaxed">
            {toastMessage}
          </span>
        </div>
      )}

      {/* =========================================================
          HEADER
          ========================================================= */}

      <header className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow">
              <Radio className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-qc-blue">
                <span className="h-2 w-2 rounded-full bg-qc-yellow" />

                <span>
                  Dedicated ingestion layer · isolated simulator
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-qc-navy sm:text-3xl">
                QCGH RIS & modality simulator
              </h1>

              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Simulate modality acquisitions (T₁) and
                radiologist sign-offs (T₂) to test RADiTrack
                turnaround-time monitoring workflows.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-qc-navy transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>

            <Link
              href="/patient"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-qc-navy transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue"
            >
              <Tv className="h-4 w-4" />
              Patient TV
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          PRIMARY SIMULATION WORKSPACE
          ========================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* =======================================================
            MANUAL INGESTION
            ======================================================= */}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-7 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-yellow/25 text-qc-navy">
                <PlusCircle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-qc-navy">
                  Manual examination ingestion
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Record examination completion to initialize
                  the TAT workflow at T₁.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateNextId}
              className="inline-flex w-fit items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-qc-blue transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5"
            >
              Auto-generate ID
            </button>
          </div>

          <form
            action={async (formData: FormData) => {
              await createExaminationAction(formData);

              setCustomId("");

              showToast(
                "Scan logged successfully into the active queue.",
              );
            }}
            className="mt-5 space-y-5"
          >
            {/* Accession */}
            <div className="space-y-2">
              <label
                htmlFor="simulator-accession"
                className="block text-sm font-bold text-qc-navy"
              >
                Accession identifier
              </label>

              <input
                id="simulator-accession"
                name="examinationIdentifier"
                value={customId}
                onChange={(e) =>
                  setCustomId(e.target.value)
                }
                placeholder="e.g. ACC-QCGH-9501"
                required
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 font-mono text-sm font-semibold text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/30 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
              />
            </div>

            {/* Modality / Triage / Urgency */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="simulator-modality"
                  className="block text-sm font-bold text-qc-navy"
                >
                  Modality
                </label>

                <select
                  id="simulator-modality"
                  name="modalityCode"
                  defaultValue={ModalityCode.CT}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(
                    MODALITY_CONFIG,
                  ).map(([code, config]) => (
                    <option
                      key={code}
                      value={code}
                    >
                      {config.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="simulator-triage"
                  className="block text-sm font-bold text-qc-navy"
                >
                  Triage origin
                </label>

                <select
                  id="simulator-triage"
                  name="triageLevel"
                  defaultValue={TriageLevel.OPD}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(
                    TRIAGE_CONFIG,
                  ).map(([level, config]) => (
                    <option
                      key={level}
                      value={level}
                    >
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="simulator-urgency"
                  className="block text-sm font-bold text-qc-navy"
                >
                  Urgency
                </label>

                <select
                  id="simulator-urgency"
                  name="urgencyLevel"
                  defaultValue={
                    UrgencyLevel.ROUTINE
                  }
                  className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(
                    URGENCY_CONFIG,
                  ).map(([urgency, config]) => (
                    <option
                      key={urgency}
                      value={urgency}
                    >
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label
                htmlFor="simulator-notes"
                className="block text-sm font-bold text-qc-navy"
              >
                Clinical notes / indication
                <span className="ml-1 font-medium text-muted-foreground">
                  (optional)
                </span>
              </label>

              <input
                id="simulator-notes"
                name="notes"
                placeholder="e.g. Query acute intracranial hemorrhage"
                className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-medium text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/30 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-4 py-3 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />

              {isPending
                ? "Logging scan…"
                : "Log completed scan (T₁)"}
            </button>
          </form>
        </section>

        {/* =======================================================
            QUICK SCENARIOS
            ======================================================= */}

        <section className="flex flex-col rounded-3xl border border-border bg-card p-5 shadow-sm lg:col-span-5 sm:p-6">
          <div className="border-b border-border pb-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
                <Zap className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-extrabold text-qc-navy">
                  Quick simulation scenarios
                </h2>

                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Inject common workflow scenarios into the
                  database with one click.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {/* STAT CT */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScenario(
                  "stat_ct",
                )
              }
              disabled={isPending}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-extrabold text-qc-navy">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-qc-red" />
                  Emergency trauma CT
                </div>

                <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  CT · ER · STAT · 60-minute SLA
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[10px] font-extrabold text-qc-red">
                + STAT CT
              </span>
            </button>

            {/* STAT X-RAY */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScenario(
                  "stat_xray",
                )
              }
              disabled={isPending}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-qc-navy">
                  Acute ER chest radiograph
                </div>

                <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  X-ray · ER · STAT · 30-minute SLA
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-[10px] font-extrabold text-qc-orange">
                + STAT X-Ray
              </span>
            </button>

            {/* OPD US */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScenario(
                  "opd_us",
                )
              }
              disabled={isPending}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-qc-blue/10 bg-qc-blue/5 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-qc-blue/20 hover:bg-qc-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-qc-navy">
                  Outpatient abdominal ultrasound
                </div>

                <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Ultrasound · OPD · routine · 12-hour SLA
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-qc-blue/15 bg-qc-blue/10 px-2.5 py-1 text-[10px] font-extrabold text-qc-blue">
                + OPD US
              </span>
            </button>

            {/* IN MRI */}
            <button
              type="button"
              onClick={() =>
                handleSimulateScenario(
                  "in_mri",
                )
              }
              disabled={isPending}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-qc-blue/20 hover:bg-qc-blue/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-qc-navy">
                  Inpatient brain MRI
                </div>

                <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  MRI · inpatient · routine · 48-hour SLA
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-extrabold text-qc-navy">
                + IN MRI
              </span>
            </button>
          </div>

          {/* Auto Sign */}
          <div className="mt-auto border-t border-border pt-5">
            <button
              type="button"
              onClick={handleAutoSignOldest}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-qc-blue px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#14257d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />

              {isPending
                ? "Processing…"
                : "Auto-sign oldest backlog study (T₂)"}
            </button>
          </div>
        </section>
      </div>

      {/* =========================================================
          LIVE READING QUEUE
          ========================================================= */}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-yellow/20 text-qc-navy">
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-qc-navy">
                  Current reading queue
                </h2>

                <span className="rounded-full bg-qc-orange/10 px-2.5 py-1 text-[10px] font-extrabold text-qc-orange">
                  {initialQueue.length} active
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Studies currently awaiting radiologist report
                sign-off.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />

            Total ingested:
            <strong className="font-extrabold text-qc-navy">
              {totalExamsCount}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="border-b border-border bg-background">
              <tr className="text-[11px] font-bold text-muted-foreground">
                <th className="px-4 py-3.5">
                  Accession ID
                </th>

                <th className="px-4 py-3.5">
                  Modality
                </th>

                <th className="px-4 py-3.5">
                  Triage
                </th>

                <th className="px-4 py-3.5">
                  Urgency
                </th>

                <th className="px-4 py-3.5">
                  Current dwell
                </th>

                <th className="px-4 py-3.5">
                  Target SLA
                </th>

                <th className="px-4 py-3.5 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {initialQueue.map((item) => (
                <tr
                  key={item.examId}
                  className="transition-colors hover:bg-qc-blue/[0.025]"
                >
                  {/* Accession */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-qc-navy">
                        {item.identifier}
                      </span>

                      {item.isCarryOver && (
                        <span className="rounded-full border border-qc-blue/15 bg-qc-blue/5 px-2 py-0.5 text-[10px] font-bold text-qc-blue">
                          Carry-over
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Modality */}
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-qc-navy">
                      {MODALITY_CONFIG[
                        item.modalityCode as ModalityCode
                      ]?.shortName ??
                        item.modalityCode}
                    </span>
                  </td>

                  {/* Triage */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getTriageClass(
                        item.triageLevel,
                      )}`}
                    >
                      {item.triageLevel}
                    </span>
                  </td>

                  {/* Urgency */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getUrgencyClass(
                        item.urgencyLevel,
                      )}`}
                    >
                      {item.urgencyLevel}
                    </span>
                  </td>

                  {/* Dwell */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-xs font-extrabold ${
                          item.isBreached
                            ? "text-qc-red"
                            : "text-qc-orange"
                        }`}
                      >
                        {item.dwellMinutes} mins
                      </span>

                      {item.isBreached && (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-qc-red">
                          <AlertTriangle className="h-3 w-3" />
                          SLA breached
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Target */}
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {item.targetTat
                        ? `${item.targetTat} mins`
                        : "No target"}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 text-right">
                    <form
                      action={signOffReportAction}
                    >
                      <input
                        type="hidden"
                        name="examId"
                        value={item.examId}
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-xs font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d]"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sign off (T₂)
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {/* Empty queue */}
              {initialQueue.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>

                      <h3 className="mt-4 text-base font-extrabold text-qc-navy">
                        No active studies
                      </h3>

                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        Use the ingestion form or a quick
                        scenario above to add a study to the
                        simulated reading queue.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}