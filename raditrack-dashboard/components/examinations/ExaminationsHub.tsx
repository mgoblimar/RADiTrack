"use client";

import {
  useState,
  useTransition,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Layers,
  ChevronDown,
  Filter,
  X,
  SlidersHorizontal,
} from "lucide-react";

import { ExportCsvButton } from "@/components/staff/ExportCsvButton";
import { EditExamDialog } from "@/components/dashboard/EditExamDialog";
import { DeleteExamDialog } from "@/components/dashboard/DeleteExamDialog";

import {
  fetchFilteredExaminationsAction,
  signOffReportAction,
  type FilteredExaminationsResult,
} from "@/app/actions";

import {
  MODALITY_CONFIG,
  ModalityCode,
  TriageLevel,
  UrgencyLevel,
} from "@/lib/enums";

interface ExaminationsHubProps {
  queue: any[];
  finalizedCount: number;
}

type StatusTab =
  | "backlog"
  | "finalized"
  | "all";

type DatePreset =
  | "all"
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

export function ExaminationsHub({
  queue,
  finalizedCount: initialFinalizedCount,
}: ExaminationsHubProps) {
  // =========================================================
  // State
  // =========================================================

  const [statusTab, setStatusTab] =
    useState<StatusTab>("backlog");

  const [datePreset, setDatePreset] =
    useState<DatePreset>("all");

  const todayStr = new Date()
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] =
    useState<string>(todayStr);

  const [endDate, setEndDate] =
    useState<string>(todayStr);

  const [modalityCode, setModalityCode] =
    useState<string>("ALL");

  const [searchTerm, setSearchTerm] =
    useState<string>("");

  const [result, setResult] =
    useState<FilteredExaminationsResult | null>(
      null,
    );

  const [isPending, startTransition] =
    useTransition();

  const [isFilterOpen, setIsFilterOpen] =
    useState(false);

  const filterRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // Close filter popover
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsFilterOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );
    }

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
  }, [isFilterOpen]);

  // =========================================================
  // Load examinations
  // =========================================================

  const loadExaminations = useCallback(() => {
    startTransition(async () => {
      try {
        const data =
          await fetchFilteredExaminationsAction({
            statusType: statusTab,
            datePreset,
            startDate:
              datePreset === "custom"
                ? startDate
                : undefined,
            endDate:
              datePreset === "custom"
                ? endDate
                : undefined,
            modalityCode,
            searchTerm,
          });

        setResult(data);
      } catch (error) {
        console.error(
          "Failed to load examinations:",
          error,
        );
      }
    });
  }, [
    statusTab,
    datePreset,
    startDate,
    endDate,
    modalityCode,
    searchTerm,
  ]);

  useEffect(() => {
    loadExaminations();
  }, [loadExaminations]);

  // =========================================================
  // Reset filters
  // =========================================================

  const handleResetFilters = () => {
    setDatePreset("all");
    setModalityCode("ALL");
    setSearchTerm("");
    setStartDate(todayStr);
    setEndDate(todayStr);
    setIsFilterOpen(false);
  };

  // =========================================================
  // Results
  // =========================================================

  const items = result?.items ?? [];

  const summary = result?.summary ?? {
    totalFinalized:
      initialFinalizedCount,
    totalBacklog: queue.length,
    avgTatMinutes: 0,
    avgTatHours: 0,
    totalBreached: 0,
  };

  // =========================================================
  // Display helpers
  // =========================================================

  const getTriageBadgeClass = (
    level: string,
  ) => {
    switch (level) {
      case TriageLevel.ER:
        return "border-red-200 bg-red-50 text-qc-red";

      case TriageLevel.IN:
        return "border-qc-blue/15 bg-qc-blue/5 text-qc-blue";

      case TriageLevel.OPD:
        return "border-border bg-background text-muted-foreground";

      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  const getUrgencyBadgeClass = (
    urgency: string,
  ) => {
    switch (urgency) {
      case UrgencyLevel.STAT:
        return "border-qc-orange/20 bg-orange-50 text-qc-orange";

      case UrgencyLevel.ROUTINE:
        return "border-border bg-background text-muted-foreground";

      default:
        return "border-border bg-background text-muted-foreground";
    }
  };

  const getStatusBadgeClass = (
    isFinalized: boolean,
  ) => {
    return isFinalized
      ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
      : "border-qc-orange/20 bg-orange-50 text-qc-orange";
  };

  const hasActiveFilters =
    datePreset !== "all" ||
    modalityCode !== "ALL" ||
    searchTerm.trim() !== "";

  const datePresets: {
    id: DatePreset;
    label: string;
  }[] = [
    {
      id: "all",
      label: "All dates",
    },
    {
      id: "today",
      label: "Today",
    },
    {
      id: "week",
      label: "This week",
    },
    {
      id: "month",
      label: "This month",
    },
    {
      id: "year",
      label: "This year",
    },
    {
      id: "custom",
      label: "Custom",
    },
  ];

  // =========================================================
  // Render
  // =========================================================

  return (
    <div className="space-y-5">
      {/* =====================================================
          COMPACT OPERATIONS HEADER
          ===================================================== */}

      <section className="rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-qc-navy">
                  Examination registry
                </h2>

                <span className="rounded-full bg-qc-blue/5 px-2 py-0.5 text-[10px] font-extrabold text-qc-blue">
                  {result?.totalCount ?? 0} records
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Search, review, and manage
                examination workflow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportCsvButton />
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTROL BAR
          ===================================================== */}

      <section className="rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 p-3 sm:p-4">
          {/* Status navigation */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-background p-1">
              {/* Backlog */}
              <button
                type="button"
                onClick={() =>
                  setStatusTab("backlog")
                }
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                  statusTab === "backlog"
                    ? "bg-qc-yellow text-qc-navy shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-qc-navy"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />

                Backlog

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    statusTab === "backlog"
                      ? "bg-qc-navy/10 text-qc-navy"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {summary.totalBacklog}
                </span>
              </button>

              {/* Finalized */}
              <button
                type="button"
                onClick={() =>
                  setStatusTab("finalized")
                }
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                  statusTab === "finalized"
                    ? "bg-qc-yellow text-qc-navy shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-qc-navy"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />

                Finalized

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    statusTab === "finalized"
                      ? "bg-qc-navy/10 text-qc-navy"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {summary.totalFinalized}
                </span>
              </button>

              {/* All */}
              <button
                type="button"
                onClick={() =>
                  setStatusTab("all")
                }
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                  statusTab === "all"
                    ? "bg-qc-yellow text-qc-navy shadow-sm"
                    : "text-muted-foreground hover:bg-card hover:text-qc-navy"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />

                All

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    statusTab === "all"
                      ? "bg-qc-navy/10 text-qc-navy"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {result?.totalCount ?? 0}
                </span>
              </button>
            </div>

            {/* Search + filters */}
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <div className="relative min-w-0 flex-1 lg:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="text"
                  placeholder="Search accession ID"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  className="h-10 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-xs font-semibold text-qc-navy outline-none transition-colors placeholder:text-muted-foreground focus:border-qc-blue/25 focus:bg-card focus:ring-2 focus:ring-qc-blue/10"
                />
              </div>

              <div
                className="relative"
                ref={filterRef}
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsFilterOpen(
                      (previous) =>
                        !previous,
                    )
                  }
                  className={`flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-extrabold transition-colors ${
                    isFilterOpen ||
                    hasActiveFilters
                      ? "border-qc-blue/20 bg-qc-blue/5 text-qc-blue"
                      : "border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-blue"
                  }`}
                  aria-expanded={
                    isFilterOpen
                  }
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    Filters
                  </span>

                  {hasActiveFilters && (
                    <span className="h-1.5 w-1.5 rounded-full bg-qc-orange" />
                  )}

                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      isFilterOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {/* =================================================
                    FILTER POPOVER
                    ================================================= */}

                {isFilterOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-3xl border border-border bg-card shadow-[0_20px_50px_rgba(5,14,64,0.12)] animate-in fade-in zoom-in-95 duration-150 sm:w-[390px]">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-qc-blue" />

                        <span className="text-sm font-extrabold text-qc-navy">
                          Filters
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setIsFilterOpen(
                            false,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-qc-navy"
                        aria-label="Close filters"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-4 p-4">
                      {/* Date */}
                      <div>
                        <div className="mb-2 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-qc-blue" />

                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                            Date
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {datePresets.map(
                            (preset) => (
                              <button
                                key={
                                  preset.id
                                }
                                type="button"
                                onClick={() =>
                                  setDatePreset(
                                    preset.id,
                                  )
                                }
                                className={`rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors ${
                                  datePreset ===
                                  preset.id
                                    ? "bg-qc-blue text-white"
                                    : "border border-border bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-blue"
                                }`}
                              >
                                {
                                  preset.label
                                }
                              </button>
                            ),
                          )}
                        </div>
                      </div>

                      {/* Modality */}
                      <div>
                        <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                          Modality
                        </div>

                        <select
                          value={
                            modalityCode
                          }
                          onChange={(event) =>
                            setModalityCode(
                              event.target
                                .value,
                            )
                          }
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-qc-navy outline-none focus:border-qc-blue/25 focus:ring-2 focus:ring-qc-blue/10"
                        >
                          <option value="ALL">
                            All modalities
                          </option>

                          {Object.entries(
                            MODALITY_CONFIG,
                          ).map(
                            ([
                              code,
                              config,
                            ]) => (
                              <option
                                key={code}
                                value={code}
                              >
                                {
                                  config.shortName
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {/* Custom dates */}
                      {datePreset ===
                        "custom" && (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              Start
                            </span>

                            <input
                              type="date"
                              value={
                                startDate
                              }
                              onChange={(event) =>
                                setStartDate(
                                  event.target
                                    .value,
                                )
                              }
                              className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-[11px] font-semibold text-qc-navy outline-none focus:border-qc-blue/25"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              End
                            </span>

                            <input
                              type="date"
                              value={endDate}
                              onChange={(event) =>
                                setEndDate(
                                  event.target
                                    .value,
                                )
                              }
                              className="h-9 w-full rounded-xl border border-border bg-background px-2.5 text-[11px] font-semibold text-qc-navy outline-none focus:border-qc-blue/25"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={
                              loadExaminations
                            }
                            className="col-span-2 h-9 rounded-xl bg-qc-yellow text-xs font-extrabold text-qc-navy transition-colors hover:bg-[#eac13d]"
                          >
                            Apply custom range
                          </button>
                        </div>
                      )}

                      {/* Reset */}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={
                            handleResetFilters
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold text-muted-foreground transition-colors hover:bg-qc-blue/5 hover:text-qc-blue"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Active
              </span>

              {datePreset !== "all" && (
                <span className="rounded-full border border-qc-blue/15 bg-qc-blue/5 px-2.5 py-1 text-[10px] font-bold text-qc-blue">
                  {
                    datePresets.find(
                      (preset) =>
                        preset.id ===
                        datePreset,
                    )?.label
                  }
                </span>
              )}

              {modalityCode !==
                "ALL" && (
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-qc-navy">
                  {
                    MODALITY_CONFIG[
                      modalityCode as ModalityCode
                    ]?.shortName ??
                      modalityCode
                  }
                </span>
              )}

              {searchTerm.trim() && (
                <span className="max-w-[180px] truncate rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-bold text-qc-navy">
                  “{searchTerm}”
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          SUMMARY STRIP
          ===================================================== */}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Matching */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Matching
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-qc-navy">
              {items.length}
            </span>

            <span className="text-[11px] font-semibold text-muted-foreground">
              studies
            </span>
          </div>
        </div>

        {/* Finalized */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Finalized
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-qc-blue">
              {summary.totalFinalized}
            </span>

            <span className="text-[11px] font-semibold text-muted-foreground">
              signed
            </span>
          </div>
        </div>

        {/* Backlog */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Backlog
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold ${
                summary.totalBacklog >
                0
                  ? "text-qc-orange"
                  : "text-qc-blue"
              }`}
            >
              {summary.totalBacklog}
            </span>

            <span className="text-[11px] font-semibold text-muted-foreground">
              pending
            </span>
          </div>
        </div>

        {/* TAT */}
        <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Average TAT
          </p>

          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-qc-navy">
              {summary.avgTatMinutes >
              0
                ? summary.avgTatHours >=
                  1
                  ? `${summary.avgTatHours}h`
                  : `${summary.avgTatMinutes}m`
                : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          RESULTS
          ===================================================== */}

      <section
        className={`overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-opacity ${
          isPending
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
        {/* Results heading */}
        <div className="flex flex-col gap-2 border-b border-border bg-background/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            {statusTab ===
            "backlog" ? (
              <Clock className="h-4 w-4 text-qc-orange" />
            ) : statusTab ===
              "finalized" ? (
              <CheckCircle2 className="h-4 w-4 text-qc-blue" />
            ) : (
              <Layers className="h-4 w-4 text-qc-blue" />
            )}

            <div>
              <h3 className="text-sm font-extrabold text-qc-navy">
                {statusTab ===
                "backlog"
                  ? "Active reading queue"
                  : statusTab ===
                    "finalized"
                    ? "Finalized archive"
                    : "All examination records"}
              </h3>

              <p className="text-[10px] text-muted-foreground">
                {items.length}{" "}
                {items.length === 1
                  ? "record"
                  : "records"}
              </p>
            </div>
          </div>

          {isPending && (
            <span className="inline-flex w-fit items-center rounded-full bg-qc-blue/5 px-2.5 py-1 text-[10px] font-extrabold text-qc-blue">
              Updating…
            </span>
          )}
        </div>

        {/* ===================================================
            TABLE
            =================================================== */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left">
            <thead className="border-b border-border bg-card">
              <tr className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3.5">
                  Accession
                </th>

                <th className="px-4 py-3.5">
                  Modality
                </th>

                <th className="px-4 py-3.5">
                  Triage
                </th>

                <th className="px-4 py-3.5">
                  Priority
                </th>

                <th className="px-4 py-3.5">
                  Study date
                </th>

                {statusTab ===
                  "backlog" && (
                  <>
                    <th className="px-4 py-3.5">
                      Dwell
                    </th>

                    <th className="px-4 py-3.5">
                      SLA
                    </th>

                    <th className="px-4 py-3.5 text-right">
                      Action
                    </th>
                  </>
                )}

                {statusTab ===
                  "finalized" && (
                  <>
                    <th className="px-4 py-3.5">
                      Completed
                    </th>

                    <th className="px-4 py-3.5">
                      Signed
                    </th>

                    <th className="px-4 py-3.5 text-right">
                      TAT
                    </th>

                    <th className="px-4 py-3.5 text-center">
                      SLA
                    </th>
                  </>
                )}

                {statusTab ===
                  "all" && (
                  <>
                    <th className="px-4 py-3.5">
                      Status
                    </th>

                    <th className="px-4 py-3.5 text-right">
                      TAT / dwell
                    </th>

                    <th className="px-4 py-3.5 text-right">
                      Action
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr
                  key={item.examId}
                  className="transition-colors hover:bg-qc-blue/[0.025]"
                >
                  {/* Accession */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-qc-navy">
                        {item.identifier}
                      </span>

                      {item.isCarryOver && (
                        <span className="rounded-full border border-qc-blue/15 bg-qc-blue/5 px-2 py-0.5 text-[9px] font-extrabold text-qc-blue">
                          Carry-over
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Modality */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-extrabold text-qc-navy">
                      {MODALITY_CONFIG[
                        item.modalityCode as ModalityCode
                      ]?.shortName ??
                        item.modalityCode}
                    </span>
                  </td>

                  {/* Triage */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getTriageBadgeClass(
                        item.triageLevel,
                      )}`}
                    >
                      {item.triageLevel}
                    </span>
                  </td>

                  {/* Urgency */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${getUrgencyBadgeClass(
                        item.urgencyLevel,
                      )}`}
                    >
                      {item.urgencyLevel}
                    </span>
                  </td>

                  {/* Study date */}
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                      {item.studyDateFormatted}
                    </span>
                  </td>

                  {/* =================================================
                      BACKLOG
                      ================================================= */}

                  {statusTab ===
                    "backlog" && (
                    <>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono text-xs font-extrabold ${
                              item.isBreached
                                ? "text-qc-red"
                                : "text-qc-orange"
                            }`}
                          >
                            {item.dwellMinutes}m
                          </span>

                          {item.isBreached && (
                            <span className="mt-0.5 text-[9px] font-extrabold text-qc-red">
                              Breached
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.targetTatMinutes
                            ? `${item.targetTatMinutes}m`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditExamDialog
                            item={item as any}
                          />

                          <DeleteExamDialog
                            examId={item.examId}
                            identifier={
                              item.identifier
                            }
                          />

                          <form
                            action={async (
                              formData,
                            ) => {
                              await signOffReportAction(
                                formData,
                              );

                              loadExaminations();
                            }}
                            className="inline"
                          >
                            <input
                              type="hidden"
                              name="examId"
                              value={
                                item.examId
                              }
                            />

                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-[10px] font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d]"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Sign
                            </button>
                          </form>
                        </div>
                      </td>
                    </>
                  )}

                  {/* =================================================
                      FINALIZED
                      ================================================= */}

                  {statusTab ===
                    "finalized" && (
                    <>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.examCompletedAtFormatted ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.reportSignedAtFormatted ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono text-xs font-extrabold text-qc-blue">
                          {item.tatMinutes
                            ? item.tatHours &&
                              item.tatHours >=
                                1
                              ? `${item.tatHours}h`
                              : `${item.tatMinutes}m`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {item.isBreached ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-extrabold text-qc-red">
                            <AlertTriangle className="h-3 w-3" />
                            Breached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-qc-blue/15 bg-qc-blue/5 px-2.5 py-1 text-[9px] font-extrabold text-qc-blue">
                            <CheckCircle2 className="h-3 w-3" />
                            Met SLA
                          </span>
                        )}
                      </td>
                    </>
                  )}

                  {/* =================================================
                      ALL
                      ================================================= */}

                  {statusTab ===
                    "all" && (
                    <>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-extrabold ${getStatusBadgeClass(
                            item.isFinalized,
                          )}`}
                        >
                          {item.isFinalized
                            ? "Finalized"
                            : "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {item.isFinalized ? (
                          <span className="font-mono text-xs font-extrabold text-qc-blue">
                            {item.tatHours &&
                            item.tatHours >=
                              1
                              ? `${item.tatHours}h`
                              : `${item.tatMinutes}m`}
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-extrabold text-qc-orange">
                            {item.dwellMinutes}m
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {!item.isFinalized && (
                          <form
                            action={async (
                              formData,
                            ) => {
                              await signOffReportAction(
                                formData,
                              );

                              loadExaminations();
                            }}
                            className="inline"
                          >
                            <input
                              type="hidden"
                              name="examId"
                              value={
                                item.examId
                              }
                            />

                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-[10px] font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d]"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Sign
                            </button>
                          </form>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* ===================================================
                  EMPTY STATE
                  =================================================== */}

              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                        <AlertTriangle className="h-5 w-5" />
                      </div>

                      <h3 className="mt-3 text-sm font-extrabold text-qc-navy">
                        No records found
                      </h3>

                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        Adjust the current filters or
                        search term.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleResetFilters
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[10px] font-extrabold text-qc-blue transition-colors hover:bg-qc-blue/5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        <div className="flex items-center justify-between border-t border-border bg-background/60 px-4 py-3 sm:px-5">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {items.length}{" "}
            {items.length === 1
              ? "record"
              : "records"}{" "}
            shown
          </span>

          {summary.totalBreached >
            0 && (
            <span className="text-[10px] font-extrabold text-qc-red">
              {summary.totalBreached} SLA
              {summary.totalBreached === 1
                ? ""
                : "s"}{" "}
              breached
            </span>
          )}
        </div>
      </section>
    </div>
  );
}