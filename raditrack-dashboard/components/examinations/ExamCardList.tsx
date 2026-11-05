"use client";

// Phone/tablet view of the Examinations list: one card per exam instead of a
// 1,060px-wide table. Shows the same facts as the table for the open tab.

import { AlertTriangle, CheckCircle2, FileSpreadsheet, RotateCcw } from "lucide-react";
import { signOffReportAction, type FilteredExaminationItem } from "@/app/actions";
import { EditExamDialog } from "@/components/dashboard/EditExamDialog";
import { DeleteExamDialog } from "@/components/dashboard/DeleteExamDialog";
import { MODALITY_CONFIG, TRIAGE_CONFIG, type ModalityCode, type TriageLevel } from "@/lib/enums";

type StatusTab = "backlog" | "finalized" | "all";

interface ExamCardListProps {
  items: FilteredExaminationItem[];
  statusTab: StatusTab;
  /** Called after a report is signed so the list and other tabs refresh. */
  onSigned: () => void;
  onResetFilters: () => void;
  className?: string;
}

const CATEGORY_CHIP: Record<string, string> = {
  ER: "border-red-200 bg-red-50 text-qc-red",
  IN: "border-qc-blue/15 bg-qc-blue/5 text-qc-blue",
  OPD: "border-border bg-background text-muted-foreground",
};

const hours = (h: number | null | undefined, minutes: number | null | undefined) =>
  h !== null && h !== undefined ? `${h}h` : minutes ? `${Number((minutes / 60).toFixed(1))}h` : "—";

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 truncate font-mono text-xs font-bold ${tone ?? "text-qc-navy"}`}>{value}</dd>
    </div>
  );
}

function SignButton({ examId, onSigned }: { examId: string; onSigned: () => void }) {
  return (
    <form
      action={async (formData) => {
        await signOffReportAction(formData);
        onSigned();
      }}
      className="flex-1"
    >
      <input type="hidden" name="examId" value={examId} />
      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-qc-yellow px-4 text-sm font-extrabold text-qc-navy shadow-[0_3px_8px_rgba(242,203,73,0.18)] transition-colors hover:bg-[#eac13d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-navy"
      >
        <CheckCircle2 className="h-4 w-4" />
        Sign report
      </button>
    </form>
  );
}

function ExamCard({ item, statusTab, onSigned }: { item: FilteredExaminationItem; statusTab: StatusTab; onSigned: () => void }) {
  const dwell = hours(item.dwellHours, item.dwellMinutes);
  const tat = hours(item.tatHours, item.tatMinutes);
  const target = item.targetTatHours !== null && item.targetTatHours !== undefined ? `${item.targetTatHours}h` : "—";

  const status = item.isFinalized
    ? item.isBreached
      ? { text: "Signed late", cls: "border-red-200 bg-red-50 text-qc-red", icon: AlertTriangle }
      : { text: "Met SLA", cls: "border-qc-blue/15 bg-qc-blue/5 text-qc-blue", icon: CheckCircle2 }
    : item.isBreached
      ? { text: "Past SLA", cls: "border-red-200 bg-red-50 text-qc-red", icon: AlertTriangle }
      : { text: "Waiting", cls: "border-qc-orange/20 bg-orange-50 text-qc-orange", icon: null };
  const StatusIcon = status.icon;

  return (
    <li className={`rounded-2xl border p-4 ${item.isBreached ? "border-red-100 bg-red-50/30" : "border-[#E4E8F1] bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-extrabold text-qc-navy">{item.identifier}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-lg border border-[#E1E5EE] bg-[#FAFBFD] px-2 py-0.5 text-[11px] font-extrabold text-qc-navy">
              {MODALITY_CONFIG[item.modalityCode as ModalityCode]?.shortName ?? item.modalityCode}
            </span>
            <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-extrabold ${CATEGORY_CHIP[item.triageLevel] ?? CATEGORY_CHIP.OPD}`}>
              {TRIAGE_CONFIG[item.triageLevel as TriageLevel]?.label ?? item.triageLevel}
            </span>
            {item.isCarryOver && (
              <span className="rounded-lg border border-qc-blue/15 bg-qc-blue/5 px-2 py-0.5 text-[11px] font-extrabold text-qc-blue">Carry-over</span>
            )}
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${status.cls}`}>
          {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
          {status.text}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-[#EEF1F6] pt-3 sm:grid-cols-4">
        <Fact label="Study date" value={item.studyDateFormatted} />
        {item.isFinalized ? (
          <>
            <Fact label="TAT" value={tat} tone={item.isBreached ? "text-qc-red" : "text-qc-blue"} />
            {statusTab !== "all" && <Fact label="Completed" value={item.examCompletedAtFormatted ?? "—"} />}
            <Fact label="Signed" value={item.reportSignedAtFormatted ?? "—"} />
          </>
        ) : (
          <>
            <Fact label="Waiting" value={dwell} tone={item.isBreached ? "text-qc-red" : "text-qc-orange"} />
            <Fact label="SLA target" value={target} />
          </>
        )}
      </dl>

      {!item.isFinalized && (
        <div className="mt-3 flex items-center gap-2">
          {statusTab === "backlog" && (
            <>
              <EditExamDialog item={item} />
              <DeleteExamDialog examId={item.examId} identifier={item.identifier} />
            </>
          )}
          <SignButton examId={item.examId} onSigned={onSigned} />
        </div>
      )}
    </li>
  );
}

export function ExamCardList({ items, statusTab, onSigned, onResetFilters, className = "" }: ExamCardListProps) {
  if (items.length === 0) {
    return (
      <div className={`flex flex-col items-center px-5 py-14 text-center ${className}`}>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#F2F5FF_0%,#FFF9E9_100%)] text-qc-blue">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-extrabold text-qc-navy">No records found</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">Adjust the filters or search term to view more examinations.</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-[#DDE3F2] bg-white px-4 text-sm font-extrabold text-qc-blue"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </button>
      </div>
    );
  }

  return (
    <ul className={`space-y-2.5 p-3 sm:p-4 ${className}`}>
      {items.map((item) => (
        <ExamCard key={item.examId} item={item} statusTab={statusTab} onSigned={onSigned} />
      ))}
    </ul>
  );
}
