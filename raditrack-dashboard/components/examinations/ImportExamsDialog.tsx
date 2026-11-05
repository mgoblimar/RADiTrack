"use client";

import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileUp, Upload, X } from "lucide-react";
import {
  commitExamImportAction,
  previewExamImportAction,
  type ImportMode,
  type ImportPreview,
} from "@/app/actions";
import { MODALITY_CONFIG, TRIAGE_CONFIG, type ModalityCode, type TriageLevel } from "@/lib/enums";
import { notifyDatabaseChanged } from "@/lib/broadcast";

const TEMPLATE_URL = "/test-data/raditrack-test-dataset.xlsx";
const PREVIEW_ROWS = 6;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Pending";

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

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setPreview(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await previewExamImportAction(formData);
      if ("error" in result) setMessage({ tone: "error", text: result.error });
      else setPreview(result);
    });
  };

  const blocking = preview ? [...preview.errors, ...(mode === "append" ? preview.conflicts : [])] : [];
  const canImport = !!preview && preview.records.length > 0 && blocking.length === 0;

  const handleImport = () => {
    if (!preview) return;
    if (mode === "test" && !window.confirm(
      `Back up all current exams and reports, then replace them with these ${preview.records.length} exams as test data? Restore the real data from the RIS Simulator page when you finish.`,
    )) return;
    startTransition(async () => {
      const result = await commitExamImportAction(preview.records, mode);
      if (!result.success) {
        setMessage({ tone: "error", text: result.error ?? "Import failed. Nothing was saved." });
        return;
      }
      setMessage({ tone: "ok", text: mode === "test"
        ? `Loaded ${result.count} exams as test data. Real data is backed up.`
        : `Imported ${result.count} exams.` });
      setPreview(null);
      notifyDatabaseChanged();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-qc-navy/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="import-title" className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_rgba(5,14,64,0.25)]">
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
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-background px-4 py-6 text-center hover:border-qc-blue/30">
            <Upload className="h-5 w-5 text-qc-blue" />
            <span className="text-sm font-extrabold text-qc-navy">{isPending ? "Reading file…" : "Choose a file"}</span>
            <span className="text-[11px] text-muted-foreground">.xlsx or .csv, up to 5 MB</span>
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={handleFile} disabled={isPending} />
          </label>

          {preview && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Rows in file" value={preview.totalRows} />
                <Stat label="Ready to import" value={preview.records.length} tone="ok" />
                <Stat label="Problems" value={blocking.length} tone={blocking.length ? "error" : undefined} />
              </div>

              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">How to import</legend>
                <ModeOption checked={mode === "append"} onChange={() => setMode("append")} title="Add to current data" text="Keeps all existing exams. Accessions must be new." />
                <ModeOption checked={mode === "test"} onChange={() => setMode("test")} title="Load as test data" text="Backs up real exams, replaces them with this file. Restore later from RIS Simulator." />
              </fieldset>

              {blocking.length > 0 && (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <p className="mb-1 flex items-center gap-1.5 font-extrabold"><AlertTriangle className="h-3.5 w-3.5" /> Fix these rows and upload again:</p>
                  <ul className="space-y-0.5">
                    {blocking.slice(0, 50).map((e) => <li key={`${e.rowNumber}-${e.message}`}>Row {e.rowNumber}: {e.message}</li>)}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-[11px]">
                  <thead className="bg-background text-left text-muted-foreground">
                    <tr>{["Accession", "Modality", "Category", "Study", "Completed", "Signed"].map((h) => <th key={h} className="px-2.5 py-1.5 font-bold">{h}</th>)}</tr>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.records.length > PREVIEW_ROWS && (
                  <p className="border-t border-border px-2.5 py-1.5 text-[10px] text-muted-foreground">…and {preview.records.length - PREVIEW_ROWS} more</p>
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
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-qc-navy hover:bg-muted">Close</button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport || isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-qc-navy px-5 text-xs font-extrabold text-white shadow-sm hover:bg-qc-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5 text-qc-yellow" />
            {preview ? `Import ${preview.records.length} exams` : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "error" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "error" ? "text-red-700" : "text-qc-navy";
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
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
        <span className="block text-[11px] text-muted-foreground">{text}</span>
      </span>
    </label>
  );
}
