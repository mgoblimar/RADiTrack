"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  PlusCircle,
  Radio,
  Sparkles,
  Tv,
  Zap,
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

type ScenarioId =
  | "stat_ct"
  | "stat_xray"
  | "opd_us"
  | "in_mri";

const SCENARIOS: {
  id: ScenarioId;
  title: string;
  detail: string;
  badge: string;
  tone: "red" | "orange" | "blue" | "navy";
}[] = [
  {
    id: "stat_ct",
    title: "Emergency trauma CT",
    detail: "CT · ER · STAT · 60-min SLA",
    badge: "STAT CT",
    tone: "red",
  },
  {
    id: "stat_xray",
    title: "Acute ER chest radiograph",
    detail: "X-ray · ER · STAT · 30-min SLA",
    badge: "STAT X-Ray",
    tone: "orange",
  },
  {
    id: "opd_us",
    title: "Outpatient abdominal ultrasound",
    detail: "Ultrasound · OPD · Routine · 12-hour SLA",
    badge: "OPD US",
    tone: "blue",
  },
  {
    id: "in_mri",
    title: "Inpatient brain MRI",
    detail: "MRI · Inpatient · Routine · 48-hour SLA",
    badge: "IN MRI",
    tone: "navy",
  },
];

export function SimulatorHub({
  initialQueue,
  totalExamsCount,
}: SimulatorHubProps) {
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customId, setCustomId] = useState("");

  const showToast = (message: string) => {
    setToastMessage(message);

    window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const generateNextId = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCustomId(`ACC-QCGH-${randomSuffix}`);
  };

  const handleSimulateScenario = (scenario: ScenarioId) => {
    startTransition(async () => {
      try {
        const result = await simulateScenarioAction(scenario);

        showToast(`Ingested ${result.identifier}`);
      } catch (error) {
        console.error("Simulation error:", error);
        showToast("Failed to simulate scan.");
      }
    });
  };

  const handleAutoSignOldest = () => {
    startTransition(async () => {
      try {
        const result = await autoSignOldestBacklogAction();

        if (result.success) {
          showToast(
            `Signed off ${result.identifier} · TAT ${result.tatMinutes} mins`,
          );
        } else {
          showToast("No backlog study is available to sign off.");
        }
      } catch (error) {
        console.error("Auto sign error:", error);
        showToast("Failed to sign study.");
      }
    });
  };

  const getTriageClass = (triage: string) => {
    switch (triage) {
      case TriageLevel.ER:
        return "border-qc-red/15 bg-qc-red/5 text-qc-red";

      case TriageLevel.IN:
        return "border-qc-blue/15 bg-qc-blue/5 text-qc-blue";

      case TriageLevel.OPD:
        return "border-slate-200 bg-slate-50 text-slate-500";

      default:
        return "border-slate-200 bg-slate-50 text-slate-500";
    }
  };

  const getUrgencyClass = (urgency: string) => {
    switch (urgency) {
      case UrgencyLevel.STAT:
        return "border-qc-red/15 bg-qc-red/5 text-qc-red";

      case UrgencyLevel.ROUTINE:
        return "border-slate-200 bg-slate-50 text-slate-500";

      default:
        return "border-slate-200 bg-slate-50 text-slate-500";
    }
  };

  const getScenarioClasses = (
    tone: "red" | "orange" | "blue" | "navy",
  ) => {
    switch (tone) {
      case "red":
        return {
          row: "border-qc-red/15 hover:border-qc-red/25 hover:bg-qc-red/[0.035]",
          dot: "bg-qc-red",
          badge: "border-qc-red/15 bg-qc-red/5 text-qc-red",
        };

      case "orange":
        return {
          row: "border-orange-200/60 hover:border-orange-200 hover:bg-orange-50/50",
          dot: "bg-qc-orange",
          badge: "border-orange-200 bg-orange-50 text-qc-orange",
        };

      case "blue":
        return {
          row: "border-qc-blue/15 hover:border-qc-blue/25 hover:bg-qc-blue/[0.035]",
          dot: "bg-qc-blue",
          badge: "border-qc-blue/15 bg-qc-blue/5 text-qc-blue",
        };

      default:
        return {
          row: "border-slate-200 hover:border-qc-blue/15 hover:bg-qc-blue/[0.025]",
          dot: "bg-qc-navy",
          badge: "border-slate-200 bg-slate-50 text-qc-navy",
        };
    }
  };

  return (
    <div className="relative space-y-4">
      {/* =========================================================
          TOAST
          ========================================================= */}
      {toastMessage && (
        <div className="fixed right-5 top-5 z-[60] flex max-w-sm items-center gap-3 rounded-2xl border border-qc-blue/10 bg-white px-4 py-3 text-sm font-bold text-qc-navy shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-qc-yellow/20 text-qc-navy">
            <Sparkles className="h-4 w-4" />
          </span>

          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================
          PAGE HEADER
          ========================================================= */}
      <header className="relative overflow-hidden rounded-[22px] border border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6 py-5 shadow-[0_8px_24px_rgba(5,14,64,0.05)] sm:px-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-qc-yellow/10" />

        <div className="pointer-events-none absolute bottom-0 right-28 h-20 w-20 rounded-full bg-qc-blue/[0.035]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow">
              <Radio className="h-5 w-5" strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                Radiology Operations
              </p>

              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-qc-navy sm:text-[28px]">
                RIS SIMULATOR
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-qc-blue/10 bg-white/70 px-3.5 py-2 text-xs font-extrabold text-qc-navy transition-colors hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>

            <Link
              href="/patient"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-qc-blue/10 bg-white/70 px-3.5 py-2 text-xs font-extrabold text-qc-navy transition-colors hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
            >
              <Tv className="h-3.5 w-3.5" />
              Patient TV
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          PRIMARY WORKSPACE
          ========================================================= */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        {/* MANUAL INGESTION */}
        <section className="overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)]">
          <div className="border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                  Manual entry
                </p>

                <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-qc-navy">
                  Log Examination
                </h2>
              </div>

              <button
                type="button"
                onClick={generateNextId}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-qc-blue/10 bg-white px-3 py-2 text-xs font-extrabold text-qc-blue transition-colors hover:border-qc-blue/20 hover:bg-qc-blue/5"
              >
                Generate ID
              </button>
            </div>
          </div>

          <form
            action={async (formData: FormData) => {
              await createExaminationAction(formData);

              setCustomId("");
              showToast("Scan logged successfully.");
            }}
            className="space-y-4 p-6"
          >
            {/* ACCESSION */}
            <div className="space-y-1.5">
              <label
                htmlFor="simulator-accession"
                className="block text-xs font-extrabold uppercase tracking-[0.08em] text-qc-navy"
              >
                Accession ID
              </label>

              <input
                id="simulator-accession"
                name="examinationIdentifier"
                value={customId}
                onChange={(event) => setCustomId(event.target.value)}
                placeholder="ACC-QCGH-9501"
                required
                className="w-full rounded-xl border border-slate-200 bg-[#FAFBFD] px-3.5 py-3 font-mono text-sm font-semibold text-qc-navy outline-none transition-colors placeholder:text-slate-300 focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
              />
            </div>

            {/* THREE SELECTS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="simulator-modality"
                  className="block text-xs font-extrabold uppercase tracking-[0.08em] text-qc-navy"
                >
                  Modality
                </label>

                <select
                  id="simulator-modality"
                  name="modalityCode"
                  defaultValue={ModalityCode.CT}
                  className="w-full rounded-xl border border-slate-200 bg-[#FAFBFD] px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(MODALITY_CONFIG).map(
                    ([code, config]) => (
                      <option key={code} value={code}>
                        {config.shortName}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="simulator-triage"
                  className="block text-xs font-extrabold uppercase tracking-[0.08em] text-qc-navy"
                >
                  Origin
                </label>

                <select
                  id="simulator-triage"
                  name="triageLevel"
                  defaultValue={TriageLevel.OPD}
                  className="w-full rounded-xl border border-slate-200 bg-[#FAFBFD] px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(TRIAGE_CONFIG).map(
                    ([level, config]) => (
                      <option key={level} value={level}>
                        {config.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="simulator-urgency"
                  className="block text-xs font-extrabold uppercase tracking-[0.08em] text-qc-navy"
                >
                  Urgency
                </label>

                <select
                  id="simulator-urgency"
                  name="urgencyLevel"
                  defaultValue={UrgencyLevel.ROUTINE}
                  className="w-full rounded-xl border border-slate-200 bg-[#FAFBFD] px-3 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
                >
                  {Object.entries(URGENCY_CONFIG).map(
                    ([urgency, config]) => (
                      <option key={urgency} value={urgency}>
                        {config.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* NOTES */}
            <div className="space-y-1.5">
              <label
                htmlFor="simulator-notes"
                className="block text-xs font-extrabold uppercase tracking-[0.08em] text-qc-navy"
              >
                Clinical notes
                <span className="ml-1 font-medium normal-case tracking-normal text-slate-400">
                  (optional)
                </span>
              </label>

              <input
                id="simulator-notes"
                name="notes"
                placeholder="e.g. Query acute intracranial hemorrhage"
                className="w-full rounded-xl border border-slate-200 bg-[#FAFBFD] px-3.5 py-3 text-sm font-medium text-qc-navy outline-none transition-colors placeholder:text-slate-300 focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-qc-yellow px-4 py-3 text-sm font-extrabold text-qc-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />

              {isPending ? "Logging scan…" : "Log Completed Scan"}
            </button>
          </form>
        </section>

        {/* QUICK SCENARIOS */}
        <section className="overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)]">
          <div className="border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6 py-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
              Preset workflows
            </p>

            <h2 className="mt-0.5 text-lg font-extrabold tracking-tight text-qc-navy">
              Quick Scenarios
            </h2>
          </div>

          <div className="space-y-2 p-4">
            {SCENARIOS.map((scenario) => {
              const styles = getScenarioClasses(scenario.tone);

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => handleSimulateScenario(scenario.id)}
                  disabled={isPending}
                  className={`group flex w-full items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${styles.row}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-qc-navy">
                        {scenario.title}
                      </p>

                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        {scenario.detail}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${styles.badge}`}
                  >
                    + {scenario.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-qc-blue/10 px-4 py-4">
            <button
              type="button"
              onClick={handleAutoSignOldest}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-qc-blue px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#14257d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />

              {isPending
                ? "Processing…"
                : "Auto-Sign Oldest Backlog"}
            </button>
          </div>
        </section>
      </section>

      {/* =========================================================
          CURRENT READING QUEUE
          ========================================================= */}
      <section className="overflow-hidden rounded-[22px] border border-qc-blue/10 bg-white shadow-[0_8px_24px_rgba(5,14,64,0.05)]">
        <div className="flex flex-col gap-3 border-b border-qc-blue/10 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
              Reading workflow
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-qc-navy">
                Current Reading Queue
              </h2>

              <span className="rounded-full bg-qc-orange/10 px-2.5 py-1 text-[9px] font-extrabold text-qc-orange">
                {initialQueue.length} active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Total Ingested</span>

            <strong className="text-sm font-extrabold text-qc-navy">
              {totalExamsCount.toLocaleString()}
            </strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-slate-200 bg-[#FAFBFD]">
              <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-qc-blue">
                <th className="px-5 py-3.5">Accession</th>
                <th className="px-5 py-3.5">Modality</th>
                <th className="px-5 py-3.5">Triage</th>
                <th className="px-5 py-3.5">Urgency</th>
                <th className="px-5 py-3.5">Dwell</th>
                <th className="px-5 py-3.5">Target</th>
                <th className="px-5 py-3.5 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {initialQueue.map((item) => (
                <tr
                  key={item.examId}
                  className="transition-colors hover:bg-qc-blue/[0.02]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-qc-navy">
                        {item.identifier}
                      </span>

                      {item.isCarryOver && (
                        <span className="rounded-full bg-qc-blue/5 px-2 py-0.5 text-[9px] font-bold text-qc-blue">
                          Carry-over
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-qc-navy px-2.5 py-1.5 text-[10px] font-extrabold text-qc-yellow">
                      {MODALITY_CONFIG[
                        item.modalityCode as ModalityCode
                      ]?.shortName ?? item.modalityCode}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${getTriageClass(
                        item.triageLevel,
                      )}`}
                    >
                      {item.triageLevel}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${getUrgencyClass(
                        item.urgencyLevel,
                      )}`}
                    >
                      {item.urgencyLevel}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                      <div>
                        <p
                          className={`font-mono text-xs font-extrabold ${
                            item.isBreached
                              ? "text-qc-red"
                              : "text-qc-orange"
                          }`}
                        >
                          {item.dwellMinutes} mins
                        </p>

                        {item.isBreached && (
                          <p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-qc-red">
                            <AlertTriangle className="h-3 w-3" />
                            Breached
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {item.targetTat
                        ? `${item.targetTat} mins`
                        : "No target"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <form action={signOffReportAction}>
                      <input
                        type="hidden"
                        name="examId"
                        value={item.examId}
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-[10px] font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Sign off
                      </button>
                    </form>
                  </td>
                </tr>
              ))}

              {initialQueue.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-qc-blue/5 text-qc-blue">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>

                      <h3 className="mt-3 text-sm font-extrabold text-qc-navy">
                        Reading queue is clear
                      </h3>

                      <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Add a study above to populate the simulated
                        reading workflow.
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