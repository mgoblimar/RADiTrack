"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";

import {
  getDatasetStatusAction,
  loadTestDatasetAction,
  restoreRealDataAction,
  type DatasetStatus,
} from "@/app/actions";

import { notifyDatabaseChanged } from "@/lib/broadcast";

export const TEST_WORKBOOK_URL =
  "/test-data/raditrack-test-dataset.xlsx";

interface TestDataPanelProps {
  initialStatus: DatasetStatus;
}

/** Switches the whole app between real data and the 100-exam validation dataset. */
export function TestDataPanel({
  initialStatus,
}: TestDataPanelProps) {
  const router = useRouter();

  const [status, setStatus] = useState(initialStatus);

  const [message, setMessage] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const run = (
    action: () => Promise<{
      success: boolean;
      count?: number;
      error?: string;
    }>,
    okText: (n: number) => string,
  ) => {
    startTransition(async () => {
      const result = await action();

      setMessage(
        result.success
          ? {
              tone: "ok",
              text: okText(result.count ?? 0),
            }
          : {
              tone: "error",
              text: result.error ?? "Something went wrong.",
            },
      );

      setStatus(await getDatasetStatusAction());

      notifyDatabaseChanged();
      router.refresh();
    });
  };

  const handleLoad = () => {
    const confirmed = window.confirm(
      status.isTestActive
        ? "Reload the 100-exam test dataset with dates relative to today? The saved real data stays in the backup."
        : "Back up the current exams and reports, then replace them with the 100-exam test dataset? You can restore the real data afterwards.",
    );

    if (confirmed) {
      run(
        loadTestDatasetAction,
        (n) =>
          `Loaded ${n} test exams. Real data is safe in the backup.`,
      );
    }
  };

  const handleRestore = () => {
    if (
      window.confirm(
        "Remove the test data and restore the real exams and reports from the backup?",
      )
    ) {
      run(
        restoreRealDataAction,
        (n) =>
          `Restored ${n} real exams. Test mode is off.`,
      );
    }
  };

  return (
    <section
      aria-labelledby="test-data-heading"
      className={`overflow-hidden rounded-[22px] border p-5 shadow-[0_8px_24px_rgba(5,14,64,0.05)] sm:p-6 ${
        status.isTestActive
          ? "border-amber-400/50 bg-amber-50/60"
          : "border-qc-blue/15 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id="test-data-heading"
              className="text-sm font-extrabold uppercase tracking-[0.1em] text-qc-navy"
            >
              Test data &amp; calculation check
            </h2>

            {status.isTestActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Test data active ({status.activeCount} exams)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-qc-blue/20 bg-qc-blue/5 px-3 py-0.5 text-xs font-bold text-qc-navy">
                <span className="h-2 w-2 rounded-full bg-qc-blue" />
                Real data active ({status.activeCount} exams)
              </span>
            )}
          </div>

          <p className="max-w-3xl text-xs text-slate-600">
            {status.isTestActive
              ? `The ${status.backupCount} real exams are saved in a backup. Every screen and report now shows the test dataset. Restore when you finish testing.`
              : "Load the 100-exam validation dataset to check that RADiTrack's numbers match the expected results in the workbook. Real exams are backed up first and can be restored with one click."}
          </p>

          {message && (
            <p
              role="status"
              className={`text-xs font-bold ${
                message.tone === "ok"
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isPending}
            onClick={handleLoad}
            className="inline-flex items-center gap-2 rounded-xl bg-qc-navy px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-qc-blue disabled:opacity-50"
          >
            <Database
              className={`h-4 w-4 text-qc-yellow ${
                isPending ? "animate-pulse" : ""
              }`}
            />

            {status.isTestActive
              ? "Reload test dataset"
              : "Load 100-exam test dataset"}
          </button>

          {status.isTestActive && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleRestore}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-white px-4 py-2.5 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-amber-700" />
              Restore real data
            </button>
          )}

          <a
            href={TEST_WORKBOOK_URL}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            Test workbook (.xlsx)
          </a>
        </div>
      </div>
    </section>
  );
}