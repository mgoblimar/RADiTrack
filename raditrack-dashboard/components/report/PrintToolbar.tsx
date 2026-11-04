"use client";

import { Download, X } from "lucide-react";

/** On-screen toolbar for the report page; hidden when printing. */
export function PrintToolbar() {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white/95 px-6 py-3 backdrop-blur">
      <p className="text-xs font-semibold text-muted-foreground">
        Preview. Use <strong className="text-qc-navy">Download PDF</strong>, then choose
        &ldquo;Save as PDF&rdquo; as the printer.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-qc-navy hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-qc-navy px-4 text-xs font-extrabold text-white shadow-sm hover:bg-qc-blue"
        >
          <Download className="h-3.5 w-3.5 text-qc-yellow" />
          Download PDF
        </button>
      </div>
    </div>
  );
}
