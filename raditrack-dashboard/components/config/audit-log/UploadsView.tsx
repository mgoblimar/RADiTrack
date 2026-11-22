"use client";

// Uploads: every upload attempt, with "View changes" and "Undo upload" (UPL-34).

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ListTree, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import {
  listUploadLogAction,
  previewRollbackAction,
  rollbackImportAction,
  type AuditDataFilter,
  type RollbackPreview,
  type UploadLogItem,
  type UploadLogPage,
} from "@/app/actions/audit-log";
import { formatAuditTime, UPLOAD_STATUS_LABELS, uploadChangesSummary, uploadStatusTone } from "@/lib/audit-display";
import { notifyDatabaseChanged } from "@/lib/broadcast";
import { Field, Pager, selectBase, TestDataTag } from "./shared";
import { UndoUploadDialog } from "./UndoUploadDialog";
import { useServerList } from "./useServerList";

const STATUS_CLASS = { ok: "text-emerald-700", error: "text-red-700", undone: "text-violet-700" } as const;

export function UploadsView({ onViewChanges }: { onViewChanges: (batchId: string) => void }) {
  const router = useRouter();
  const [data, setData] = useState<AuditDataFilter>("all");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [undo, setUndo] = useState<{ batchId: string; preview: RollbackPreview } | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isWorking, startWork] = useTransition();
  const { data: result, error, isLoading } = useServerList<{ page: number; data: AuditDataFilter }, UploadLogPage>(
    listUploadLogAction,
    { page, data },
    "Could not load the upload log.",
    version,
  );

  const askUndo = async (upload: UploadLogItem) => {
    setNotice(null);
    setChecking(upload.batchId);
    try {
      setUndo({ batchId: upload.batchId, preview: await previewRollbackAction(upload.batchId) });
    } catch {
      setNotice({ tone: "error", text: "Could not check this upload. Try again." });
    } finally {
      setChecking(null);
    }
  };

  const closeUndo = useCallback(() => setUndo(null), []);

  const confirmUndo = () => {
    if (!undo) return;
    startWork(async () => {
      try {
        const done = await rollbackImportAction(undo.batchId);
        if (!done.ok) {
          // Something changed between the check and the confirm: show the new reason.
          setUndo({ batchId: undo.batchId, preview: { ok: false, reason: done.reason, blockedBy: done.blockedBy } });
          return;
        }
        setUndo(null);
        setNotice({ tone: "ok", text: `Upload undone: ${done.removed} exam(s) removed, ${done.restored} exam(s) restored.` });
        setVersion((v) => v + 1);
        notifyDatabaseChanged();
        router.refresh();
      } catch {
        // The connection failed, so the result is unknown: reload the list, which shows whether it was undone.
        setUndo(null);
        setNotice({ tone: "error", text: "Could not confirm the undo. Check this upload's result in the list below." });
        setVersion((v) => v + 1);
      }
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E7EAF1] px-4 py-4 sm:px-6">
        <p className="max-w-xl text-xs text-slate-500">
          An upload can be undone within the amendment window{result ? ` (${result.windowDays} days)` : ""}, while the same data is loaded,
          and only if none of its exams were changed afterwards, by anyone. A later upload of the same exams counts as a change,
          even if that later upload was undone.
        </p>
        <Field label="Data">
          <select value={data} onChange={(e) => { setData(e.target.value as AuditDataFilter); setPage(1); }} className={selectBase}>
            <option value="all">Real and test</option>
            <option value="real">Real data only</option>
            <option value="test">Test data only</option>
          </select>
        </Field>
      </div>

      {notice && (
        <p role="status" className={`flex items-center gap-1.5 border-b border-[#E7EAF1] px-4 py-2.5 text-xs font-bold sm:px-6 ${notice.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}>
          {notice.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {notice.text}
        </p>
      )}

      {error ? (
        <p className="px-6 py-8 text-sm font-semibold text-red-700">{error}</p>
      ) : (
        <div className="relative overflow-x-auto">
          {isLoading && (
            <div className="absolute inset-x-0 top-0 flex justify-center pt-6">
              <Loader2 className="h-5 w-5 animate-spin text-qc-blue" />
            </div>
          )}
          <table className={`w-full min-w-[900px] text-[13px] ${isLoading ? "opacity-50" : ""}`}>
            <thead className="bg-[#F8FAFD] text-left text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">
              <tr>
                <th className="px-4 py-2.5 sm:pl-6">When</th>
                <th className="px-3 py-2.5">File</th>
                <th className="px-3 py-2.5">By</th>
                <th className="px-3 py-2.5">Mode</th>
                <th className="px-3 py-2.5">Rows</th>
                <th className="px-3 py-2.5">Changes</th>
                <th className="px-3 py-2.5">Result</th>
                <th className="px-3 py-2.5 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result?.uploads.map((upload) => (
                <tr key={upload.batchId} className="border-t border-[#EEF1F6] align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 sm:pl-6">{formatAuditTime(upload.uploadedAt)}</td>
                  <td className="max-w-[14rem] break-words px-3 py-2.5 font-bold text-qc-navy">{upload.fileName}</td>
                  <td className="px-3 py-2.5">{upload.uploadedBy}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {upload.mode === "test" ? "Load as test data" : "Add or update"}
                    {upload.testMode && upload.mode !== "test" && <TestDataTag />}
                  </td>
                  <td className="px-3 py-2.5">{upload.rowsInFile}</td>
                  <td className="px-3 py-2.5">{uploadChangesSummary(upload)}</td>
                  <td className={`px-3 py-2.5 font-bold ${STATUS_CLASS[uploadStatusTone(upload.status)]}`}>
                    {UPLOAD_STATUS_LABELS[upload.status] ?? upload.status}
                    {upload.status !== "SUCCESS" && upload.message && <span className="block max-w-[16rem] text-xs font-normal text-slate-600">{upload.message}</span>}
                  </td>
                  <td className="px-3 py-2.5 sm:pr-6">
                    <div className="flex flex-col items-start gap-1.5">
                      {upload.mode === "append" && upload.status !== "FAILED" && (
                        <button
                          type="button"
                          onClick={() => onViewChanges(upload.batchId)}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-qc-blue hover:underline"
                        >
                          <ListTree className="h-3.5 w-3.5" /> View changes
                        </button>
                      )}
                      {upload.canUndo ? (
                        <button
                          type="button"
                          onClick={() => askUndo(upload)}
                          disabled={checking !== null || isWorking}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {checking === upload.batchId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          Undo upload
                        </button>
                      ) : upload.undoNote && upload.mode === "append" && upload.status === "SUCCESS" ? (
                        <span className="text-[11px] text-slate-400">Undo: {upload.undoNote.toLowerCase()}</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result && result.uploads.length === 0 && !isLoading && (
            <p className="px-6 py-8 text-center text-sm font-semibold text-slate-500">No uploads yet.</p>
          )}
        </div>
      )}

      {result && <Pager page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} disabled={isLoading} />}

      {undo && <UndoUploadDialog preview={undo.preview} isWorking={isWorking} onConfirm={confirmUndo} onClose={closeUndo} />}
    </div>
  );
}
