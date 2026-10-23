"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import {
  fetchYearlyTrendAction,
  TwelveMonthTrendResult,
  MonthTrendData,
} from "@/app/actions";
import { ModalityCode, TriageLevel } from "@/lib/enums";

interface Props {
  data: TwelveMonthTrendResult;
}

/* =========================================================
   RADiTrack palette
========================================================= */

const QC_NAVY = "#050E40";
const QC_BLUE = "#18298C";
const QC_PURPLE = "#7652B8";
const QC_MUTED = "#64748B";
const QC_GRID = "#E2E8F0";

interface ModalityConfig {
  code: ModalityCode;
  label: string;
  color: string;
  lightColor: string;
  dotClass: string;
}

const MODALITIES: ModalityConfig[] = [
  { code: ModalityCode.XRAY, label: "X-ray", color: "#2563EB", lightColor: "#93C5FD", dotClass: "bg-blue-500" },
  { code: ModalityCode.US, label: "Ultrasound", color: "#059669", lightColor: "#6EE7B7", dotClass: "bg-emerald-500" },
  { code: ModalityCode.CT, label: "CT-Scan", color: "#D97706", lightColor: "#FCD34D", dotClass: "bg-amber-500" },
  { code: ModalityCode.MRI, label: "MRI", color: "#7C3AED", lightColor: "#C4B5FD", dotClass: "bg-purple-500" },
  { code: ModalityCode.MAMMO, label: "Mammogram", color: "#DB2777", lightColor: "#F9A8D4", dotClass: "bg-pink-500" },
];

const TRIAGE_OPTIONS = [
  { value: "ALL", label: "All Triages" },
  { value: TriageLevel.OPD, label: "Outpatient (OPD)" },
  { value: TriageLevel.IN, label: "Inpatient (IN)" },
  { value: TriageLevel.ER, label: "Emergency (ER)" },
];

export function TwelveMonthTrendChart({
  data: initialData,
}: Props) {
  const [data, setData] =
    useState<TwelveMonthTrendResult>(
      initialData,
    );

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [selectedPeriod, setSelectedPeriod] =
    useState<string>(
      initialData.selectedPeriod ||
        "rolling",
    );

  const [selectedTriage, setSelectedTriage] = useState<"ALL" | TriageLevel>("ALL");

  const [comparePriorYear, setComparePriorYear] =
    useState(true);

  const [selectedModality, setSelectedModality] =
    useState<"ALL" | "MULTI" | ModalityCode>("ALL");

  const [isSettingsOpen, setIsSettingsOpen] =
    useState(false);

  const [isPending, startTransition] =
    useTransition();

  const settingsButtonRef =
    useRef<HTMLButtonElement>(null);

  const settingsPopoverRef =
    useRef<HTMLDivElement>(null);

  const [settingsPosition, setSettingsPosition] =
    useState({
      top: 0,
      left: 0,
      maxHeight: 0,
      openAbove: false,
    });

  /* =========================================================
     Current year
  ========================================================= */

  const currentTargetYear = useMemo(() => {
    if (selectedPeriod === "rolling") {
      return new Date().getFullYear();
    }

    const parsed = Number.parseInt(
      selectedPeriod,
      10,
    );

    return Number.isNaN(parsed)
      ? new Date().getFullYear()
      : parsed;
  }, [selectedPeriod]);

  /* =========================================================
     Position settings popover
  ========================================================= */

  const updateSettingsPosition = () => {
    if (!settingsButtonRef.current) {
      return;
    }

    const rect =
      settingsButtonRef.current.getBoundingClientRect();

    const width = 320;
    const viewportPadding = 12;
    const gap = 8;
    const minPopoverHeight = 220;

    const viewportHeight =
      window.innerHeight;

    let left =
      rect.right - width;

    left = Math.max(
      viewportPadding,
      Math.min(
        left,
        window.innerWidth -
          width -
          viewportPadding,
      ),
    );

    const spaceBelow =
      viewportHeight -
      rect.bottom -
      viewportPadding -
      gap;

    const spaceAbove =
      rect.top -
      viewportPadding -
      gap;

    /*
     * Prefer opening below when there is enough room.
     * Otherwise open upward.
     */
    const shouldOpenAbove =
      spaceBelow < minPopoverHeight &&
      spaceAbove > spaceBelow;

    const availableHeight =
      Math.max(
        180,
        Math.min(
          600,
          shouldOpenAbove
            ? spaceAbove
            : spaceBelow,
        ),
      );

    const top = shouldOpenAbove
      ? Math.max(
          viewportPadding,
          rect.top -
            gap -
            Math.min(
              availableHeight,
              Math.max(
                180,
                spaceAbove,
              ),
            ),
        )
      : rect.bottom + gap;

    setSettingsPosition({
      top,
      left,
      maxHeight: availableHeight,
      openAbove: shouldOpenAbove,
    });
  };

  /* =========================================================
     Settings listeners
  ========================================================= */

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    updateSettingsPosition();

    const handleResize = () => {
      updateSettingsPosition();
    };

    const handleScroll = () => {
      updateSettingsPosition();
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );
    };
  }, [isSettingsOpen]);

  /*
   * Recalculate once the portal has actually rendered.
   * This lets us use the real popover height and
   * keep it fully inside the viewport.
   */
  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (
        !settingsButtonRef.current ||
        !settingsPopoverRef.current
      ) {
        return;
      }

      const buttonRect =
        settingsButtonRef.current.getBoundingClientRect();

      const popoverRect =
        settingsPopoverRef.current.getBoundingClientRect();

      const width = 320;
      const viewportPadding = 12;
      const gap = 8;

      let left =
        buttonRect.right - width;

      left = Math.max(
        viewportPadding,
        Math.min(
          left,
          window.innerWidth -
            width -
            viewportPadding,
        ),
      );

      const popoverHeight =
        popoverRect.height;

      const spaceBelow =
        window.innerHeight -
        buttonRect.bottom -
        viewportPadding -
        gap;

      const spaceAbove =
        buttonRect.top -
        viewportPadding -
        gap;

      const fitsBelow =
        popoverHeight <= spaceBelow;

      const fitsAbove =
        popoverHeight <= spaceAbove;

      let openAbove = false;
      let top = buttonRect.bottom + gap;

      if (!fitsBelow && fitsAbove) {
        openAbove = true;
        top =
          buttonRect.top -
          gap -
          popoverHeight;
      } else if (!fitsBelow && !fitsAbove) {
        /*
         * Neither direction has enough room.
         * Use whichever side has more room and let
         * the inner content scroll.
         */
        openAbove =
          spaceAbove > spaceBelow;

        if (openAbove) {
          top = Math.max(
            viewportPadding,
            buttonRect.top -
              gap -
              Math.min(
                popoverHeight,
                spaceAbove,
              ),
          );
        } else {
          top = buttonRect.bottom + gap;
        }
      }

      const availableHeight = Math.max(
        180,
        Math.min(
          popoverHeight,
          openAbove
            ? spaceAbove
            : spaceBelow,
          600,
        ),
      );

      setSettingsPosition({
        top,
        left,
        maxHeight: availableHeight,
        openAbove,
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    isSettingsOpen,
    selectedPeriod,
    selectedTriage,
    comparePriorYear,
  ]);

  /* =========================================================
     Close settings popover
  ========================================================= */

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      const target =
        event.target as Node;

      if (
        settingsButtonRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      if (
        settingsPopoverRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsSettingsOpen(false);
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isSettingsOpen]);

  /* =========================================================
     Select period & triage filters
  ========================================================= */

  const handleFilterChange = (
    newPeriod = selectedPeriod,
    newTriage = selectedTriage
  ) => {
    setSelectedPeriod(newPeriod);
    setSelectedTriage(newTriage);

    startTransition(async () => {
      try {
        const result = await fetchYearlyTrendAction(newPeriod, newTriage);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch yearly trend with filters:", error);
      }
    });
  };

  const handleSelectPeriod = (period: string) => {
    handleFilterChange(period, selectedTriage);
  };

  const handleSelectTriage = (triage: "ALL" | TriageLevel) => {
    handleFilterChange(selectedPeriod, triage);
  };

  /* =========================================================
     Step year
  ========================================================= */

  const handleStepYear = (
    step: number,
  ) => {
    handleSelectPeriod(
      String(
        currentTargetYear + step,
      ),
    );
  };

  /* =========================================================
     Format annual TAT
  ========================================================= */

  const formatAnnualTat = (
    hours: number,
    _minutes?: number,
  ) => {
    return `${hours}h`;
  };

  /* =========================================================
     Current historical label
  ========================================================= */

  const periodLabel =
    selectedPeriod === "rolling"
      ? "Rolling 12 months"
      : `Calendar year ${selectedPeriod}`;

  const triageLabel =
    TRIAGE_OPTIONS.find((t) => t.value === selectedTriage)?.label || "All Triages";

  /* =========================================================
     Modality-specific metrics & YoY state
  ========================================================= */

  const isModalitySpecific =
    selectedModality !== "ALL" && selectedModality !== "MULTI";

  const activeModalityConfig = isModalitySpecific
    ? MODALITIES.find((m) => m.code === selectedModality)
    : null;

  const activeModalitySummary = isModalitySpecific
    ? data.byModalityAnnual?.[selectedModality]
    : null;

  const displayAnnualAvgHours = isModalitySpecific
    ? (activeModalitySummary?.annualAvgTatHours ?? 0)
    : data.annualAvgTatHours;

  const displayAnnualAvgMinutes = isModalitySpecific
    ? (activeModalitySummary?.annualAvgTatMinutes ?? 0)
    : data.annualAvgTatMinutes;

  const displayAnnualFinalized = isModalitySpecific
    ? (activeModalitySummary?.annualTotalFinalized ?? 0)
    : data.annualTotalFinalized;

  const displayPctChange = isModalitySpecific
    ? (activeModalitySummary?.pctChangeTat ?? 0)
    : data.pctChangeTat;

  const displayPriorFinalized = isModalitySpecific
    ? (activeModalitySummary?.priorAnnualTotalFinalized ?? 0)
    : data.priorAnnualTotalFinalized;

  const hasPriorComparison =
    comparePriorYear && displayPriorFinalized > 0;

  const isFaster = displayPctChange < 0;
  const isSlower = displayPctChange > 0;

  /* =========================================================
     Custom tooltip
  ========================================================= */

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (
      !active ||
      !payload ||
      payload.length === 0
    ) {
      return null;
    }

    const point = payload[0]?.payload as MonthTrendData;
    if (!point) {
      return null;
    }

    if (selectedModality === "ALL") {
      const currentTat = point.avgTatHours;
      const priorTat = point.priorYearAvgTatHours ?? 0;
      let yoy: number | null = null;
      if (comparePriorYear && priorTat > 0 && currentTat > 0) {
        yoy = Number((((currentTat - priorTat) / priorTat) * 100).toFixed(1));
      }

      return (
        <div className="min-w-[240px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {point.totalFinalized} finalized
            </span>
          </div>

          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-bold text-qc-blue">
                <span className="h-2 w-2 rounded-full bg-qc-blue" />
                Overall Avg TAT ({triageLabel})
              </span>
              <strong className="font-mono text-qc-navy">{currentTat}h</strong>
            </div>

            {comparePriorYear && priorTat > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: QC_PURPLE }}>
                  <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: QC_PURPLE }} />
                  {data.priorPeriodLabel}
                </span>
                <strong className="font-mono text-qc-navy">{priorTat}h</strong>
              </div>
            )}

            {yoy !== null && (
              <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
                <span className="text-muted-foreground">YoY Change</span>
                <span className={`font-extrabold ${yoy < 0 ? "text-qc-blue" : yoy > 0 ? "text-qc-red" : "text-muted-foreground"}`}>
                  {yoy < 0 ? `${Math.abs(yoy)}% faster` : yoy > 0 ? `+${yoy}% longer` : "No change"}
                </span>
              </div>
            )}

            {point.byModality && (
              <div className="mt-2.5 border-t border-border pt-2">
                <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Modality Contribution
                </p>
                <div className="space-y-1">
                  {MODALITIES.map((m) => {
                    const stats = point.byModality?.[m.code];
                    if (!stats) return null;
                    return (
                      <div key={m.code} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-muted-foreground">{m.label}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-qc-navy">
                            {stats.totalFinalized > 0 ? `${stats.avgTatHours}h` : "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({stats.totalFinalized})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (selectedModality === "MULTI") {
      return (
        <div className="min-w-[260px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {point.totalFinalized} finalized
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between border-b border-border/70 pb-1.5 text-[11px]">
              <span className="flex items-center gap-1.5 font-extrabold text-qc-navy">
                <span className="h-2 w-2 rounded-full bg-qc-navy" />
                Overall Hospital Avg
              </span>
              <strong className="font-mono text-qc-navy">{point.avgTatHours}h</strong>
            </div>

            {MODALITIES.map((m) => {
              const curHours = point[`${m.code}_avgTatHours`] ?? 0;
              const priHours = point[`prior_${m.code}_avgTatHours`] ?? 0;
              const vol = point[`${m.code}_totalFinalized`] ?? 0;
              return (
                <div key={m.code} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="font-medium text-qc-navy">{m.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-qc-navy">
                      {vol > 0 ? `${curHours}h` : "—"}
                    </span>
                    {comparePriorYear && priHours > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        (pri: {priHours}h)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const activeMod = MODALITIES.find((m) => m.code === selectedModality);
    const modLabel = activeMod?.label ?? selectedModality;
    const modColor = activeMod?.color ?? QC_BLUE;
    const curTat = point[`${selectedModality}_avgTatHours`] ?? 0;
    const priTat = point[`prior_${selectedModality}_avgTatHours`] ?? 0;
    const modVol = point[`${selectedModality}_totalFinalized`] ?? 0;
    const overallTat = point.avgTatHours;

    let yoy: number | null = null;
    if (comparePriorYear && priTat > 0 && curTat > 0) {
      yoy = Number((((curTat - priTat) / priTat) * 100).toFixed(1));
    }

    const diffFromOverall = curTat > 0 && overallTat > 0 ? Number((curTat - overallTat).toFixed(1)) : null;

    return (
      <div className="min-w-[230px] rounded-xl border border-border bg-white p-3 text-xs shadow-[0_18px_45px_rgba(5,14,64,0.14)]">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="font-extrabold text-qc-navy">{point.fullMonth || label}</p>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {modVol} {modLabel} finalized
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: modColor }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: modColor }} />
              {modLabel} TAT
            </span>
            <strong className="font-mono text-qc-navy">{modVol > 0 ? `${curTat}h` : "—"}</strong>
          </div>

          {comparePriorYear && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold" style={{ color: modColor }}>
                <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: modColor }} />
                {modLabel} ({data.priorPeriodLabel})
              </span>
              <strong className="font-mono text-qc-navy">{priTat > 0 ? `${priTat}h` : "—"}</strong>
            </div>
          )}

          {yoy !== null && (
            <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
              <span className="text-muted-foreground">YoY Change</span>
              <span className={`font-extrabold ${yoy < 0 ? "text-qc-blue" : yoy > 0 ? "text-qc-red" : "text-muted-foreground"}`}>
                {yoy < 0 ? `${Math.abs(yoy)}% faster` : yoy > 0 ? `+${yoy}% longer` : "No change"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border/80 pt-1.5 text-[11px]">
            <span className="text-muted-foreground">Hospital Overall TAT</span>
            <span className="font-mono font-bold text-qc-navy">{overallTat}h</span>
          </div>

          {diffFromOverall !== null && (
            <div className="text-[10px] text-muted-foreground">
              {diffFromOverall === 0
                ? "Equal to hospital average"
                : diffFromOverall > 0
                  ? `+${diffFromOverall}h higher than hospital average`
                  : `${Math.abs(diffFromOverall)}h lower than hospital average`}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* =========================================================
     Settings popover
  ========================================================= */

  const settingsPopover =
    isSettingsOpen && createPortal(
      <div
        ref={settingsPopoverRef}
        role="dialog"
        aria-label="Historical trend options"
        style={{
          position: "fixed",
          top: settingsPosition.top,
          left: settingsPosition.left,
          width: 320,
          maxHeight:
            settingsPosition.maxHeight > 0
              ? settingsPosition.maxHeight
              : "calc(100vh - 24px)",
          zIndex: 9999,
        }}
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.14)]"
      >

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-extrabold text-qc-navy">
            Trend options
          </span>

          <button
            type="button"
            onClick={() =>
              setIsSettingsOpen(false)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
            aria-label="Close trend options"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable settings content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="space-y-4">

            {/* Triage Filter */}
            <div>
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Triage Level
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {TRIAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectTriage(opt.value as any)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-bold transition-all ${
                      selectedTriage === opt.value
                        ? "bg-qc-navy text-white shadow-sm"
                        : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedTriage === opt.value && (
                      <Check className="h-3.5 w-3.5 text-qc-yellow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Rolling */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Period
              </p>

              <button
                type="button"
                onClick={() =>
                  handleSelectPeriod(
                    "rolling",
                  )
                }
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-bold transition-colors ${
                  selectedPeriod ===
                  "rolling"
                    ? "bg-qc-yellow text-qc-navy"
                    : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                }`}
              >
                <span>
                  Rolling 12 months
                </span>

                {selectedPeriod ===
                  "rolling" && (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Years */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Calendar year
              </p>

              <div className="flex items-center rounded-xl border border-border bg-background p-1">

                <button
                  type="button"
                  onClick={() =>
                    handleStepYear(-1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                  title="Previous year"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <select
                  value={
                    selectedPeriod ===
                    "rolling"
                      ? String(
                          new Date().getFullYear(),
                        )
                      : selectedPeriod
                  }
                  onChange={(event) =>
                    handleSelectPeriod(
                      event.target.value,
                    )
                  }
                  className="min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-extrabold text-qc-navy outline-none"
                >
                  {data.availableYears.map(
                    (year) => (
                      <option
                        key={year}
                        value={String(
                          year,
                        )}
                      >
                        {year}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    handleStepYear(1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
                  title="Next year"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {data.availableYears.map(
                  (year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() =>
                        handleSelectPeriod(
                          String(year),
                        )
                      }
                      className={`rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${
                        selectedPeriod ===
                        String(year)
                          ? "bg-qc-blue text-white"
                          : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                      }`}
                    >
                      {year}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Comparison */}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                Comparison
              </p>

              <button
                type="button"
                onClick={() =>
                  setComparePriorYear(
                    (previous) =>
                      !previous,
                  )
                }
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  comparePriorYear
                    ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Prior year
                </span>

                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    comparePriorYear
                      ? "border-qc-blue bg-qc-blue text-white"
                      : "border-border bg-card"
                  }`}
                >
                  {comparePriorYear && (
                    <Check className="h-3 w-3" />
                  )}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>,
      document.body
    ) ; null;

  return (
    <div className="min-w-0">

      {/* =====================================================
          COMPACT CONTROLS
      ===================================================== */}

      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Period navigation */}
        <div className="flex min-w-0 items-center gap-1.5">

          <button
            type="button"
            onClick={() =>
              handleStepYear(-1)
            }
            disabled={
              isPending ||
              selectedPeriod ===
                "rolling"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
            title="Previous year"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2">
            <Calendar className="h-3.5 w-3.5 text-qc-blue" />

            <span className="max-w-[260px] truncate text-[11px] font-extrabold text-qc-navy">
              {periodLabel} • {triageLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              handleStepYear(1)
            }
            disabled={
              isPending ||
              selectedPeriod ===
                "rolling"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-qc-navy disabled:opacity-40"
            title="Next year"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {isPending && (
            <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-qc-yellow" />
          )}

        </div>

        {/* Summary + options */}
        <div className="flex flex-wrap items-center gap-2">

          <div className="hidden items-center gap-3 rounded-xl bg-background px-3 py-2 sm:flex">

            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {isModalitySpecific && activeModalityConfig ? `${activeModalityConfig.label} Avg` : "Avg TAT"}
              </span>

              <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
                {formatAnnualTat(
                  displayAnnualAvgHours,
                  displayAnnualAvgMinutes,
                )}
              </span>
            </div>

            {hasPriorComparison && (
              <>
                <span className="h-3.5 w-px bg-border" />

                <div className="flex items-center gap-1.5">

                  {isFaster ? (
                    <TrendingDown className="h-3 w-3 text-qc-blue" />
                  ) : isSlower ? (
                    <TrendingUp className="h-3 w-3 text-qc-red" />
                  ) : null}

                  <span
                    className={`text-xs font-extrabold ${
                      isFaster
                        ? "text-qc-blue"
                        : isSlower
                          ? "text-qc-red"
                          : "text-muted-foreground"
                    }`}
                  >
                    {displayPctChange === 0
                      ? "No change"
                      : `${Math.abs(displayPctChange)}% ${
                          isFaster ? "faster" : "longer"
                        }`}
                  </span>

                </div>
              </>
            )}

          </div>

          {/* Quick toggle for prior 12-month comparison */}
          <button
            type="button"
            onClick={() => setComparePriorYear((prev) => !prev)}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
              comparePriorYear
                ? "border-qc-purple/30 bg-qc-purple/10 text-qc-purple shadow-sm"
                : "border-white/80 bg-white/75 text-muted-foreground hover:bg-white hover:text-qc-navy"
            }`}
            title="Toggle dashed line comparison with prior 12-month period"
            aria-pressed={comparePriorYear}
          >
            <span
              className="h-0 w-4 border-t-2 border-dashed"
              style={{
                borderColor: comparePriorYear ? QC_PURPLE : "#94A3B8",
              }}
            />
            <span>
              {selectedPeriod === "rolling" ? "Compare Prior 12m" : "Compare Prior Year"}
            </span>
            <span
              className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                comparePriorYear ? "bg-qc-purple text-white" : "border border-border/80 text-transparent"
              }`}
            >
              ✓
            </span>
          </button>

          <button
            ref={settingsButtonRef}
            type="button"
            onClick={() =>
              setIsSettingsOpen(
                (previous) =>
                  !previous,
              )
            }
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-extrabold transition-all ${
              isSettingsOpen || selectedTriage !== "ALL"
                ? "border-qc-navy bg-qc-navy text-white shadow-[0_6px_14px_rgba(5,14,64,0.12)]"
                : "border-white/80 bg-white/75 text-qc-navy shadow-sm hover:border-qc-blue/10 hover:bg-white hover:text-qc-navy"
            }`}
            aria-expanded={
              isSettingsOpen
            }
            aria-haspopup="dialog"
          >
            <CalendarDays
              className={`h-3.5 w-3.5 ${
                isSettingsOpen || selectedTriage !== "ALL"
                  ? "text-qc-yellow"
                  : "text-qc-blue"
              }`}
            />

            <span>View</span>

            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isSettingsOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

        </div>
      </div>

      {/* Settings portal */}
      {typeof document !==
        "undefined" &&
        isSettingsOpen &&
        createPortal(
          settingsPopover,
          document.body,
        )}

      {/* =====================================================
          MODALITY FILTER BAR
      ===================================================== */}

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Modality:
          </span>

          <button
            type="button"
            onClick={() => setSelectedModality("ALL")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
              selectedModality === "ALL"
                ? "bg-qc-navy text-white shadow-sm ring-1 ring-qc-navy"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${selectedModality === "ALL" ? "bg-qc-yellow" : "bg-qc-blue"}`} />
            Overall Avg
          </button>

          <button
            type="button"
            onClick={() => setSelectedModality("MULTI")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
              selectedModality === "MULTI"
                ? "bg-qc-navy text-white shadow-sm ring-1 ring-qc-navy"
                : "border border-border/80 bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
            }`}
          >
            <Layers className="h-3 w-3 text-qc-yellow" />
            All Modalities
          </button>

          {MODALITIES.map((m) => {
            const isSelected = selectedModality === m.code;
            return (
              <button
                key={m.code}
                type="button"
                onClick={() => setSelectedModality(m.code)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "text-white shadow-sm ring-1 ring-black/10"
                    : "border border-border/80 bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
                }`}
                style={{
                  backgroundColor: isSelected ? m.color : undefined,
                  borderColor: isSelected ? m.color : undefined,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: isSelected ? "#FFFFFF" : m.color,
                  }}
                />
                {m.label}
              </button>
            );
          })}
        </div>

        {isModalitySpecific && activeModalityConfig && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Showing: <strong className="text-qc-navy">{activeModalityConfig.label}</strong> vs Overall Hospital Avg
            </span>
          </div>
        )}
      </div>

      {/* =====================================================
          Small-screen summary
      ===================================================== */}

      <div className="flex items-center justify-between border-b border-border py-3 sm:hidden">

        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {isModalitySpecific && activeModalityConfig ? `${activeModalityConfig.label} Avg` : "Avg TAT"}
          </span>

          <span className="ml-1.5 text-xs font-extrabold text-qc-navy">
            {formatAnnualTat(
              displayAnnualAvgHours,
              displayAnnualAvgMinutes,
            )}
          </span>
        </div>

        {hasPriorComparison && (
          <span
            className={`text-[10px] font-extrabold ${
              isFaster
                ? "text-qc-blue"
                : isSlower
                  ? "text-qc-red"
                  : "text-muted-foreground"
            }`}
          >
            {displayPctChange === 0
              ? "No change"
              : `${Math.abs(displayPctChange)}% ${
                  isFaster ? "faster" : "longer"
                }`}
          </span>
        )}

      </div>

      {/* =====================================================
          Trend chart
      ===================================================== */}

      <div className="pt-4">

        <div className="h-[285px] w-full sm:h-[320px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data.months}
              margin={{
                top: 8,
                right: 8,
                left: -8,
                bottom: 0,
              }}
            >

              <defs>
                <linearGradient
                  id="raditrackHistoricalGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={QC_BLUE}
                    stopOpacity={0.16}
                  />

                  <stop
                    offset="95%"
                    stopColor={QC_BLUE}
                    stopOpacity={0}
                  />
                </linearGradient>

                {MODALITIES.map((m) => (
                  <linearGradient
                    key={`grad-${m.code}`}
                    id={`grad-${m.code}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={m.color}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="95%"
                      stopColor={m.color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={QC_GRID}
                vertical={false}
              />

              <XAxis
                dataKey="monthLabel"
                stroke={QC_MUTED}
                fontSize={10}
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dy={6}
              />

              <YAxis
                stroke={QC_MUTED}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(value) =>
                  `${value}h`
                }
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
              />

              {/* =====================================================
                  1. OVERALL VIEW (selectedModality === "ALL")
              ===================================================== */}
              {selectedModality === "ALL" && (
                <>
                  {/* Current period (straight/solid line) */}
                  <Area
                    type="monotone"
                    dataKey="avgTatHours"
                    stroke={QC_BLUE}
                    strokeWidth={2.5}
                    fill="url(#raditrackHistoricalGradient)"
                    fillOpacity={1}
                    name={data.selectedPeriodLabel}
                    dot={{
                      r: 2.5,
                      fill: QC_BLUE,
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 4,
                    }}
                  />

                  {/* Prior period (dashed line) */}
                  {comparePriorYear && (
                    <Line
                      type="monotone"
                      dataKey="priorYearAvgTatHours"
                      stroke={QC_PURPLE}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{
                        r: 2.5,
                        fill: QC_PURPLE,
                        strokeWidth: 0,
                      }}
                      activeDot={{
                        r: 4,
                      }}
                      name={data.priorPeriodLabel}
                    />
                  )}
                </>
              )}

              {/* =====================================================
                  2. MULTI-MODALITY VIEW (selectedModality === "MULTI")
              ===================================================== */}
              {selectedModality === "MULTI" && (
                <>
                  {/* Overall benchmark line */}
                  <Line
                    type="monotone"
                    dataKey="avgTatHours"
                    stroke={QC_NAVY}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    name="Overall Avg"
                    dot={{
                      r: 2,
                      fill: QC_NAVY,
                    }}
                  />

                  {/* Modality straight/solid lines */}
                  {MODALITIES.map((m) => (
                    <Line
                      key={`line-${m.code}`}
                      type="monotone"
                      dataKey={`${m.code}_avgTatHours`}
                      stroke={m.color}
                      strokeWidth={2.5}
                      dot={{
                        r: 2.5,
                        fill: m.color,
                        strokeWidth: 0,
                      }}
                      activeDot={{
                        r: 4,
                      }}
                      name={m.label}
                    />
                  ))}

                  {/* Prior modality dashed lines */}
                  {comparePriorYear &&
                    MODALITIES.map((m) => (
                      <Line
                        key={`pri-line-${m.code}`}
                        type="monotone"
                        dataKey={`prior_${m.code}_avgTatHours`}
                        stroke={m.color}
                        strokeWidth={1.8}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{
                          r: 3.5,
                        }}
                        name={`${m.label} (Prior)`}
                      />
                    ))}
                </>
              )}

              {/* =====================================================
                  3. SPECIFIC MODALITY VIEW
              ===================================================== */}
              {isModalitySpecific && activeModalityConfig && (
                <>
                  {/* Overall hospital benchmark reference line */}
                  <Line
                    type="monotone"
                    dataKey="avgTatHours"
                    stroke="#94A3B8"
                    strokeWidth={1.8}
                    strokeDasharray="3 3"
                    name="Hospital Average"
                    dot={false}
                  />

                  {/* Selected modality straight/solid line with gradient fill */}
                  <Area
                    type="monotone"
                    dataKey={`${selectedModality}_avgTatHours`}
                    stroke={activeModalityConfig.color}
                    strokeWidth={3}
                    fill={`url(#grad-${selectedModality})`}
                    fillOpacity={1}
                    dot={{
                      r: 3.5,
                      fill: activeModalityConfig.color,
                      stroke: "#FFFFFF",
                      strokeWidth: 1.5,
                    }}
                    activeDot={{
                      r: 5,
                    }}
                    name={`${activeModalityConfig.label} (Current)`}
                  />

                  {/* Selected modality prior period dashed line */}
                  {comparePriorYear && (
                    <Line
                      type="monotone"
                      dataKey={`prior_${selectedModality}_avgTatHours`}
                      stroke={activeModalityConfig.color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{
                        r: 2.5,
                        fill: activeModalityConfig.color,
                      }}
                      activeDot={{
                        r: 4,
                      }}
                      name={`${activeModalityConfig.label} (Prior)`}
                    />
                  )}
                </>
              )}

            </AreaChart>
          </ResponsiveContainer>

        </div>

      </div>

      {/* =====================================================
          Dynamic legend
      ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[10px]">

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

          {selectedModality === "ALL" && (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-qc-navy">
                <span className="h-2.5 w-2.5 rounded-full bg-qc-blue" />
                {data.selectedPeriodLabel} (Solid Straight Line)
              </span>

              {comparePriorYear && (
                <span
                  className="flex items-center gap-1.5 font-semibold"
                  style={{
                    color: QC_PURPLE,
                  }}
                >
                  <span
                    className="h-0 w-5 border-t-2 border-dashed"
                    style={{
                      borderColor: QC_PURPLE,
                    }}
                  />
                  {data.priorPeriodLabel} (Dashed Line)
                </span>
              )}
            </>
          )}

          {selectedModality === "MULTI" && (
            <>
              <span className="flex items-center gap-1.5 font-bold text-qc-navy">
                <span className="h-0 w-4 border-t-2 border-dashed border-qc-navy" />
                Hospital Overall Avg
              </span>

              {MODALITIES.map((m) => (
                <span key={m.code} className="flex items-center gap-1.5 font-semibold text-qc-navy">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label} (Solid)
                </span>
              ))}

              {comparePriorYear && (
                <span className="font-semibold text-muted-foreground italic">
                  * Dashed lines: {data.priorPeriodLabel}
                </span>
              )}
            </>
          )}

          {isModalitySpecific && activeModalityConfig && (
            <>
              <span className="flex items-center gap-1.5 font-semibold text-qc-navy">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeModalityConfig.color }} />
                {activeModalityConfig.label} ({data.selectedPeriodLabel} — Solid Straight Line)
              </span>

              {comparePriorYear && (
                <span
                  className="flex items-center gap-1.5 font-semibold"
                  style={{ color: activeModalityConfig.color }}
                >
                  <span
                    className="h-0 w-5 border-t-2 border-dashed"
                    style={{ borderColor: activeModalityConfig.color }}
                  />
                  {activeModalityConfig.label} ({data.priorPeriodLabel} — Dashed Line)
                </span>
              )}

              <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                <span className="h-0 w-4 border-t-2 border-dotted border-slate-400" />
                Hospital Overall Average Benchmark
              </span>
            </>
          )}

        </div>

        <span className="font-semibold text-muted-foreground">
          {displayAnnualFinalized} finalized exams
        </span>

      </div>

    </div>
  );
}