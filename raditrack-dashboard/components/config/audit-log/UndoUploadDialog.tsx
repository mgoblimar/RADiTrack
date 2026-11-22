"use client";

// Confirms undoing an upload after the server has checked it (UPL-34).

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";
import type { RollbackPreview } from "@/app/actions/audit-log";
import { formatAuditTime } from "@/lib/audit-display";

const LISTED_ACCESSIONS = 30;

export function UndoUploadDialog({
  preview,
  isWorking,
  onConfirm,
  onClose,
}: {
  preview: RollbackPreview;
  isWorking: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !isWorking && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isWorking, onClose]);

  // Focus the safe choice when the dialog opens, and give focus back to the Undo button when it closes.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => opener?.focus();
  }, []);

  if (typeof document === "undefined") return null;

  const accessions = preview.ok ? preview.accessions : preview.blockedBy;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex justify-center overflow-y-auto bg-qc-navy/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && !isWorking && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="undo-title" className="my-auto w-full max-w-lg shrink-0 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_30px_80px_rgba(5,14,64,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${preview.ok ? "bg-violet-100 text-violet-700" : "bg-red-50 text-red-700"}`}>
              {preview.ok ? <RotateCcw className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <h2 id="undo-title" className="text-lg font-extrabold text-qc-navy">
              {preview.ok ? "Undo this upload?" : "This upload cannot be undone"}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={isWorking} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-qc-navy disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
          {preview.ok ? (
            <>
              <p>
                <span className="font-bold text-qc-navy">{preview.fileName}</span>, uploaded {formatAuditTime(preview.uploadedAt)}.
              </p>
              <ul className="space-y-1">
                {preview.remove > 0 && <li><span className="font-bold">{preview.remove}</span> exam(s) it added will be removed.</li>}
                {preview.restore > 0 && <li><span className="font-bold">{preview.restore}</span> exam(s) it changed will get their earlier values back, including removing sign-offs it added.</li>}
              </ul>
              <p className="text-xs text-slate-500">
                Nothing from other uploads or other changes is touched. The undo is recorded in the audit log and cannot itself be undone.
              </p>
            </>
          ) : (
            <p>{preview.reason}</p>
          )}

          {accessions.length > 0 && (
            <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
              <p className="mb-1 font-extrabold text-slate-500">{preview.ok ? "Exams affected" : "Changed or deleted since the upload"}</p>
              <p className="break-words text-qc-navy">
                {accessions.slice(0, LISTED_ACCESSIONS).join(", ")}
                {accessions.length > LISTED_ACCESSIONS && ` … and ${accessions.length - LISTED_ACCESSIONS} more`}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={isWorking} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-qc-navy hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/30 disabled:opacity-50">
            {preview.ok ? "Cancel" : "Close"}
          </button>
          {preview.ok && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isWorking}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-700 px-5 text-xs font-extrabold text-white shadow-sm hover:bg-red-800 disabled:opacity-60"
            >
              {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {isWorking ? "Undoing…" : "Undo upload"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
