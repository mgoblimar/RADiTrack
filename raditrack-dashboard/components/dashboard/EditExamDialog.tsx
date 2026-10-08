"use client";

import { useState } from "react";
import { Pencil, X, Save } from "lucide-react";
import { updateExaminationAction } from "@/app/actions";
import {
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
} from "@/lib/enums";

interface EditExamDialogProps {
  item: {
    examId: string;
    identifier: string;
    modalityCode: string;
    triageLevel: string;
    urgencyLevel: string;
    notes?: string;
  };
}

export function EditExamDialog({
  item,
}: EditExamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      {/* =========================================================
          TRIGGER BUTTON
          ========================================================= */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-qc-blue/10 hover:text-qc-blue"
        title="Edit Examination Details"
        aria-label="Edit examination details"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* =========================================================
          MODAL
          ========================================================= */}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[3px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-exam-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 text-left shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
            {/* =====================================================
                CLOSE BUTTON
                ===================================================== */}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* =====================================================
                HEADER
                ===================================================== */}

            <div className="pr-8">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
                  <Pencil className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    id="edit-exam-title"
                    className="text-lg font-extrabold tracking-tight text-qc-navy"
                  >
                    Edit examination details
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Correct information for this unfinalized examination.
                  </p>

                  <div className="mt-2 inline-flex max-w-full items-center rounded-full bg-qc-blue/5 px-2.5 py-1">
                    <span className="truncate font-mono text-[11px] font-bold text-qc-blue">
                      {item.identifier}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================
                FORM
                ===================================================== */}

            <form
              action={async (formData: FormData) => {
                setIsSubmitting(true);

                try {
                  await updateExaminationAction(formData);
                  setIsOpen(false);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="examId"
                value={item.examId}
              />

              {/* ===================================================
                  ACCESSION IDENTIFIER
                  =================================================== */}

              <div className="space-y-2">
                <label
                  htmlFor={`identifier-${item.examId}`}
                  className="block text-sm font-bold text-qc-navy"
                >
                  Accession identifier
                </label>

                <input
                  id={`identifier-${item.examId}`}
                  type="text"
                  name="examinationIdentifier"
                  defaultValue={item.identifier}
                  required
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 font-mono text-sm font-semibold text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                />
              </div>

              {/* ===================================================
                  MODALITY + TRIAGE
                  =================================================== */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor={`modality-${item.examId}`}
                    className="block text-sm font-bold text-qc-navy"
                  >
                    Modality
                  </label>

                  <select
                    id={`modality-${item.examId}`}
                    name="modalityCode"
                    defaultValue={item.modalityCode}
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                  >
                    <option value={ModalityCode.XRAY}>
                      X-ray
                    </option>

                    <option value={ModalityCode.US}>
                      Ultrasound
                    </option>

                    <option value={ModalityCode.CT}>
                      CT-Scan
                    </option>

                    <option value={ModalityCode.MRI}>
                      MRI
                    </option>

                    <option value={ModalityCode.MAMMO}>
                      Mammogram
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={`triage-${item.examId}`}
                    className="block text-sm font-bold text-qc-navy"
                  >
                    Triage origin
                  </label>

                  <select
                    id={`triage-${item.examId}`}
                    name="triageLevel"
                    defaultValue={item.triageLevel}
                    className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                  >
                    <option value={TriageLevel.OPD}>
                      OPD (Outpatient)
                    </option>

                    <option value={TriageLevel.IN}>
                      Inpatient (Wards/ICU)
                    </option>

                    <option value={TriageLevel.ER}>
                      ER (Emergency)
                    </option>
                  </select>
                </div>
              </div>

              {/* ===================================================
                  URGENCY
                  =================================================== */}

              <div className="space-y-2">
                <label
                  htmlFor={`urgency-${item.examId}`}
                  className="block text-sm font-bold text-qc-navy"
                >
                  Clinical priority / urgency
                </label>

                <select
                  id={`urgency-${item.examId}`}
                  name="urgencyLevel"
                  defaultValue={item.urgencyLevel}
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                >
                  <option value={UrgencyLevel.ROUTINE}>
                    ROUTINE (Standard Queue)
                  </option>

                  <option value={UrgencyLevel.STAT}>
                    STAT (Emergency Immediate)
                  </option>
                </select>
              </div>

              {/* ===================================================
                  NOTES
                  =================================================== */}

              <div className="space-y-2">
                <label
                  htmlFor={`notes-${item.examId}`}
                  className="block text-sm font-bold text-qc-navy"
                >
                  Operational notes
                  <span className="ml-1 font-medium text-muted-foreground">
                    (optional)
                  </span>
                </label>

                <input
                  id={`notes-${item.examId}`}
                  type="text"
                  name="notes"
                  defaultValue={item.notes || ""}
                  placeholder="e.g. Corrected ward room from 302 to 304"
                  className="w-full rounded-2xl border border-border bg-background px-3.5 py-3 text-sm font-medium text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/40 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                />
              </div>

              {/* ===================================================
                  ACTION FOOTER
                  =================================================== */}

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-2xl px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-qc-navy/25 border-t-qc-navy" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}