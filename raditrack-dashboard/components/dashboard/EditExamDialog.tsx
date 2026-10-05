"use client";

import { useState } from "react";
import { Pencil, X, Save } from "lucide-react";
import { updateExaminationAction } from "@/app/actions";
import { ModalityCode, TriageLevel, UrgencyLevel } from "@/lib/enums";

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

export function EditExamDialog({ item }: EditExamDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
        title="Edit Examination Details"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-sky-400" />
                Edit Examination Details
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Correct typing mistakes for unfinalized record ({item.identifier})
              </p>
            </div>

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
              className="space-y-4"
            >
              <input type="hidden" name="examId" value={item.examId} />

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Accession Identifier
                </label>
                <input
                  type="text"
                  name="examinationIdentifier"
                  defaultValue={item.identifier}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Modality
                  </label>
                  <select
                    name="modalityCode"
                    defaultValue={item.modalityCode}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={ModalityCode.XRAY}>X-ray</option>
                    <option value={ModalityCode.US}>Ultrasound</option>
                    <option value={ModalityCode.CT}>CT-Scan</option>
                    <option value={ModalityCode.MRI}>MRI</option>
                    <option value={ModalityCode.MAMMO}>Mammogram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Triage Origin
                  </label>
                  <select
                    name="triageLevel"
                    defaultValue={item.triageLevel}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={TriageLevel.OPD}>OPD (Outpatient)</option>
                    <option value={TriageLevel.IN}>Inpatient (Wards/ICU)</option>
                    <option value={TriageLevel.ER}>ER (Emergency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Clinical Priority / Urgency
                </label>
                <select
                  name="urgencyLevel"
                  defaultValue={item.urgencyLevel}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value={UrgencyLevel.ROUTINE}>ROUTINE (Standard Queue)</option>
                  <option value={UrgencyLevel.STAT}>STAT (Emergency Immediate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Notes (Optional)
                </label>
                <input
                  type="text"
                  name="notes"
                  defaultValue={item.notes || ""}
                  placeholder="e.g. Corrected ward room from 302 to 304"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition shadow-sm disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
