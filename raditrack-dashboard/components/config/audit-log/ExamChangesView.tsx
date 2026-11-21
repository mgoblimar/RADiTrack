"use client";

// Exam changes: every change to an examination, from the screens, uploads, the simulator and undos.

import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { listAuditLogAction, type AuditDataFilter, type AuditLogFilters, type AuditLogPage } from "@/app/actions/audit-log";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_SOURCE_LABELS,
  auditActionTone,
  auditFieldLabel,
  formatAuditTime,
  formatAuditValue,
} from "@/lib/audit-display";
import { Field, Pager, selectBase, TestDataTag } from "./shared";
import { useServerList } from "./useServerList";

const TONE_CLASS = {
  change: "bg-qc-blue/10 text-qc-blue",
  refused: "bg-red-50 text-red-700",
  undo: "bg-violet-50 text-violet-700",
  removed: "bg-slate-100 text-slate-700",
} as const;

const SEARCH_DELAY_MS = 300;

export interface ExamChangesViewProps {
  batchId: string | null;
  onClearBatch: () => void;
}

/** The panel mounts this with `key={batchId}`, so choosing another upload starts on page 1. */
export function ExamChangesView({ batchId, onClearBatch }: ExamChangesViewProps) {
  const [accessionInput, setAccessionInput] = useState("");
  const [filters, setFilters] = useState<Omit<AuditLogFilters, "batchId" | "page">>({ data: "all" });
  const [page, setPage] = useState(1);
  const { data: result, error, isLoading } = useServerList(
    listAuditLogAction,
    { ...filters, batchId: batchId ?? undefined, page },
    "Could not load the audit log.",
  );

  // Typing in the accession box waits a moment before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => (current.accession === accessionInput.trim() ? current : { ...current, accession: accessionInput.trim() }));
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [accessionInput]);

  const update = (patch: Partial<AuditLogFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const hasFilters = Boolean(accessionInput || filters.action || filters.source || filters.user || filters.from || filters.to || filters.data !== "all" || batchId);
  const clearAll = () => {
    setAccessionInput("");
    setFilters({ data: "all" });
    setPage(1);
    if (batchId) onClearBatch();
  };

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 border-b border-[#E7EAF1] px-4 py-4 sm:px-6">
        <Field label="Accession">
          <input
            type="search"
            value={accessionInput}
            onChange={(e) => setAccessionInput(e.target.value)}
            placeholder="e.g. RT-001"
            maxLength={64}
            className={selectBase}
          />
        </Field>
        <Field label="What happened">
          <select value={filters.action ?? ""} onChange={(e) => update({ action: e.target.value || undefined })} className={selectBase}>
            <option value="">Any</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select value={filters.source ?? ""} onChange={(e) => update({ source: e.target.value || undefined })} className={selectBase}>
            <option value="">Anywhere</option>
            {Object.entries(AUDIT_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="User">
          <select value={filters.user ?? ""} onChange={(e) => update({ user: e.target.value || undefined })} className={selectBase}>
            <option value="">Anyone</option>
            {(result?.users ?? []).map((user) => <option key={user} value={user}>{user}</option>)}
          </select>
        </Field>
        <Field label="From date">
          <input type="date" value={filters.from ?? ""} onChange={(e) => update({ from: e.target.value || undefined })} className={selectBase} />
        </Field>
        <Field label="To date">
          <input type="date" value={filters.to ?? ""} onChange={(e) => update({ to: e.target.value || undefined })} className={selectBase} />
        </Field>
        <Field label="Data">
          <select value={filters.data ?? "all"} onChange={(e) => update({ data: e.target.value as AuditDataFilter })} className={selectBase}>
            <option value="all">Real and test</option>
            <option value="real">Real data only</option>
            <option value="test">Test data only</option>
          </select>
        </Field>
      </div>

      {(batchId || hasFilters) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E7EAF1] px-4 py-2.5 sm:px-6">
          {batchId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-qc-blue/20 bg-qc-blue/5 px-2.5 py-1 text-xs font-bold text-qc-blue">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Upload: {result?.batchFileName ?? "…"}
              <button type="button" onClick={onClearBatch} aria-label="Show all uploads" className="hover:text-qc-navy">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {hasFilters && (
            <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-qc-navy">
              Clear filters
            </button>
          )}
        </div>
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
          <table className={`w-full min-w-[860px] text-[13px] ${isLoading ? "opacity-50" : ""}`}>
            <thead className="bg-[#F8FAFD] text-left text-xs font-extrabold uppercase tracking-[0.06em] text-slate-500">
              <tr>
                <th className="px-4 py-2.5 sm:pl-6">When</th>
                <th className="px-3 py-2.5">User</th>
                <th className="px-3 py-2.5">Accession</th>
                <th className="px-3 py-2.5">What happened</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5 sm:pr-6">Changes (before → after)</th>
              </tr>
            </thead>
            <tbody>
              {result?.entries.map((entry) => (
                <tr key={entry.auditId} className="border-t border-[#EEF1F6] align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 sm:pl-6">{formatAuditTime(entry.createdAt)}</td>
                  <td className="px-3 py-2.5 font-semibold text-qc-navy">{entry.actor}</td>
                  <td className="px-3 py-2.5">
                    {entry.accession ? (
                      <button
                        type="button"
                        onClick={() => setAccessionInput(entry.accession)}
                        title="Show this exam's history"
                        className="font-bold text-qc-blue underline-offset-2 hover:underline"
                      >
                        {entry.accession}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-extrabold ${TONE_CLASS[auditActionTone(entry.action)]}`}>
                      {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {AUDIT_SOURCE_LABELS[entry.source] ?? entry.source}
                    {entry.testMode && <TestDataTag />}
                    {entry.fileName && <span className="block max-w-[12rem] break-words text-xs text-slate-500">{entry.fileName}</span>}
                  </td>
                  <td className="px-3 py-2.5 sm:pr-6">
                    <ChangeList changes={entry.changes} names={result.radiologistNames} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result && result.entries.length === 0 && !isLoading && (
            <p className="px-6 py-8 text-center text-sm font-semibold text-slate-500">
              {hasFilters ? "No entries match these filters." : "No exam changes have been recorded yet."}
            </p>
          )}
        </div>
      )}

      {result && <Pager page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} disabled={isLoading} />}
    </div>
  );
}

/**
 * Before → after for each field. A new exam (nothing before) or a removed one (nothing after)
 * just lists its values, so the arrows are kept for real changes.
 */
function ChangeList({ changes, names }: { changes: AuditLogPage["entries"][number]["changes"]; names: Record<string, string> }) {
  const items = Object.entries(changes ?? {});
  if (items.length === 0) return <span className="text-slate-400">—</span>;
  const isNew = items.every(([, [from]]) => from === null);
  const isGone = !isNew && items.every(([, [, to]]) => to === null);
  return (
    <ul className="space-y-0.5">
      {isGone && <li className="text-xs font-bold uppercase tracking-wide text-slate-400">Values removed</li>}
      {items.map(([field, [from, to]]) => (
        <li key={field} className="text-slate-700">
          <span className="font-bold text-qc-navy">{auditFieldLabel(field)}:</span>{" "}
          {isNew || isGone ? (
            <span>{formatAuditValue(field, isNew ? to : from, names)}</span>
          ) : (
            <>
              <span className="text-slate-500">{formatAuditValue(field, from, names)}</span>
              {" → "}
              <span>{formatAuditValue(field, to, names)}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
