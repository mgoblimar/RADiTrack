"use client";

import { useState } from "react";
import { PlusCircle, X, Clock3 } from "lucide-react";
import { createExaminationAction } from "@/app/actions";
import {
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
  MODALITY_CONFIG,
  TRIAGE_CONFIG,
  URGENCY_CONFIG,
} from "@/lib/enums";

export function QuickIngestionModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* =========================================================
          TRIGGER BUTTON
          ========================================================= */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-md"
      >
        <PlusCircle className="h-4 w-4" />
        Log completed scan
        <span className="text-xs font-bold opacity-70">(T₁)</span>
      </button>

      {/* =========================================================
          MODAL
          ========================================================= */}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[3px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-ingestion-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
            {/* =====================================================
                HEADER
                ===================================================== */}

            <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-yellow/25 text-qc-navy">
                  <PlusCircle className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    id="quick-ingestion-title"
                    className="text-lg font-extrabold tracking-tight text-qc-navy"
                  >
                    Log examination completion
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-qc-blue">
                    Initialize T₁
                  </p>

                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                    Record the study completion timestamp to initialize
                    the turnaround-time workflow.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                aria-label="Close examination ingestion dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* =====================================================
                TAT INFORMATION NOTE
                ===================================================== */}

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-qc-blue/15 bg-qc-blue/5 px-4 py-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-qc-blue/10 text-qc-blue">
                <Clock3 className="h-4 w-4" />
              </div>

              <p className="text-xs leading-relaxed text-qc-navy">
                This entry records the examination completion point
                used as <strong className="font-extrabold">T₁</strong>{" "}
                for subsequent TAT calculation.
              </p>
            </div>

            {/* =====================================================
                FORM
                ===================================================== */}

            <form
              action={async (formData: FormData) => {
                await createExaminationAction(formData);
                setIsOpen(false);
              }}
              className="mt-6 space-y-5"
            >
              {/* ===================================================
                  ACCESSION IDENTIFIER
                  =================================================== */}

              <div className="space-y-2">
                <label
                  htmlFor="quick-ingestion-identifier"
                  className="block text-sm font-bold text-qc-navy"
                >
                  Accession identifier
                </label>

                <input
                  id="quick-ingestion-identifier"
                  name="examinationIdentifier"
                  type="text"
                  placeholder="e.g. ACC-2026-001"
                  required
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 font-mono text-sm font-semibold text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                />

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Use the unique accession identifier assigned to the
                  examination.
                </p>
              </div>

              {/* ===================================================
                  MODALITY + TRIAGE
                  =================================================== */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Modality */}
                <div className="space-y-2">
                  <label
                    htmlFor="quick-ingestion-modality"
                    className="block text-sm font-bold text-qc-navy"
                  >
                    Modality
                  </label>

                  <select
                    id="quick-ingestion-modality"
                    name="modalityCode"
                    defaultValue={ModalityCode.CT}
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
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

                {/* Triage */}
                <div className="space-y-2">
                  <label
                    htmlFor="quick-ingestion-triage"
                    className="block text-sm font-bold text-qc-navy"
                  >
                    Triage level
                  </label>

                  <select
                    id="quick-ingestion-triage"
                    name="triageLevel"
                    defaultValue={TriageLevel.OPD}
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
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
              </div>

              {/* ===================================================
                  URGENCY
                  =================================================== */}

              <div className="space-y-2">
                <label
                  htmlFor="quick-ingestion-urgency"
                  className="block text-sm font-bold text-qc-navy"
                >
                  Urgency
                </label>

                <select
                  id="quick-ingestion-urgency"
                  name="urgencyLevel"
                  defaultValue={UrgencyLevel.ROUTINE}
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
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

              {/* ===================================================
                  ACTION FOOTER
                  =================================================== */}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-5 py-2.5 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-md"
                >
                  <PlusCircle className="h-4 w-4" />
                  Save & queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}