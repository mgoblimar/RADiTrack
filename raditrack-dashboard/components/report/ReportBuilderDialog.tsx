"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import {
  MODALITY_CONFIG,
  MODALITY_ORDER,
  TRIAGE_CONFIG,
  TriageLevel,
  type ModalityCode,
} from "@/lib/enums";
import type { DashboardFilters } from "@/lib/dashboard-types";
import type { KpiPreset } from "@/lib/kpi-range";
import {
  DEFAULT_REPORT_TITLE,
  REPORT_SECTIONS,
  buildReportQuery,
  type ReportConfig,
  type ReportSection,
} from "@/lib/report-params";

const PRESET_OPTIONS: { id: KpiPreset; label: string }[] = [
  { id: "TODAY", label: "Today" },
  { id: "ROLLING_7D", label: "Rolling 7 days" },
  { id: "WEEK", label: "This week" },
  { id: "LAST_WEEK", label: "Last week" },
  { id: "MONTH", label: "This month" },
  { id: "LAST_MONTH", label: "Last month" },
  { id: "YEAR", label: "This year" },
  { id: "ALL", label: "All time" },
  { id: "CUSTOM", label: "Custom range" },
];

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-qc-navy outline-none focus:border-qc-blue/40 focus:ring-2 focus:ring-qc-blue/10";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

interface ReportBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current dashboard filters, used as the starting point. */
  filters: DashboardFilters;
}

function initialConfig(filters: DashboardFilters): ReportConfig {
  return {
    title: DEFAULT_REPORT_TITLE,
    preparedBy: "",
    notes: "",
    preset: filters.preset,
    startDate: filters.rangeStart,
    endDate: filters.rangeEnd,
    modality: filters.modality,
    triage: filters.triage,
    sections: REPORT_SECTIONS.map((s) => s.id),
  };
}

/** Returns a message when the report can't be built, otherwise null. */
function validateConfig(config: ReportConfig): string | null {
  if (config.sections.length === 0) return "Choose at least one section to include.";
  if (config.preset === "CUSTOM" && (!config.startDate || !config.endDate || config.startDate > config.endDate)) {
    return "Pick a valid custom range: the start date must be on or before the end date.";
  }
  return null;
}

export function ReportBuilderDialog({ isOpen, onClose, filters }: ReportBuilderDialogProps) {
  if (!isOpen || typeof document === "undefined") return null;
  // Remounting per open resets the form to the latest dashboard filters.
  return createPortal(<ReportBuilderForm onClose={onClose} filters={filters} />, document.body);
}

function ReportBuilderForm({ onClose, filters }: Omit<ReportBuilderDialogProps, "isOpen">) {
  const [config, setConfig] = useState<ReportConfig>(() => initialConfig(filters));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = <K extends keyof ReportConfig>(key: K, value: ReportConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const toggleSection = (id: ReportSection) =>
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.includes(id)
        ? prev.sections.filter((s) => s !== id)
        : REPORT_SECTIONS.map((s) => s.id).filter((s) => s === id || prev.sections.includes(s)),
    }));

  // A real link (not window.open) so popup blockers and extensions never stop the new tab.
  const reportHref = `/report?${buildReportQuery(config)}`;
  const previewLinkRef = useRef<HTMLAnchorElement>(null);

  const handlePreviewClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const problem = validateConfig(config);
    if (problem) {
      event.preventDefault();
      setError(problem);
      return;
    }
    setError(null);
    // Close after the browser has followed the link, so the link is still on the page when it does.
    window.setTimeout(onClose, 0);
  };

  // Enter in a text field submits the form: follow the same link.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    previewLinkRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-qc-navy/40 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-builder-title"
        onSubmit={handleSubmit}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_rgba(5,14,64,0.25)]"
      >
        <div className="flex items-center justify-between border-b border-border bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="report-builder-title" className="text-lg font-extrabold text-qc-navy">Generate PDF report</h2>
              <p className="text-xs text-muted-foreground">Choose the time frame, scope and sections. The report opens in a new tab, ready to save as PDF.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-qc-navy">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Report title">
              <input className={INPUT_CLASS} value={config.title} maxLength={120} onChange={(e) => update("title", e.target.value)} />
            </Field>
          </div>

          <Field label="Time frame">
            <select className={INPUT_CLASS} value={config.preset} onChange={(e) => update("preset", e.target.value as KpiPreset)}>
              {PRESET_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Field>

          <Field label="Prepared by (optional)">
            <input className={INPUT_CLASS} value={config.preparedBy} maxLength={80} onChange={(e) => update("preparedBy", e.target.value)} placeholder="e.g. Radiology QA Officer" />
          </Field>

          {config.preset === "CUSTOM" && (
            <>
              <Field label="Start date">
                <input type="date" className={INPUT_CLASS} value={config.startDate} max={config.endDate || undefined} onChange={(e) => update("startDate", e.target.value)} />
              </Field>
              <Field label="End date">
                <input type="date" className={INPUT_CLASS} value={config.endDate} min={config.startDate || undefined} onChange={(e) => update("endDate", e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Modality">
            <select className={INPUT_CLASS} value={config.modality} onChange={(e) => update("modality", e.target.value as "ALL" | ModalityCode)}>
              <option value="ALL">All modalities</option>
              {MODALITY_ORDER.map((code) => <option key={code} value={code}>{MODALITY_CONFIG[code].shortName}</option>)}
            </select>
          </Field>

          <Field label="Patient category">
            <select className={INPUT_CLASS} value={config.triage} onChange={(e) => update("triage", e.target.value as "ALL" | TriageLevel)}>
              <option value="ALL">All patient categories</option>
              {[TriageLevel.OPD, TriageLevel.IN, TriageLevel.ER].map((t) => <option key={t} value={t}>{TRIAGE_CONFIG[t].label}</option>)}
            </select>
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Sections to include</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {REPORT_SECTIONS.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-qc-navy hover:border-qc-blue/20 has-[:checked]:border-qc-blue/30 has-[:checked]:bg-qc-blue/5">
                  <input type="checkbox" className="h-4 w-4 accent-[#18298C]" checked={config.sections.includes(s.id)} onChange={() => toggleSection(s.id)} />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="sm:col-span-2">
            <Field label="Notes or remarks (optional)">
              <textarea className={`${INPUT_CLASS} min-h-20 resize-y`} value={config.notes} maxLength={1500} onChange={(e) => update("notes", e.target.value)} placeholder="Shown under the report header" />
            </Field>
          </div>

          {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-qc-navy hover:bg-muted">Cancel</button>
          <a
            ref={previewLinkRef}
            href={reportHref}
            target="_blank"
            rel="noopener"
            onClick={handlePreviewClick}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-qc-navy px-5 text-xs font-extrabold text-white shadow-sm hover:bg-qc-blue"
          >
            <FileText className="h-3.5 w-3.5 text-qc-yellow" />
            Preview report
          </a>
        </div>
      </form>
    </div>
  );
}
