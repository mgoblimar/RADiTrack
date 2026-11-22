"use client";

// Small pieces shared by the Audit log views.

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const selectBase =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-qc-navy outline-none transition-colors focus:border-qc-blue/40 focus:ring-2 focus:ring-qc-blue/10";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  disabled,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#E7EAF1] px-4 py-3 text-xs font-semibold text-slate-500">
      <span>{total === 0 ? "No entries" : `${first}–${last} of ${total}`}</span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-qc-navy hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={disabled || page >= lastPage}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-qc-navy hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TestDataTag() {
  return (
    <span className="ml-1.5 inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
      Test data
    </span>
  );
}
