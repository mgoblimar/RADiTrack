import type { ReactNode } from "react";
import type {
  FilteredKpiResult,
  ModalityTatOverviewItem,
  ModalityTatStats,
  TwelveMonthTrendResult,
} from "@/app/actions";
import type { SevenDayAnalyticsData } from "@/lib/dashboard-types";
import {
  MODALITY_CONFIG,
  ModalityCode,
  TRIAGE_CONFIG,
  modalityRank,
} from "@/lib/enums";
import type { ReportConfig } from "@/lib/report-params";
import { ReportModalityChart, ReportTrendChart } from "./ReportCharts";

interface ReportDocumentProps {
  config: ReportConfig;
  rangeLabel: string;
  generatedAt: Date;
  kpi: FilteredKpiResult | null;
  modalityTat: ModalityTatOverviewItem[] | null;
  daily: SevenDayAnalyticsData | null;
  trend: TwelveMonthTrendResult | null;
}

const hours = (minutes: number) => Number((minutes / 60).toFixed(1));
const fmtHours = (h: number, hasData = h > 0) => (hasData ? `${h} hrs` : "—");

function modalityLabel(code: string): string {
  return MODALITY_CONFIG[code as ModalityCode]?.shortName ?? code;
}

function statsFor(item: ModalityTatOverviewItem, triage: ReportConfig["triage"]): ModalityTatStats {
  if (triage === "OPD") return item.opd ?? item.all;
  if (triage === "ER") return item.er ?? item.emergency ?? item.all;
  if (triage === "IN") return item.inpatient ?? item.all;
  return item.all;
}

function percentChange(current: number, previous: number): number | null {
  if (current <= 0 || previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function changeText(change: number | null): string {
  if (change === null) return "—";
  if (change === 0) return "No change";
  return change < 0 ? `${Math.abs(change)}% faster` : `+${change}% longer`;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="report-section mt-7">
      <h2 className="border-b-2 border-qc-navy pb-1.5 text-base font-extrabold uppercase tracking-wide text-qc-navy">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-[11px] text-slate-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="bg-qc-navy text-white">
          {head.map((h, i) => (
            <th key={h} className={`px-2.5 py-1.5 font-bold ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-slate-200 even:bg-slate-50">
            {row.map((cell, i) => (
              <td key={i} className={`px-2.5 py-1.5 ${i === 0 ? "text-left font-semibold text-qc-navy" : "text-right font-mono"}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function KpiSection({ kpi }: { kpi: FilteredKpiResult }) {
  const cards = [
    { label: "Total exams", value: kpi.totalVolume.toLocaleString(), note: `Prior: ${kpi.priorTotalVolume.toLocaleString()}` },
    { label: "Finalized reports", value: kpi.finalizedCount.toLocaleString(), note: `Pending: ${kpi.pendingReadingCount}` },
    { label: "Average Turnaround Time", value: fmtHours(kpi.avgTatHours), note: `Median: ${fmtHours(hours(kpi.medianTatMinutes))}` },
    { label: "Reports within SLA", value: `${kpi.pctOnTime}%`, note: `${kpi.breachCount} breached` },
  ];
  return (
    <Section
      title="Executive summary"
      subtitle={`${kpi.presetLabel} (${kpi.dateRangeFormatted}) compared with ${kpi.priorPeriodLabel} (${kpi.priorDateRangeFormatted})`}
    >
      <div className="grid grid-cols-4 gap-2.5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{c.label}</p>
            <p className="mt-1 text-xl font-extrabold text-qc-navy">{c.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{c.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-slate-600">
        Average Turnaround Time vs prior period: <strong>{changeText(kpi.tatDeltaPercent)}</strong> · Exam volume vs prior period:{" "}
        <strong>{kpi.volumeDeltaPercent === null ? "—" : `${kpi.volumeDeltaPercent > 0 ? "+" : ""}${kpi.volumeDeltaPercent}%`}</strong>
      </p>
    </Section>
  );
}

function ModalitySections({ items, config, showChart, showSla }: {
  items: ModalityTatOverviewItem[]; config: ReportConfig; showChart: boolean; showSla: boolean;
}) {
  const sorted = [...items].sort((a, b) => modalityRank(a.modality.toUpperCase()) - modalityRank(b.modality.toUpperCase()));
  const rows = sorted.map((item) => {
    const stats = statsFor(item, config.triage);
    const avg = hours(stats.avgTat);
    const target = config.triage !== "ALL" && stats.target ? hours(stats.target) : null;
    return { item, stats, avg, target };
  });
  const triageText = config.triage === "ALL" ? "all patient categories" : TRIAGE_CONFIG[config.triage]?.label ?? config.triage;

  return (
    <>
      {showChart && (
        <Section title="Turnaround Time by modality" subtitle={`Average exam-to-sign time for ${triageText}${config.modality !== "ALL" ? `; ${modalityLabel(config.modality)} highlighted` : ""}.`}>
          <ReportModalityChart
            rows={rows.map(({ item, stats, avg, target }) => ({
              label: modalityLabel(item.modality.toUpperCase()),
              avgTatHours: avg,
              targetHours: target,
              volume: stats.volume,
              isHighlighted: item.modality.toUpperCase() === config.modality,
            }))}
          />
          <Table
            head={["Modality", "Finalized", "Average TAT", "Target SLA"]}
            rows={rows.map(({ item, stats, avg, target }) => [
              modalityLabel(item.modality.toUpperCase()), stats.volume, fmtHours(avg, stats.volume > 0), target === null ? "—" : `${target} hrs`,
            ])}
          />
        </Section>
      )}
      {showSla && (
        <Section title="SLA compliance by modality" subtitle={`Average Turnaround Time against each modality's SLA target for ${triageText}.`}>
          <Table
            head={["Modality", "Average TAT", "SLA target", "Difference", "Status"]}
            rows={rows.map(({ item, stats, avg }) => {
              const target = stats.target ? hours(stats.target) : null;
              const diff = target !== null && stats.volume > 0 ? Number((avg - target).toFixed(1)) : null;
              return [
                modalityLabel(item.modality.toUpperCase()),
                fmtHours(avg, stats.volume > 0),
                target === null ? "—" : `${target} hrs`,
                diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff} hrs`,
                diff === null ? "No data" : diff > 0 ? "Over target" : "Within target",
              ];
            })}
          />
        </Section>
      )}
    </>
  );
}

function DailySection({ daily, config }: { daily: SevenDayAnalyticsData; config: ReportConfig }) {
  const data = config.modality === "ALL" ? daily.all : daily.byModality[config.modality] ?? daily.all;
  const days = [...data.dayRows].reverse();
  return (
    <Section title="Daily breakdown" subtitle={`7 days ending on the report end date · ${config.modality === "ALL" ? "all modalities" : modalityLabel(config.modality)}`}>
      <Table
        head={["Day", "Exams", "OPD", "Inpatient", "Emergency", "Finalized", "Pending", "Average TAT"]}
        rows={days.map((d) => [
          `${d.dayLabel} ${d.formattedDate}`, d.totalExams, d.opdCount, d.inCount, d.erCount, d.finalizedCount, d.pendingCount, fmtHours(d.avgTatHours),
        ])}
      />
    </Section>
  );
}

function TrendSection({ trend, config }: { trend: TwelveMonthTrendResult; config: ReportConfig }) {
  const code = config.modality;
  const isAll = code === "ALL";
  const months = trend.months.map((m) => {
    const cur = isAll ? m.avgTatHours : m[`${code}_avgTatHours`] ?? 0;
    const prev = isAll ? m.previousMonthAvgTatHours ?? 0 : m[`prevMonth_${code}_avgTatHours`] ?? 0;
    const prior = isAll ? m.priorYearAvgTatHours ?? 0 : m[`prior_${code}_avgTatHours`] ?? 0;
    const volume = isAll ? m.totalFinalized : m[`${code}_totalFinalized`] ?? 0;
    return { m, cur, prev, prior, volume };
  });
  const seriesLabel = isAll ? "Average Turnaround Time" : `${modalityLabel(code)} Turnaround Time`;

  return (
    <Section title="12-month trend" subtitle={`${trend.selectedPeriodLabel} ending on the report end date. Changes compare each month with the previous month and with the same month last year.`}>
      <ReportTrendChart
        seriesLabel={seriesLabel}
        points={months.map(({ m, cur, prior }) => ({ label: m.fullMonth, avgTatHours: cur, priorYearAvgTatHours: prior }))}
      />
      <Table
        head={["Month", "Finalized", "Average TAT", "Previous month", "Change vs previous month", "Change vs same month last year"]}
        rows={months.map(({ m, cur, prev, prior, volume }) => [
          m.fullMonth, volume, fmtHours(cur), fmtHours(prev), changeText(percentChange(cur, prev)), changeText(percentChange(cur, prior)),
        ])}
      />
    </Section>
  );
}

export function ReportDocument({ config, rangeLabel, generatedAt, kpi, modalityTat, daily, trend }: ReportDocumentProps) {
  const has = (id: ReportConfig["sections"][number]) => config.sections.includes(id);
  const scope = [
    config.modality === "ALL" ? "All modalities" : modalityLabel(config.modality),
    config.triage === "ALL" ? "All patient categories" : TRIAGE_CONFIG[config.triage]?.label ?? config.triage,
  ].join(" · ");

  return (
    <article className="report-sheet mx-auto my-6 w-[210mm] max-w-full bg-white px-[14mm] py-[12mm] text-slate-800 shadow-lg print:my-0 print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b-4 border-qc-yellow pb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-qc-blue">RADiTrack · Department of Radiology</p>
          <h1 className="mt-1 text-2xl font-extrabold text-qc-navy">{config.title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-600">{rangeLabel} · {scope}</p>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <p>Generated {generatedAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>
          {config.preparedBy && <p className="mt-0.5">Prepared by <strong className="text-qc-navy">{config.preparedBy}</strong></p>}
        </div>
      </header>

      {config.notes && (
        <p className="mt-4 whitespace-pre-line rounded-lg border-l-4 border-qc-blue bg-slate-50 px-3 py-2 text-[11px] text-slate-700">{config.notes}</p>
      )}

      {has("kpi") && kpi && <KpiSection kpi={kpi} />}
      {modalityTat && (has("modality") || has("sla")) && (
        <ModalitySections items={modalityTat} config={config} showChart={has("modality")} showSla={has("sla")} />
      )}
      {has("daily") && daily && <DailySection daily={daily} config={config} />}
      {has("trend") && trend && <TrendSection trend={trend} config={config} />}

      <footer className="mt-8 border-t border-slate-200 pt-2 text-[9px] text-slate-400">
        TAT = Turnaround Time (exam completed to report signed). SLA = Service Level Agreement target. Figures are generated from RADiTrack records at the time shown above.
      </footer>
    </article>
  );
}
