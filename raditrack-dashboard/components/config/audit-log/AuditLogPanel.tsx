"use client";

// Audit log tab (Def-UPL-11): exam changes and uploads, for administrators.

import { useState } from "react";
import { FileUp, History } from "lucide-react";
import { ExamChangesView } from "./ExamChangesView";
import { UploadsView } from "./UploadsView";

type View = "changes" | "uploads";

export function AuditLogPanel() {
  const [view, setView] = useState<View>("changes");
  const [batchId, setBatchId] = useState<string | null>(null);

  const viewChanges = (id: string) => {
    setBatchId(id);
    setView("changes");
  };

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#DDE3F2] bg-white shadow-[0_4px_20px_rgba(0,53,122,0.05)]">
      <header className="flex flex-col gap-4 border-b border-[#E7EAF1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_65%,#FFF9E9_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h3 className="text-xl font-extrabold tracking-tight text-qc-navy">AUDIT LOG</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">
            Every change to an examination and every upload, newest first, with who made it and the values before and after.
            Entries cannot be edited or deleted.
          </p>
        </div>
        <div role="tablist" aria-label="Audit log view" className="inline-flex w-fit shrink-0 rounded-2xl border border-slate-200 bg-white p-1">
          <ViewButton active={view === "changes"} onClick={() => setView("changes")} icon={<History className="h-4 w-4" />} label="Exam changes" />
          <ViewButton active={view === "uploads"} onClick={() => setView("uploads")} icon={<FileUp className="h-4 w-4" />} label="Uploads" />
        </div>
      </header>

      {view === "changes" ? (
        <ExamChangesView key={batchId ?? "all"} batchId={batchId} onClearBatch={() => setBatchId(null)} />
      ) : (
        <UploadsView onViewChanges={viewChanges} />
      )}
    </section>
  );
}

function ViewButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow ${
        active ? "bg-qc-navy text-white shadow-sm" : "text-slate-500 hover:text-qc-navy"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
