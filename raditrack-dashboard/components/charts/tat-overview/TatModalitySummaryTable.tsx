"use client";

import type { ModalityTatDisplayItem } from "./types";
import { modalityLabel } from "./TatChartTicks";

interface TatModalitySummaryTableProps {
  rows: readonly ModalityTatDisplayItem[];
  /** Modality picked in the filter bar; its row is highlighted. */
  highlightModality: string | null;
  /** True when a patient category is selected, so each row has an SLA target. */
  hasTargetSla: boolean;
}

function hours(value: number, hasData: boolean): string {
  return hasData ? `${value} hrs` : "—";
}

/**
 * Exams, signed, pending, average and median TAT per modality, matching the
 * proposal's "TAT by modality" table. Pending exams never count toward TAT.
 */
export function TatModalitySummaryTable({
  rows,
  highlightModality,
  hasTargetSla,
}: TatModalitySummaryTableProps) {
  const totals = rows.reduce(
    (acc, row) => ({
      exams: acc.exams + row.examCount,
      signed: acc.signed + row.volume,
    }),
    { exams: 0, signed: 0 },
  );

  return (
    <div className="border-t border-border px-3 pb-4 pt-3 sm:px-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Exams and turnaround time by modality</caption>
          <thead>
            <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="border-b border-border px-3 py-2">Modality</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right">Exams</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right">Signed</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right">Pending</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right">Average TAT</th>
              <th scope="col" className="border-b border-border px-3 py-2 text-right">Median TAT</th>
              {hasTargetSla && (
                <th scope="col" className="border-b border-border px-3 py-2 text-right">Target</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const hasData = row.volume > 0;
              const pending = Math.max(row.examCount - row.volume, 0);
              const isBreach = hasTargetSla && hasData && row.target !== null && row.avgTat > row.target;
              const isHighlighted =
                highlightModality !== null && row.modality.toUpperCase() === highlightModality;

              return (
                <tr
                  key={row.modality}
                  className={isHighlighted ? "bg-qc-yellow/15" : "even:bg-muted/30"}
                >
                  <th scope="row" className="border-b border-border/60 px-3 py-2 text-left font-extrabold text-qc-navy">
                    {modalityLabel(row.modality)}
                  </th>
                  <td className="border-b border-border/60 px-3 py-2 text-right font-mono font-bold text-qc-navy">
                    {row.examCount}
                  </td>
                  <td className="border-b border-border/60 px-3 py-2 text-right font-mono text-qc-navy">
                    {row.volume}
                  </td>
                  <td
                    className={`border-b border-border/60 px-3 py-2 text-right font-mono ${
                      pending > 0 ? "font-bold text-qc-orange" : "text-muted-foreground"
                    }`}
                  >
                    {pending}
                  </td>
                  <td
                    className={`border-b border-border/60 px-3 py-2 text-right font-mono font-bold ${
                      isBreach ? "text-[#C53030]" : hasData ? "text-qc-navy" : "text-muted-foreground"
                    }`}
                  >
                    {hours(row.avgTat, hasData)}
                  </td>
                  <td
                    className={`border-b border-border/60 px-3 py-2 text-right font-mono font-bold ${
                      hasData ? "text-qc-navy" : "text-muted-foreground"
                    }`}
                  >
                    {hours(row.medianTat, hasData)}
                  </td>
                  {hasTargetSla && (
                    <td className="border-b border-border/60 px-3 py-2 text-right font-mono text-muted-foreground">
                      {row.target !== null ? `${row.target} hrs` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-qc-navy">
              <th scope="row" className="px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wider">
                Total
              </th>
              <td className="px-3 py-2 text-right font-mono font-extrabold">{totals.exams}</td>
              <td className="px-3 py-2 text-right font-mono font-extrabold">{totals.signed}</td>
              <td className="px-3 py-2 text-right font-mono font-extrabold">
                {Math.max(totals.exams - totals.signed, 0)}
              </td>
              <td colSpan={hasTargetSla ? 3 : 2} className="px-3 py-2 text-right text-xs text-muted-foreground">
                Only signed reports have a TAT.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
