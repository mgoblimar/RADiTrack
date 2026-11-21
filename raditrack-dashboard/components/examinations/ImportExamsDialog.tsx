"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  History,
  Loader2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import {
  addImportRadiologistsAction,
  commitExamImportAction,
  listImportBatchesAction,
  previewExamImportAction,
  type ImportBatchSummary,
  type ImportMode,
  type ImportPreview,
} from "@/app/actions";
import type { PlanRow } from "@/lib/import-plan";
import { MODALITY_CONFIG, TRIAGE_CONFIG, type ModalityCode, type TriageLevel } from "@/lib/enums";
import { notifyDatabaseChanged } from "@/lib/broadcast";
import { csvLine } from "@/lib/csv";
import { HEADER_ROW_RULE, MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_LABEL } from "@/lib/import-limits";
import { describeChanges, UPLOAD_STATUS_LABELS, uploadChangesSummary, uploadStatusTone } from "@/lib/audit-display";

const TEMPLATE_URL = "/test-data/raditrack-test-dataset.xlsx";
const PREVIEW_ROWS = 6;
const LISTED_PROBLEMS = 50;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Upload → preview → choose "add" or "load as test data" → import. */
export function ImportExamsButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-border bg-background px-4 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue"
      >
        <Upload className="h-4 w-4 text-qc-blue" />
        <span className="whitespace-nowrap">Import exams</span>
      </button>
      {isOpen && typeof document !== "undefined" && createPortal(<ImportDialog onClose={() => setIsOpen(false)} />, document.body)}
    </>
  );
}

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [applyAmendments, setApplyAmendments] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<
    "idle" | "reading" | "ready" | "importing" | "complete" | "error"
  >("idle");

  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = (targetMax: number, stage: "reading" | "importing") => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(15);
    setProgressStage(stage);

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= targetMax) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return targetMax;
        }
        const diff = targetMax - prev;
        const step = Math.max(1, Math.round(diff * 0.15));
        return Math.min(targetMax, prev + step);
      });
    }, 180);
  };

  const finishProgress = (stage: "ready" | "complete" | "error") => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(100);
    setProgressStage(stage);
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Reads `chosen` and shows what importing it would do. Re-run after adding radiologists. */
  const runPreview = (chosen: File, note?: string) => {
    setPreview(null);
    setApplyAmendments(false);
    // Checked here so an oversized file never reaches the server (its 1 MB limit gives an error page).
    if (chosen.size > MAX_IMPORT_FILE_BYTES) {
      setMessage({ tone: "error", text: `${chosen.name} is ${formatFileSize(chosen.size)}; the limit is ${MAX_IMPORT_FILE_LABEL}. Split it into smaller files and upload them one at a time.` });
      setProgress(100);
      setProgressStage("error");
      return;
    }
    setMessage(note ? { tone: "ok", text: note } : null);
    startProgress(90, "reading");
    const formData = new FormData();
    formData.append("file", chosen);
    startTransition(async () => {
      try {
        const result = await previewExamImportAction(formData);
        if ("error" in result) {
          setMessage({ tone: "error", text: result.error });
          finishProgress("error");
        } else {
          setPreview(result);
          finishProgress("ready");
        }
      } catch {
        setMessage({ tone: "error", text: "Failed to read file." });
        finishProgress("error");
      }
    });
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    if (!chosen) return;
    setFile(chosen);
    runPreview(chosen);
    event.target.value = "";
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    if (isPending) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const lowerName = droppedFile.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
      setMessage({
        tone: "error",
        text: "Please upload an Excel workbook (.xlsx) or CSV (.csv) file.",
      });
      return;
    }

    setFile(droppedFile);
    runPreview(droppedFile);
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;
    setFile(null);
    setPreview(null);
    setProgress(0);
    setProgressStage("idle");
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addRadiologists = (names: string[]) => {
    if (!file) return;
    startProgress(90, "reading");
    startTransition(async () => {
      try {
        const result = await addImportRadiologistsAction(names);
        if (!result.success) {
          setMessage({ tone: "error", text: result.error ?? "Could not add the radiologists." });
          finishProgress("error");
          return;
        }
        const added = result.added ?? [];
        runPreview(file, added.length ? `Added ${added.join(", ")} as radiologist(s). The file was checked again.` : "Already in RADiTrack. The file was checked again.");
      } catch {
        setMessage({ tone: "error", text: "Could not add the radiologists." });
        finishProgress("error");
      }
    });
  };

  const blocking = preview ? preview.errors : [];
  const hasRadiologist = !!preview?.records.some((r) => r.radiologistName);
  const counts = preview?.plan.counts;
  const hasWork = mode === "test"
    ? (preview?.records.length ?? 0) > 0
    : !!counts && counts.insert + counts.update + counts.amend + counts.refused > 0;
  const canImport = !!preview && blocking.length === 0 && hasWork;
  const hasProblems = blocking.length > 0;
  // UPL-30: only say "Ready to import" when the Import button will actually work.
  const readyText = !preview
    ? "Ready"
    : hasProblems
      ? `${blocking.length === 1 ? "1 row needs" : `${blocking.length} rows need`} fixing · Nothing can be imported until it is fixed`
      : !hasWork
        ? `${preview.records.length} examinations checked · No changes to import`
        : `${preview.records.length} examinations verified · Ready to import`;

  const handleImport = () => {
    if (!preview) return;
    if (mode === "test" && !window.confirm(
      `Back up all current exams and reports, then replace them with these ${preview.records.length} exams as test data? Restore the real data from the RIS Simulator page when you finish.`,
    )) return;
    startProgress(95, "importing");
    startTransition(async () => {
      try {
        const result = await commitExamImportAction(preview.records, mode, {
          fileName: preview.fileName,
          rowsInFile: preview.totalRows,
          errorRows: preview.errors.length,
        }, { applyAmendments });
        setHistoryVersion((v) => v + 1);
        if (!result.success) {
          setMessage({ tone: "error", text: result.error ?? "Import failed. Nothing was saved." });
          finishProgress("error");
          return;
        }
        finishProgress("complete");
        const b = result.batch;
        const done = mode === "test"
          ? `Loaded ${result.count} exams as test data. Real data is backed up.`
          : b
            ? `Added ${b.inserted}, updated ${b.updated}, amended ${b.amended}, unchanged ${b.unchanged}, refused ${b.refused}.`
            : `Imported ${result.count} exams.`;
        const source = result.batch
          ? ` File: ${result.batch.fileName} · ${fmt(result.batch.uploadedAt)} · by ${result.batch.uploadedBy}.`
          : "";
        setMessage({ tone: "ok", text: done + source });
        setPreview(null);
        notifyDatabaseChanged();
        router.refresh();
      } catch {
        setMessage({ tone: "error", text: "Import operation encountered an unexpected error." });
        finishProgress("error");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex justify-center overflow-y-auto bg-qc-navy/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="my-auto w-full max-w-3xl shrink-0 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_rgba(5,14,64,0.25)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow"><FileUp className="h-5 w-5" /></div>
            <div>
              <h2 id="import-title" className="text-lg font-extrabold text-qc-navy">Import exams</h2>
              <p className="text-xs text-muted-foreground">
                Upload an Excel workbook (.xlsx, sheet &ldquo;Exams&rdquo;) or a CSV. Nothing is saved until you press Import.{" "}
                <a href={TEMPLATE_URL} download className="font-bold text-qc-blue underline underline-offset-2">Download the template / test dataset</a>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-qc-navy"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-5">
          <div
            role="button"
            tabIndex={isPending ? -1 : 0}
            aria-label="Upload exams file: drag and drop an Excel or CSV file here, or click to browse"
            onClick={() => {
              if (!isPending && !file) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (!isPending && !file && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all duration-200 ${
              isDragging
                ? "border-qc-blue bg-qc-blue/10 scale-[1.01] ring-4 ring-qc-blue/15"
                : file
                  ? "border-border bg-background"
                  : "cursor-pointer border-border bg-background hover:border-qc-blue/40 hover:bg-qc-blue/[0.02]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={handleFile}
              disabled={isPending}
            />

            {isDragging ? (
              <div className="flex flex-col items-center gap-2 py-3 pointer-events-none">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qc-blue text-white shadow-md animate-bounce">
                  <FileUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-qc-blue">Drop file here to upload</p>
                  <p className="text-xs text-muted-foreground">Release to process .xlsx or .csv</p>
                </div>
              </div>
            ) : !file ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-qc-navy">Choose a file or drag and drop</span>
                  <p className="text-xs text-muted-foreground">Excel workbook (.xlsx) or CSV (.csv), up to {MAX_IMPORT_FILE_LABEL}</p>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-qc-navy" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {progressStage === "reading" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-qc-blue/10 px-2.5 py-1 text-xs font-bold text-qc-blue">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Reading ({Math.round(progress)}%)
                      </span>
                    )}
                    {progressStage === "importing" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-qc-blue/10 px-2.5 py-1 text-xs font-bold text-qc-blue">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importing ({Math.round(progress)}%)
                      </span>
                    )}
                    {progressStage === "ready" && hasProblems && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Needs fixing
                      </span>
                    )}
                    {progressStage === "ready" && !hasProblems && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Ready
                      </span>
                    )}
                    {progressStage === "complete" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    )}
                    {progressStage === "error" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      disabled={isPending}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-qc-navy disabled:opacity-50"
                      title="Replace with another file"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      disabled={isPending}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-red-700 disabled:opacity-50"
                      title="Remove file"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ease-out ${
                        progressStage === "error"
                          ? "bg-red-600"
                          : progressStage === "complete"
                            ? "bg-emerald-600"
                            : "bg-qc-blue"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {progressStage === "reading" && "Reading and validating examinations…"}
                      {progressStage === "ready" && readyText}
                      {progressStage === "importing" && "Importing examinations into database…"}
                      {progressStage === "complete" && "Import completed successfully"}
                      {progressStage === "error" && "Validation or import error"}
                      {progressStage === "idle" && "Ready"}
                    </span>
                    <span className="font-mono font-bold">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                  Drag &amp; drop another file here or click &ldquo;Change&rdquo; to replace
                </p>
              </div>
            )}
          </div>

          <p className="flex items-start gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs text-slate-600">
            <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-qc-blue" />
            <span><span className="font-extrabold text-qc-navy">File layout:</span> {HEADER_ROW_RULE} Blank rows below the headers are skipped.</span>
          </p>

          {preview && (
            <>
              {mode === "append" && counts ? (
                <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  <Stat label="New" value={counts.insert} tone="ok" />
                  <Stat label="Updated" value={counts.update} tone="ok" />
                  <Stat label="Unchanged" value={counts.unchanged} />
                  <Stat label="Amendments" value={counts.amend} />
                  <Stat label="Refused" value={counts.refused} tone={counts.refused ? "error" : undefined} />
                  <Stat label="Problems" value={blocking.length} tone={blocking.length ? "error" : undefined} />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Rows in file" value={preview.totalRows} />
                  <Stat label="Ready to import" value={preview.records.length} tone="ok" />
                  <Stat label="Problems" value={blocking.length} tone={blocking.length ? "error" : undefined} />
                </div>
              )}

              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">How to import</legend>
                <ModeOption checked={mode === "append"} onChange={() => setMode("append")} title="Add or update" text={`Adds new exams and updates exams not yet signed off. Signed-off exams change only within ${preview.plan.windowDays} days of sign-off, and only if you confirm.`} />
                <ModeOption checked={mode === "test"} onChange={() => setMode("test")} title="Load as test data" text="Backs up real exams, replaces them with this file. Restore later from RIS Simulator." />
              </fieldset>

              {mode === "append" && counts && counts.amend > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <label className="flex cursor-pointer items-start gap-2 font-extrabold">
                    <input type="checkbox" checked={applyAmendments} onChange={(e) => setApplyAmendments(e.target.checked)} className="mt-0.5 accent-[#18298C]" />
                    <span>
                      Apply {counts.amend} amendment(s) to signed-off exams (signed off within {preview.plan.windowDays} days).
                      TAT stays on the first sign-off. If unticked, they are skipped and logged.
                    </span>
                  </label>
                  <PlanChanges rows={preview.plan.rows.filter((r) => r.kind === "amend")} names={preview.radiologists.names} />
                </div>
              )}

              {mode === "append" && counts && counts.refused > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-3.5 w-3.5" /> Not applied (the rest of the file still imports; these are logged):</p>
                    {blocking.length === 0 && <RejectedRowsDownload preview={preview} />}
                  </div>
                  <PlanChanges rows={preview.plan.rows.filter((r) => r.kind === "refused")} names={preview.radiologists.names} />
                </div>
              )}

              {mode === "append" && counts && counts.update > 0 && (
                <details className="rounded-xl border border-border px-3 py-2 text-xs">
                  <summary className="cursor-pointer font-extrabold text-qc-navy">{counts.update} exam(s) not yet signed off will be updated</summary>
                  <PlanChanges rows={preview.plan.rows.filter((r) => r.kind === "update")} names={preview.radiologists.names} />
                </details>
              )}

              {preview.radiologists.unknown.length > 0 && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                  <p className="mb-1.5 font-extrabold">
                    {preview.radiologists.unknown.length} radiologist name(s) in this file are not in RADiTrack. Add them, or fix the spelling in the file and upload it again.
                  </p>
                  <ul className="space-y-1">
                    {preview.radiologists.unknown.map((r) => (
                      <li key={r.name} className="flex flex-wrap items-center justify-between gap-2">
                        <span><span className="font-bold">{r.name}</span> · {r.rowCount} row(s)</span>
                        <button
                          type="button"
                          onClick={() => addRadiologists([r.name])}
                          disabled={isPending}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-2.5 font-bold text-qc-navy hover:bg-sky-100 disabled:opacity-50"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Add as new radiologist
                        </button>
                      </li>
                    ))}
                  </ul>
                  {preview.radiologists.unknown.length > 1 && (
                    <button
                      type="button"
                      onClick={() => addRadiologists(preview.radiologists.unknown.map((r) => r.name))}
                      disabled={isPending}
                      className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg bg-qc-navy px-2.5 font-bold text-white hover:bg-qc-blue disabled:opacity-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Add all {preview.radiologists.unknown.length}
                    </button>
                  )}
                </div>
              )}

              {blocking.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-3.5 w-3.5" /> Fix these rows and upload again:</p>
                    <RejectedRowsDownload preview={preview} />
                  </div>
                  <ul className="max-h-36 space-y-0.5 overflow-y-auto">
                    {blocking.slice(0, LISTED_PROBLEMS).map((e) => <li key={`${e.rowNumber}-${e.message}`}>Row {e.rowNumber}{e.accession ? ` (${e.accession})` : ""}: {e.message}</li>)}
                  </ul>
                  {blocking.length > LISTED_PROBLEMS && (
                    <p className="mt-1 font-bold">…and {blocking.length - LISTED_PROBLEMS} more. Download the list to see every row.</p>
                  )}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-[13px]">
                  <thead className="bg-background text-left text-muted-foreground">
                    <tr>{["Accession", "Modality", "Category", "Study", "Completed", "Signed", ...(hasRadiologist ? ["Radiologist"] : [])].map((h) => <th key={h} className="px-2.5 py-1.5 font-bold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.records.slice(0, PREVIEW_ROWS).map((r) => (
                      <tr key={r.examinationIdentifier} className="border-t border-border">
                        <td className="px-2.5 py-1.5 font-bold text-qc-navy">{r.examinationIdentifier}</td>
                        <td className="px-2.5 py-1.5">{MODALITY_CONFIG[r.modalityCode as ModalityCode]?.shortName}</td>
                        <td className="px-2.5 py-1.5">{TRIAGE_CONFIG[r.triageLevel as TriageLevel]?.label}</td>
                        <td className="px-2.5 py-1.5">{fmt(r.studyDate)}</td>
                        <td className="px-2.5 py-1.5">{fmt(r.examCompletedAt)}</td>
                        <td className="px-2.5 py-1.5">{fmt(r.reportSignedAt)}</td>
                        {hasRadiologist && <td className="px-2.5 py-1.5">{r.radiologistName ?? "—"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.records.length > PREVIEW_ROWS && (
                  <p className="border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground">…and {preview.records.length - PREVIEW_ROWS} more</p>
                )}
              </div>
            </>
          )}

          {message && (
            <p role="status" className={`flex items-center gap-1.5 text-xs font-bold ${message.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}>
              {message.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {message.text}
            </p>
          )}

          <UploadHistory version={historyVersion} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-qc-navy hover:bg-muted">Close</button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport || isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-qc-navy px-5 text-xs font-extrabold text-white shadow-sm hover:bg-qc-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending && progressStage === "importing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-qc-yellow" />
            ) : (
              <Upload className="h-3.5 w-3.5 text-qc-yellow" />
            )}
            {isPending && progressStage === "importing"
              ? "Importing…"
              : !preview
                ? "Import"
                : mode === "test"
                  ? `Load ${preview.records.length} exams as test data`
                  : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * UPL-31: the rows that will not be imported, as a CSV the admin can fix and keep.
 * Built in the browser from the preview, so nothing extra is sent to the server.
 */
function rejectedRowsCsv(preview: ImportPreview): string {
  const problems = preview.errors.map((e) => [e.rowNumber || "", e.accession ?? "", "Problem in file", e.message]);
  const refused = preview.plan.rows
    .filter((r) => r.kind === "refused")
    .map((r) => [r.rowNumber, r.accession, "Not applied", r.reason ?? "Refused"]);
  const rows = [...problems, ...refused].sort((a, b) => Number(a[0] || 0) - Number(b[0] || 0));
  return [csvLine(["Row", "Accession", "Type", "Reason"]), ...rows.map(csvLine)].join("\r\n");
}

function RejectedRowsDownload({ preview }: { preview: ImportPreview }) {
  const download = () => {
    // The BOM makes Excel read the file as UTF-8.
    const blob = new Blob(["\uFEFF" + rejectedRowsCsv(preview)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${preview.fileName.replace(/\.(xlsx|csv)$/i, "")}-rejected-rows.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-2.5 font-bold text-red-900 hover:bg-red-100"
    >
      <Download className="h-3.5 w-3.5" /> Download rejected rows (CSV)
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "error" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "error" ? "text-red-700" : "text-qc-navy";
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function ModeOption({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 ${checked ? "border-qc-blue/40 bg-qc-blue/5" : "border-border bg-background hover:border-qc-blue/20"}`}>
      <input type="radio" name="import-mode" checked={checked} onChange={onChange} className="mt-0.5 accent-[#18298C]" />
      <span>
        <span className="block text-xs font-extrabold text-qc-navy">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{text}</span>
      </span>
    </label>
  );
}

const HISTORY_ROWS = 10;

/** The latest uploads (successful and failed), newest first. Reloads after every import. */
function UploadHistory({ version }: { version: number }) {
  const [batches, setBatches] = useState<ImportBatchSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listImportBatchesAction(HISTORY_ROWS)
      .then((rows) => { if (!cancelled) { setBatches(rows); setFailed(false); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [version]);

  return (
    <section aria-labelledby="upload-history-title" className="rounded-xl border border-border">
      <h3 id="upload-history-title" className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" /> Upload history
      </h3>
      {failed ? (
        <p className="px-3 py-2 text-xs text-red-700">Could not load the upload history.</p>
      ) : batches === null ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No uploads yet.</p>
      ) : (
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-background text-left text-muted-foreground">
              <tr>{["When", "File", "By", "Mode", "Rows", "Changes", "Result"].map((h) => <th key={h} className="px-2.5 py-1.5 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batchId} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-2.5 py-1.5">{fmt(b.uploadedAt)}</td>
                  <td className="max-w-[14rem] break-words px-2.5 py-1.5 font-bold text-qc-navy">{b.fileName}</td>
                  <td className="px-2.5 py-1.5">{b.uploadedBy}</td>
                  <td className="px-2.5 py-1.5">{b.mode === "test" ? "Test data" : "Add or update"}{b.testMode && b.mode !== "test" ? " (test mode)" : ""}</td>
                  <td className="px-2.5 py-1.5">{b.rowsInFile}</td>
                  <td className="px-2.5 py-1.5">{uploadChangesSummary(b)}</td>
                  <td className={`px-2.5 py-1.5 font-bold ${UPLOAD_TONE_CLASS[uploadStatusTone(b.status)]}`} title={b.message ?? undefined}>
                    {UPLOAD_STATUS_LABELS[b.status] ?? b.status}
                    {b.status !== "SUCCESS" && b.message && <span className="block font-normal opacity-90">{b.message}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const UPLOAD_TONE_CLASS = { ok: "text-emerald-700", error: "text-red-700", undone: "text-slate-500" } as const;

/** Rows of the re-upload plan with what would change, as "field: now → in file". */
function PlanChanges({ rows, names }: { rows: PlanRow[]; names: Record<string, string> }) {
  if (rows.length === 0) return null;
  return (
    <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
      {rows.map((row) => (
        <li key={`${row.rowNumber}-${row.accession}`}>
          <span className="font-bold">Row {row.rowNumber} · {row.accession}</span>
          {row.signedDaysAgo !== undefined && !row.reason && <span> · signed off {row.signedDaysAgo} day(s) ago</span>}
          {row.reason && <span> · {row.reason}</span>}
          <span className="block text-[12px] opacity-90">
            {describeChanges(row.changes, names)}
          </span>
        </li>
      ))}
    </ul>
  );
}
