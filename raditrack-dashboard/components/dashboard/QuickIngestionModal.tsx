"use client";

import { useState } from "react";
import { PlusCircle, X } from "lucide-react";
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
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow-lg shadow-sky-500/20"
      >
        <PlusCircle className="h-4 w-4" />
        Log Completed Scan (T₁)
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PlusCircle className="text-sky-400 h-5 w-5" />
                  Log Examination Completion (T₁)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Records study completion timestamp to initialize the TAT countdown.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createExaminationAction(formData);
                setIsOpen(false);
              }}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Accession Identifier
                </label>
                <input
                  name="examinationIdentifier"
                  placeholder="e.g. ACC-2026-001"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">
                    Modality
                  </label>
                  <select
                    name="modalityCode"
                    defaultValue={ModalityCode.CT}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {Object.entries(MODALITY_CONFIG).map(([code, config]) => (
                      <option key={code} value={code}>
                        {config.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-medium">
                    Triage Level
                  </label>
                  <select
                    name="triageLevel"
                    defaultValue={TriageLevel.OPD}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {Object.entries(TRIAGE_CONFIG).map(([level, config]) => (
                      <option key={level} value={level}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Urgency
                </label>
                <select
                  name="urgencyLevel"
                  defaultValue={UrgencyLevel.ROUTINE}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  {Object.entries(URGENCY_CONFIG).map(([urgency, config]) => (
                    <option key={urgency} value={urgency}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition"
                >
                  Save & Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}