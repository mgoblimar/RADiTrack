"use client";

// In-app RADiTrack guide (Configurations → RADiTrack Guide).
// Text lives in ./guide-content.ts (mirrors docs/computations.md).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, ShieldCheck, Timer } from "lucide-react";
import type { ModalityConfigItem } from "@/app/actions/configurations";
import { MODALITY_CONFIG, MODALITY_ORDER, type ModalityCode } from "@/lib/enums";
import {
  CHECKING_STEPS,
  FORMULAS,
  FORMULA_NOTES,
  GUIDE_SECTIONS,
  PARTS,
  ROUTINE,
  TERMS,
  WINDOWS,
  type MathPart,
} from "./guide-content";

interface Governance {
  hospitalName: string;
  department: string;
  phiZeroCompliance: boolean;
  dohAccreditation: string;
  systemVersion: string;
}

interface RaditrackGuideProps {
  modalities: ModalityConfigItem[];
  governance: Governance;
}

type SectionId = (typeof GUIDE_SECTIONS)[number]["id"];

/** Renders text and stacked fractions (numerator over a line over denominator). */
function MathLine({ parts, ruleClass }: { parts: MathPart[]; ruleClass: string }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          // Short text beside a fraction ("× 100") stays on one line; a lone sentence may wrap.
          <span key={i} className={parts.length > 1 ? "whitespace-nowrap" : undefined}>{part}</span>
        ) : (
          <span key={i} className="inline-flex shrink-0 flex-col items-center whitespace-nowrap px-0.5 align-middle leading-tight" aria-label={`${part.num} divided by ${part.den}`}>
            <span className={`w-full border-b ${ruleClass} px-1 pb-0.5 text-center`}>{part.num}</span>
            <span className="px-1 pt-0.5 text-center">{part.den}</span>
          </span>
        ),
      )}
    </>
  );
}

const CATEGORIES = [
  { code: "OPD", label: "Outpatient", chip: "border-slate-200 bg-slate-50 text-slate-600" },
  { code: "IN", label: "Inpatient", chip: "border-qc-blue/15 bg-qc-blue/5 text-qc-blue" },
  { code: "ER", label: "Emergency", chip: "border-red-200 bg-red-50 text-qc-red" },
] as const;

/* ---------------------------------------------------------------------------
   Navigation helpers
--------------------------------------------------------------------------- */

/** The dashboard scrolls the window, so jump with scrollIntoView (honours scroll-margin). */
function scrollToSection(id: SectionId) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

/** Highlights the section currently in the reading band of the screen. */
function useActiveSection(): SectionId {
  const [active, setActive] = useState<SectionId>(GUIDE_SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    GUIDE_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

function GuideNav({ active }: { active: SectionId }) {
  const chipBarRef = useRef<HTMLElement>(null);

  // Keep the highlighted chip visible in the swipeable bar (horizontal only).
  useEffect(() => {
    const bar = chipBarRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!bar || !chip || bar.offsetParent === null) return;
    const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <>
      {/* Phone / tablet: swipeable chips pinned under the app bar */}
      <nav
        ref={chipBarRef}
        aria-label="Guide sections"
        className="sticky top-[65px] z-30 -mx-4 overflow-x-auto border-b border-[#E4E8F1] bg-[#F7F9FC]/95 px-4 py-2.5 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden"
      >
        <ul className="flex w-max gap-2">
          {GUIDE_SECTIONS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                data-section={id}
                onClick={() => scrollToSection(id)}
                aria-current={active === id ? "true" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow ${
                  active === id ? "bg-qc-navy text-white" : "border border-[#DDE3F2] bg-white text-qc-navy"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active === id ? "text-qc-yellow" : "text-qc-blue"}`} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop: sticky "On this page" list */}
      <nav aria-label="Guide sections" className="sticky top-6 hidden self-start lg:block">
        <p className="mb-2 px-3 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          On this page
        </p>

        <ul className="space-y-0.5 border-l-2 border-[#E4E8F1]">
          {GUIDE_SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollToSection(id)}
                aria-current={active === id ? "true" : undefined}
                className={`-ml-0.5 flex w-full items-center border-l-2 px-3 py-2 text-left text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-yellow ${
                  active === id
                    ? "border-qc-yellow bg-qc-yellow/10 text-qc-navy"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-qc-navy"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Building blocks
--------------------------------------------------------------------------- */

function Section({ id, index, title, intro, children }: { id: SectionId; index: number; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="scroll-mt-[140px] outline-none lg:scroll-mt-6">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-xs font-black text-qc-yellow [text-shadow:0_0_1px_#050E40]">{String(index).padStart(2, "0")}</span>
        <h3 id={`${id}-title`} className="text-lg font-extrabold tracking-tight text-qc-navy sm:text-xl">{title}</h3>
      </div>
      {intro && <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-600">{intro}</p>}
      {children}
    </section>
  );
}

const cardBase = "rounded-[20px] border border-[#E4E8F1] bg-white shadow-[0_2px_10px_rgba(24,41,140,0.04)]";

/* ---------------------------------------------------------------------------
   Guide
--------------------------------------------------------------------------- */

export function RaditrackGuide({ modalities, governance }: RaditrackGuideProps) {
  const active = useActiveSection();
  const [query, setQuery] = useState("");

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? TERMS.filter(([t, d]) => `${t} ${d}`.toLowerCase().includes(q)) : TERMS;
  }, [query]);

  const targetHours = (code: ModalityCode, triage: string) => {
    const minutes = modalities.find((m) => m.modalityCode === code)?.slaConfigs.find((s) => s.triageLevel === triage)?.targetTatMinutes;
    return minutes === undefined ? "—" : `${Number((minutes / 60).toFixed(1))} h`;
  };

  const privacyRows: [string, string, string][] = [
    ["Zero-PII mode", "No patient names or identifying details are used on the dashboard.", governance.phiZeroCompliance ? "Enabled" : "Review"],
    ["Examination identifiers", "Records use de-identified accession numbers.", "De-identified"],
    ["TAT timestamps", "Measured from exam completion (T₁) to report sign-off (T₂).", "T₁ → T₂"],
    ["Hospital", governance.hospitalName, governance.dohAccreditation],
    ["Test and simulation data", "Kept separate from real data; a banner shows whenever test data is loaded.", "Isolated"],
    ["System version", "", governance.systemVersion],
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
<section className="relative overflow-hidden rounded-[26px] border border-white/70 bg-qc-navy px-5 py-7 text-white shadow-[0_12px_32px_rgba(5,14,64,0.12)] sm:px-7 sm:py-8">
  <div className="relative max-w-4xl">
    <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
      How to use RADiTrack
    </h2>

    <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/80">
      Learn how to review examinations, track turnaround time,
      and understand department performance.
    </p>
  </div>
</section>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <GuideNav active={active} />

        <div className="mt-4 space-y-10 lg:mt-0">
          <Section id="guide-start" index={1} title="Start here: the daily routine">
            <ol className="relative grid gap-3 2xl:grid-cols-5">
              <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-[#DDE3F2] 2xl:hidden" />
              <span aria-hidden className="absolute left-6 right-6 top-[19px] hidden h-0.5 bg-[#DDE3F2] 2xl:block" />
              {ROUTINE.map((step, i) => (
                <li key={step.title} className="relative flex gap-3 2xl:flex-col">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#F7F9FC] bg-qc-yellow text-sm font-black text-qc-navy">{i + 1}</span>
                  <span className={`${cardBase} block flex-1 p-3.5`}>
                    <span className="block text-sm font-extrabold text-qc-navy">{step.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="guide-parts" index={2} title="Parts of RADiTrack">
            <div className="grid gap-3 md:grid-cols-2">
              {PARTS.map(({ icon: Icon, title, summary, items }, i) => (
                <article key={title} className={`${cardBase} p-4 sm:p-5 ${i === 0 ? "md:col-span-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-blue/[0.07] text-qc-blue"><Icon className="h-5 w-5" /></span>
                    <div>
                      <h4 className="text-base font-extrabold text-qc-navy">{title}</h4>
                      <p className="text-xs text-slate-500">{summary}</p>
                    </div>
                  </div>
                  <ul className={`mt-3 grid gap-x-6 gap-y-1.5 text-[13px] leading-relaxed text-slate-600 ${i === 0 ? "md:grid-cols-2" : ""}`}>
                    {items.map((item) => (
                      <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-qc-yellow" />{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Section>

          <Section id="guide-formulas" index={3} title="How the numbers are calculated">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FORMULAS.map((f) => (
                <article key={f.name} className={`${cardBase} flex flex-col p-4`}>
                  <h4 className="text-[13px] font-extrabold uppercase tracking-wider text-qc-blue">{f.name}</h4>
                  <p className="mt-2.5 flex items-center justify-center gap-x-1.5 rounded-xl bg-qc-navy px-3 py-2.5 text-center text-[13px] font-bold leading-snug text-white">
                    <MathLine parts={f.formula} ruleClass="border-white" />
                  </p>
                  <div className="mt-2.5 text-xs leading-relaxed text-slate-500">
                    <p><span className="font-extrabold text-slate-700">Example: </span>{f.example[0]}</p>
                    {f.example.length > 1 && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold text-slate-700">
                        <MathLine parts={f.example.slice(1)} ruleClass="border-slate-500" />
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5 rounded-2xl border border-qc-yellow/40 bg-qc-yellow/[0.08] p-4 text-xs leading-relaxed text-slate-700">
              {FORMULA_NOTES.map((note) => <li key={note} className="flex gap-2"><span className="font-black text-qc-navy">•</span>{note}</li>)}
            </ul>
          </Section>

          <Section id="guide-terms" index={4} title="Terms">
            <label className="relative mb-4 block max-w-sm">
              <span className="sr-only">Search terms</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a term, e.g. backlog"
                className="h-11 w-full rounded-2xl border border-[#DDE3F2] bg-white pl-10 pr-4 text-sm font-semibold text-qc-navy outline-none focus:border-qc-blue/30 focus:ring-4 focus:ring-qc-blue/[0.07]"
              />
            </label>
            {filteredTerms.length === 0 ? (
              <p className="text-sm text-slate-500">No term matches &ldquo;{query}&rdquo;.</p>
            ) : (
              <dl className="grid gap-2.5 md:grid-cols-2">
                {filteredTerms.map(([term, meaning]) => (
                  <div key={term} className={`${cardBase} p-3.5`}>
                    <dt className="text-sm font-extrabold text-qc-navy">{term}</dt>
                    <dd className="mt-0.5 text-xs leading-relaxed text-slate-500">{meaning}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Section>

          <Section id="guide-sla" index={5} title="Your SLA targets" intro="Live from the SLA targets tab. A report breaches when its TAT is longer than the target for its modality and patient category.">
            {/* Table on tablet/desktop */}
            <div className={`${cardBase} hidden overflow-hidden sm:block`}>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FBFCFE] text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Modality</th>
                    {CATEGORIES.map((c) => <th key={c.code} className="px-4 py-3"><span className={`rounded-full border px-2 py-0.5 ${c.chip}`}>{c.label}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODALITY_ORDER.map((code) => (
                    <tr key={code} className="border-t border-[#EEF1F6]">
                      <td className="px-4 py-3 font-extrabold text-qc-navy">{MODALITY_CONFIG[code].shortName}</td>
                      {CATEGORIES.map((c) => <td key={c.code} className="px-4 py-3 font-mono font-bold text-slate-700">{targetHours(code, c.code)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards on phones */}
            <div className="grid gap-2.5 sm:hidden">
              {MODALITY_ORDER.map((code) => (
                <div key={code} className={`${cardBase} p-3.5`}>
                  <p className="text-sm font-extrabold text-qc-navy">{MODALITY_CONFIG[code].shortName}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2">
                    {CATEGORIES.map((c) => (
                      <div key={c.code} className={`rounded-xl border px-2 py-1.5 text-center ${c.chip}`}>
                        <dt className="text-xs font-extrabold uppercase">{c.label}</dt>
                        <dd className="font-mono text-sm font-black">{targetHours(code, c.code)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Section>

          <Section id="guide-windows" index={6} title="Time windows" intro="The filter bar's time window decides which exams are counted, by study date/time. Each window is compared with the period just before it.">
            <div className={`${cardBase} hidden overflow-hidden sm:block`}>
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FBFCFE] text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3">Window</th><th className="px-4 py-3">Includes</th><th className="px-4 py-3">Compared with</th></tr>
                </thead>
                <tbody>
                  {WINDOWS.map((w) => (
                    <tr key={w.name} className="border-t border-[#EEF1F6]">
                      <td className="px-4 py-3 font-extrabold text-qc-navy">{w.name}</td>
                      <td className="px-4 py-3 text-slate-600">{w.includes}</td>
                      <td className="px-4 py-3 text-slate-500">{w.compared}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2.5 sm:hidden">
              {WINDOWS.map((w) => (
                <div key={w.name} className={`${cardBase} p-3.5`}>
                  <p className="text-sm font-extrabold text-qc-navy">{w.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{w.includes}</p>
                  <p className="mt-1 text-[13px] text-slate-500">Compared with: {w.compared}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">The 7-day table always shows the latest 7 days, whatever the window. The 12-month trend&apos;s &ldquo;Last 12 months&rdquo; view ends in the window&apos;s last month, never later than today.</p>
          </Section>

          <Section id="guide-privacy" index={7} title="Data & privacy">
            <dl className={`${cardBase} divide-y divide-[#EEF1F6]`}>
              {privacyRows.map(([label, text, value]) => (
                <div key={label} className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-sm font-bold text-qc-navy">
                      {label === "Zero-PII mode" && <ShieldCheck className="h-4 w-4 text-qc-blue" />}
                      {label}
                    </dt>
                    {text && <dd className="mt-0.5 text-xs text-slate-500">{text}</dd>}
                  </div>
                  <span className="text-xs font-bold text-slate-500 sm:max-w-[240px] sm:text-right">{value}</span>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="guide-checking" index={8} title="Checking the numbers" intro="Prove the calculations with the 100-exam validation dataset, whose correct answers are known in advance.">
            <ol className="grid gap-3 sm:grid-cols-2">
              {CHECKING_STEPS.map((step, i) => (
                <li key={step.title} className={`${cardBase} flex gap-3 p-4`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-qc-navy text-xs font-black text-qc-yellow">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-extrabold text-qc-navy">{step.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Timer className="h-3.5 w-3.5" /> Load the test data after 00:30; today&apos;s test exams finish by then.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}