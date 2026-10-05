"use client";

import { useState } from "react";
import { Trash2, AlertOctagon, X, Ban } from "lucide-react";
import { cancelExaminationAction, deleteExaminationAction } from "@/app/actions";

interface DeleteExamDialogProps {
  examId: string;
  identifier: string;
}

export function DeleteExamDialog({ examId, identifier }: DeleteExamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
        title="Cancel or Delete Examination"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-400">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Manage / Void Examination</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Accession Identifier: <span className="font-mono text-slate-200">{identifier}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Choose the appropriate action according to hospital protocol. <strong>Cancel</strong> preserves the audit log for aborted procedures, while <strong>Permanent Delete</strong> purges duplicate entry errors.
            </p>

            <div className="space-y-3">
              {/* Option 1: Soft Cancel (Clinical Recommendation) */}
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
                <input type="hidden" name="examId" value={examId} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-700/60 transition group text-left"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5" />
                      Cancel Examination (Clinical Void)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sets status to CANCELLED. Keeps medical-legal record, clears queue & TAT.
                    </p>
                  </div>
                  <span className="text-xs text-amber-400 font-semibold ml-2">Void</span>
                </button>
              </form>

              {/* Option 2: Hard Delete (Accidental Data Entry Error) */}
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
                <input type="hidden" name="examId" value={examId} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700/60 transition group text-left"
                >
                  <div>
                    <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Permanently Delete Record
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Completely purges duplicate test entry from database. Irreversible.
                    </p>
                  </div>
                  <span className="text-xs text-rose-400 font-semibold ml-2">Delete</span>
                </button>
              </form>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
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
