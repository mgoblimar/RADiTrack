"use client";

import { useState } from "react";
import { Trash2, AlertOctagon, X, Ban } from "lucide-react";
import {
  cancelExaminationAction,
  deleteExaminationAction,
} from "@/app/actions";

interface DeleteExamDialogProps {
  examId: string;
  identifier: string;
}

export function DeleteExamDialog({
  examId,
  identifier,
}: DeleteExamDialogProps) {
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
        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-red-50 hover:text-qc-red"
        title="Cancel or Delete Examination"
        aria-label="Cancel or delete examination"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* =========================================================
          CONFIRMATION MODAL
          ========================================================= */}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[3px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exam-title"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
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

            <div className="flex items-start gap-3.5 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-qc-red">
                <AlertOctagon className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3
                  id="delete-exam-title"
                  className="text-lg font-extrabold tracking-tight text-qc-navy"
                >
                  Manage examination record
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Accession identifier{" "}
                  <span className="font-mono font-bold text-qc-navy">
                    {identifier}
                  </span>
                </p>
              </div>
            </div>

            {/* =====================================================
                EXPLANATION
                ===================================================== */}

            <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-3.5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Choose the appropriate action according to hospital
                protocol.{" "}
                <strong className="font-extrabold text-qc-navy">
                  Cancel
                </strong>{" "}
                preserves the audit history for an aborted procedure,
                while{" "}
                <strong className="font-extrabold text-qc-red">
                  Permanent Delete
                </strong>{" "}
                is intended for duplicate or erroneous entries.
              </p>
            </div>

            {/* =====================================================
                ACTIONS
                ===================================================== */}

            <div className="mt-5 space-y-3">
              {/* ---------------------------------------------------
                  OPTION 1: SOFT CANCEL
                  --------------------------------------------------- */}

              <form
                action={async (formData: FormData) => {
                  setIsSubmitting(true);

                  try {
                    await cancelExaminationAction(formData);
                    setIsOpen(false);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <input
                  type="hidden"
                  name="examId"
                  value={examId}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-qc-yellow/35 bg-qc-yellow/10 px-4 py-3.5 text-left transition-all duration-150 hover:border-qc-yellow/60 hover:bg-qc-yellow/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-qc-navy">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-qc-yellow/30 text-qc-navy">
                        <Ban className="h-4 w-4" />
                      </span>

                      <span>
                        Cancel examination
                      </span>
                    </div>

                    <p className="mt-2 pl-10 text-xs leading-relaxed text-muted-foreground">
                      Sets the examination status to CANCELLED,
                      preserves the record, and removes it from the
                      active reading workflow.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-qc-yellow/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-qc-navy">
                    Void
                  </span>
                </button>
              </form>

              {/* ---------------------------------------------------
                  OPTION 2: HARD DELETE
                  --------------------------------------------------- */}

              <form
                action={async (formData: FormData) => {
                  setIsSubmitting(true);

                  try {
                    await deleteExaminationAction(formData);
                    setIsOpen(false);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                <input
                  type="hidden"
                  name="examId"
                  value={examId}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-left transition-all duration-150 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-qc-red">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-qc-red">
                        <Trash2 className="h-4 w-4" />
                      </span>

                      <span>
                        Permanently delete record
                      </span>
                    </div>

                    <p className="mt-2 pl-10 text-xs leading-relaxed text-muted-foreground">
                      Completely removes the duplicate or erroneous
                      entry from the database. This action cannot be
                      undone.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-qc-red">
                    Delete
                  </span>
                </button>
              </form>
            </div>

            {/* =====================================================
                DISMISS
                ===================================================== */}

            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}