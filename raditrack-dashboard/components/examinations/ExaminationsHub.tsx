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
  ArrowUpRight,
  UserCheck,
} from "lucide-react";

import { ExportCsvButton } from "@/components/staff/ExportCsvButton";
import { EditExamDialog } from "@/components/dashboard/EditExamDialog";
import { DeleteExamDialog } from "@/components/dashboard/DeleteExamDialog";

import {
  fetchFilteredExaminationsAction,
  signOffReportAction,
  type FilteredExaminationsResult,
} from "@/app/actions";
import { notifyDatabaseChanged } from "@/lib/broadcast";

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

const ALL_MODALITIES: ModalityCode[] = [
  ModalityCode.XRAY,
  ModalityCode.CT,
  ModalityCode.MRI,
  ModalityCode.US,
  ModalityCode.MAMMO,
];

const ALL_CATEGORIES: TriageLevel[] = [
  TriageLevel.OPD,
  TriageLevel.ER,
  TriageLevel.IN,
];

export function ExaminationsHub({
  queue,
  finalizedCount: initialFinalizedCount,
}: ExaminationsHubProps) {
  /* =========================================================
     State
  ========================================================= */

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

  const [selectedModalities, setSelectedModalities] =
    useState<string[]>(ALL_MODALITIES);

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(ALL_CATEGORIES);

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

  /* =========================================================
     Close filter popover
  ========================================================= */

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

  /* =========================================================
     Modality & Patient Category Selection Helpers
  ========================================================= */

  const isAllModalitiesSelected =
    selectedModalities.length === ALL_MODALITIES.length;

  const toggleAllModalities = () => {
    if (isAllModalitiesSelected) {
      setSelectedModalities([]);
    } else {
      setSelectedModalities(ALL_MODALITIES);
    }
  };

  const toggleModality = (code: string) => {
    setSelectedModalities((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code],
    );
  };

  const isAllCategoriesSelected =
    selectedCategories.length === ALL_CATEGORIES.length;

  const toggleAllCategories = () => {
    if (isAllCategoriesSelected) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(ALL_CATEGORIES);
    }
  };

  const toggleCategory = (level: string) => {
    setSelectedCategories((prev) =>
      prev.includes(level)
        ? prev.filter((c) => c !== level)
        : [...prev, level],
    );
  };

  /* =========================================================
     Load examinations
  ========================================================= */

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
            modalityCodes: isAllModalitiesSelected
              ? ["ALL"]
              : selectedModalities,
            patientCategories: isAllCategoriesSelected
              ? ["ALL"]
              : selectedCategories,
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
    isAllModalitiesSelected,
    selectedModalities,
    isAllCategoriesSelected,
    selectedCategories,
    searchTerm,
  ]);

  useEffect(() => {
    loadExaminations();
  }, [loadExaminations]);

  /* =========================================================
     Reset filters
  ========================================================= */

  const handleResetFilters = () => {
    setDatePreset("all");
    setSelectedModalities(ALL_MODALITIES);
    setSelectedCategories(ALL_CATEGORIES);
    setSearchTerm("");
    setStartDate(todayStr);
    setEndDate(todayStr);
    setIsFilterOpen(false);
  };

  /* =========================================================
     Results
  ========================================================= */

  const items = result?.items ?? [];

  const summary = result?.summary ?? {
    totalFinalized:
      initialFinalizedCount,
    totalBacklog: queue.length,
    avgTatMinutes: 0,
    avgTatHours: 0,
    totalBreached: 0,
  };

  /* =========================================================
     Display helpers
  ========================================================= */

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

  const isDateFiltered = datePreset !== "all";
  const isModalityFiltered = !isAllModalitiesSelected;
  const isCategoryFiltered = !isAllCategoriesSelected;
  const isSearchFiltered = searchTerm.trim() !== "";

  const hasActiveFilters =
    isDateFiltered ||
    isModalityFiltered ||
    isCategoryFiltered ||
    isSearchFiltered;

  const activeFilterCount =
    (isDateFiltered ? 1 : 0) +
    (isModalityFiltered ? 1 : 0) +
    (isCategoryFiltered ? 1 : 0) +
    (isSearchFiltered ? 1 : 0);

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

  /* =========================================================
     Render
  ========================================================= */

  return (
    <div className="space-y-5">
      {/* =====================================================
          OPERATIONS CONTROL BAR
      ===================================================== */}

      <section className="overflow-visible rounded-[28px] border border-[#DDE3F2] bg-[#FBFCFF] shadow-[0_4px_18px_rgba(24,41,140,0.05)]">
        <div className="relative overflow-visible">
          {/* Soft header glow */}
          <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-qc-yellow/10 blur-xl" />

          <div className="relative flex flex-col gap-3 p-3 sm:p-4">
            {/* =================================================
                STATUS SWITCHER
            ================================================= */}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0">
                <div className="flex w-full overflow-x-auto rounded-2xl border border-[#E2E7F1] bg-[#F7F9FC] p-1 xl:w-fit">
                  {/* Backlog */}
                  <button
                    type="button"
                    onClick={() =>
                      setStatusTab(
                        "backlog",
                      )
                    }
                    className={`group flex min-w-[118px] shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 ${
                      statusTab ===
                      "backlog"
                        ? "bg-qc-navy text-white shadow-[0_5px_14px_rgba(5,14,64,0.14)]"
                        : "text-muted-foreground hover:bg-white hover:text-qc-navy"
                    }`}
                  >
                    <Clock
                      className={`h-3.5 w-3.5 ${
                        statusTab ===
                        "backlog"
                          ? "text-qc-yellow"
                          : "text-current"
                      }`}
                    />

                    <span>
                      Backlog
                    </span>

                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                        statusTab ===
                        "backlog"
                          ? "bg-white/10 text-white"
                          : "bg-white text-muted-foreground"
                      }`}
                    >
                      {summary.totalBacklog}
                    </span>
                  </button>

                  {/* Finalized */}
                  <button
                    type="button"
                    onClick={() =>
                      setStatusTab(
                        "finalized",
                      )
                    }
                    className={`group flex min-w-[118px] shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 ${
                      statusTab ===
                      "finalized"
                        ? "bg-qc-navy text-white shadow-[0_5px_14px_rgba(5,14,64,0.14)]"
                        : "text-muted-foreground hover:bg-white hover:text-qc-navy"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-3.5 w-3.5 ${
                        statusTab ===
                        "finalized"
                          ? "text-qc-yellow"
                          : "text-current"
                      }`}
                    />

                    <span>
                      Finalized
                    </span>

                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                        statusTab ===
                        "finalized"
                          ? "bg-white/10 text-white"
                          : "bg-white text-muted-foreground"
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
                    className={`group flex min-w-[118px] shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 ${
                      statusTab === "all"
                        ? "bg-qc-navy text-white shadow-[0_5px_14px_rgba(5,14,64,0.14)]"
                        : "text-muted-foreground hover:bg-white hover:text-qc-navy"
                    }`}
                  >
                    <Layers
                      className={`h-3.5 w-3.5 ${
                        statusTab ===
                        "all"
                          ? "text-qc-yellow"
                          : "text-current"
                      }`}
                    />

                    <span>All</span>

                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                        statusTab ===
                        "all"
                          ? "bg-white/10 text-white"
                          : "bg-white text-muted-foreground"
                      }`}
                    >
                      {result?.totalCount ??
                        0}
                    </span>
                  </button>
                </div>
              </div>

              {/* =================================================
                  SEARCH / FILTER / EXPORT
              ================================================= */}

              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                {/* Search */}
                <div className="relative min-w-0 flex-1 sm:min-w-[250px] xl:w-[290px] xl:flex-none">
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
                    className="h-10 w-full rounded-2xl border border-[#DDE3F2] bg-white pl-10 pr-4 text-xs font-semibold text-qc-navy outline-none transition-all placeholder:text-muted-foreground/70 focus:border-qc-blue/30 focus:ring-4 focus:ring-qc-blue/[0.07]"
                  />
                </div>

                {/* Filters */}
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
                    className={`flex h-10 w-full items-center justify-center gap-2 rounded-2xl border px-3.5 text-xs font-extrabold transition-all sm:w-auto ${
                      isFilterOpen ||
                      hasActiveFilters
                        ? "border-qc-blue/20 bg-qc-blue/5 text-qc-blue"
                        : "border-[#DDE3F2] bg-white text-muted-foreground hover:border-qc-blue/15 hover:bg-qc-blue/[0.03] hover:text-qc-blue"
                    }`}
                    aria-expanded={
                      isFilterOpen
                    }
                    aria-haspopup="dialog"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />

                    <span>
                      Filters
                    </span>

                    {activeFilterCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-qc-orange px-1 text-[9px] font-black text-white">
                        {activeFilterCount}
                      </span>
                    )}

                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
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
                    <div className="absolute right-0 top-full z-50 mt-2 max-h-[85vh] w-[320px] overflow-y-auto rounded-[24px] border border-[#DDE3F2] bg-white shadow-[0_22px_55px_rgba(5,14,64,0.16)] animate-in fade-in zoom-in-95 duration-150 sm:w-[420px]">
                      <div className="sticky top-0 z-10 overflow-hidden border-b border-[#E7EAF1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F5F8FF_60%,#FFF9E9_100%)] px-4 py-3.5 backdrop-blur-md">
                        <div className="pointer-events-none absolute -right-5 -top-7 h-20 w-20 rounded-full bg-qc-yellow/10" />

                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-qc-navy text-qc-yellow">
                              <Filter className="h-3.5 w-3.5" />
                            </div>

                            <div>
                              <p className="text-sm font-extrabold text-qc-navy">
                                Refine results
                              </p>

                              <p className="text-[10px] text-muted-foreground">
                                Filter by modality, patient category & date
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setIsFilterOpen(
                                false,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white hover:text-qc-navy"
                            aria-label="Close filters"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        {/* 1. Date Presets */}
                        <div>
                          <div className="mb-2 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-qc-blue" />

                            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                              Date Range
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
                                  className={`rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-all ${
                                    datePreset ===
                                    preset.id
                                      ? "border-qc-blue bg-qc-blue text-white shadow-sm"
                                      : "border-border bg-[#FAFBFD] text-muted-foreground hover:border-qc-blue/15 hover:bg-qc-blue/[0.04] hover:text-qc-blue"
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

                        {/* 2. Modality Checkboxes */}
                        <div className="border-t border-[#EAEFF8] pt-3.5">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-qc-blue" />

                              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                                Modalities
                              </span>
                            </div>

                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {selectedModalities.length}/{ALL_MODALITIES.length} selected
                            </span>
                          </div>

                          {/* Master All Modalities Checkbox */}
                          <label
                            className={`mb-2 flex items-center gap-2.5 rounded-xl border p-2 text-xs font-extrabold transition-all cursor-pointer ${
                              isAllModalitiesSelected
                                ? "border-qc-blue/30 bg-qc-blue/10 text-qc-blue"
                                : "border-border bg-[#FAFBFD] text-slate-600 hover:bg-qc-blue/[0.03]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isAllModalitiesSelected}
                              onChange={toggleAllModalities}
                              className="h-4 w-4 rounded border-slate-300 text-qc-blue focus:ring-qc-blue/20 cursor-pointer accent-qc-blue"
                            />
                            <span className="flex-1">All modalities</span>
                            <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                              ALL
                            </span>
                          </label>

                          {/* Individual Modality Checkboxes */}
                          <div className="space-y-1.5">
                            {ALL_MODALITIES.map((code) => {
                              const isChecked = selectedModalities.includes(code);
                              const config = MODALITY_CONFIG[code];

                              return (
                                <label
                                  key={code}
                                  className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                    isChecked
                                      ? "border-qc-blue/25 bg-qc-blue/[0.04] text-qc-navy shadow-xs"
                                      : "border-border/80 bg-[#FAFBFD] text-slate-400 hover:border-qc-blue/15 hover:bg-qc-blue/[0.02]"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleModality(code)}
                                    className="h-4 w-4 rounded border-slate-300 text-qc-blue focus:ring-qc-blue/20 cursor-pointer accent-qc-blue"
                                  />
                                  <span className="flex-1 font-bold">
                                    {config?.name ?? code}
                                  </span>
                                  <span className="shrink-0 rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-slate-500">
                                    {code}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. Patient Category Checkboxes (OPD, ER, IN) */}
                        <div className="border-t border-[#EAEFF8] pt-3.5">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-qc-blue" />

                              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                                Patient Category
                              </span>
                            </div>

                            <span className="text-[10px] font-semibold text-muted-foreground">
                              {selectedCategories.length}/{ALL_CATEGORIES.length} selected
                            </span>
                          </div>

                          {/* Master All Categories Checkbox */}
                          <label
                            className={`mb-2 flex items-center gap-2.5 rounded-xl border p-2 text-xs font-extrabold transition-all cursor-pointer ${
                              isAllCategoriesSelected
                                ? "border-qc-blue/30 bg-qc-blue/10 text-qc-blue"
                                : "border-border bg-[#FAFBFD] text-slate-600 hover:bg-qc-blue/[0.03]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isAllCategoriesSelected}
                              onChange={toggleAllCategories}
                              className="h-4 w-4 rounded border-slate-300 text-qc-blue focus:ring-qc-blue/20 cursor-pointer accent-qc-blue"
                            />
                            <span className="flex-1">All patient categories</span>
                            <span className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                              ALL
                            </span>
                          </label>

                          {/* Individual Category Checkboxes (OPD, ER, IN) */}
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                            {ALL_CATEGORIES.map((cat) => {
                              const isChecked = selectedCategories.includes(cat);

                              return (
                                <label
                                  key={cat}
                                  className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all cursor-pointer ${
                                    isChecked
                                      ? "border-qc-blue/30 bg-qc-blue/5 text-qc-navy shadow-xs"
                                      : "border-border/80 bg-[#FAFBFD] text-slate-400 hover:border-qc-blue/15 hover:bg-qc-blue/[0.02]"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleCategory(cat)}
                                    className="h-4 w-4 rounded border-slate-300 text-qc-blue focus:ring-qc-blue/20 cursor-pointer accent-qc-blue"
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-extrabold text-qc-navy">{cat}</span>
                                    <span className="text-[10px] text-muted-foreground truncate">
                                      {cat === TriageLevel.OPD
                                        ? "Outpatient"
                                        : cat === TriageLevel.ER
                                        ? "Emergency"
                                        : "Inpatient"}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Custom dates */}
                        {datePreset ===
                          "custom" && (
                          <div className="border-t border-[#EAEFF8] pt-3.5 grid grid-cols-2 gap-2">
                            <label className="space-y-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                Start
                              </span>

                              <input
                                type="date"
                                value={
                                  startDate
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setStartDate(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="h-9 w-full rounded-xl border border-[#DDE3F2] bg-[#FAFBFD] px-2.5 text-[11px] font-semibold text-qc-navy outline-none transition-all focus:border-qc-blue/25 focus:bg-white"
                              />
                            </label>

                            <label className="space-y-1.5">
                              <span className="text-[10px] font-bold text-muted-foreground">
                                End
                              </span>

                              <input
                                type="date"
                                value={
                                  endDate
                                }
                                onChange={(
                                  event,
                                ) =>
                                  setEndDate(
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                className="h-9 w-full rounded-xl border border-[#DDE3F2] bg-[#FAFBFD] px-2.5 text-[11px] font-semibold text-qc-navy outline-none transition-all focus:border-qc-blue/25 focus:bg-white"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={
                                loadExaminations
                              }
                              className="col-span-2 h-9 rounded-xl bg-qc-yellow text-xs font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d]"
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDE3F2] bg-[#FAFBFD] px-3 py-2.5 text-xs font-extrabold text-muted-foreground transition-all hover:bg-qc-blue/[0.04] hover:text-qc-blue"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />

                            Reset all filters
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export */}
                <div className="sm:w-auto">
                  <ExportCsvButton />
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#E7EAF1] pt-3">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">
                  Active
                </span>

                {isDateFiltered && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-qc-blue/15 bg-qc-blue/5 px-2.5 py-1 text-[10px] font-bold text-qc-blue">
                    <span>
                      {
                        datePresets.find(
                          (preset) =>
                            preset.id ===
                            datePreset,
                        )?.label
                      }
                    </span>
                    <button
                      type="button"
                      onClick={() => setDatePreset("all")}
                      className="hover:text-qc-navy"
                      title="Clear date filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {isModalityFiltered && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE3F2] bg-white px-2.5 py-1 text-[10px] font-bold text-qc-navy">
                    <span>
                      Modalities:{" "}
                      {selectedModalities.length === 0
                        ? "None (0)"
                        : selectedModalities
                            .map((m) => MODALITY_CONFIG[m as ModalityCode]?.shortName || m)
                            .join(", ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedModalities(ALL_MODALITIES)}
                      className="text-slate-400 hover:text-qc-navy"
                      title="Reset to all modalities"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {isCategoryFiltered && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE3F2] bg-white px-2.5 py-1 text-[10px] font-bold text-qc-navy">
                    <span>
                      Patient:{" "}
                      {selectedCategories.length === 0
                        ? "None (0)"
                        : selectedCategories.join(", ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories(ALL_CATEGORIES)}
                      className="text-slate-400 hover:text-qc-navy"
                      title="Reset to all patient categories"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {isSearchFiltered && (
                  <span className="inline-flex items-center gap-1.5 max-w-[200px] truncate rounded-full border border-[#DDE3F2] bg-white px-2.5 py-1 text-[10px] font-bold text-qc-navy">
                    <span className="truncate">“{searchTerm}”</span>
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="text-slate-400 hover:text-qc-navy shrink-0"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={
                    handleResetFilters
                  }
                  className="ml-auto text-[10px] font-extrabold text-muted-foreground transition-colors hover:text-qc-blue"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section
        aria-label="Examination summary"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {/* Matching */}
        <div className="group relative overflow-hidden rounded-[24px] border border-[#DDE3F2] bg-white px-4 py-4 shadow-[0_3px_14px_rgba(24,41,140,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(24,41,140,0.08)]">
          <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-qc-blue/[0.045] blur-xl transition-transform duration-500 group-hover:scale-125" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                Matching
              </p>

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qc-blue/[0.06] text-qc-blue">
                <Search className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-qc-navy">
                {items.length}
              </span>

              <span className="text-[11px] font-semibold text-muted-foreground">
                studies
              </span>
            </div>
          </div>
        </div>

        {/* Finalized */}
        <div className="group relative overflow-hidden rounded-[24px] border border-[#DDE3F2] bg-white px-4 py-4 shadow-[0_3px_14px_rgba(24,41,140,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(24,41,140,0.08)]">
          <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-qc-blue/[0.05] blur-xl transition-transform duration-500 group-hover:scale-125" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                Finalized
              </p>

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qc-blue/[0.06] text-qc-blue">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-qc-blue">
                {summary.totalFinalized}
              </span>

              <span className="text-[11px] font-semibold text-muted-foreground">
                signed
              </span>
            </div>
          </div>
        </div>

        {/* Backlog */}
        <div
          className={`group relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-[0_3px_14px_rgba(24,41,140,0.04)] transition-all duration-300 hover:-translate-y-0.5 ${
            summary.totalBacklog >
            0
              ? "border-orange-100 bg-[linear-gradient(145deg,#FFFDFC_0%,#FFF8F2_100%)] hover:border-orange-200 hover:shadow-[0_10px_24px_rgba(234,88,12,0.08)]"
              : "border-[#DDE3F2] bg-white hover:shadow-[0_10px_24px_rgba(24,41,140,0.08)]"
          }`}
        >
          <div
            className={`pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full blur-xl transition-transform duration-500 group-hover:scale-125 ${
              summary.totalBacklog >
              0
                ? "bg-qc-orange/[0.09]"
                : "bg-qc-blue/[0.05]"
            }`}
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                Backlog
              </p>

              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  summary.totalBacklog >
                  0
                    ? "bg-orange-50 text-qc-orange"
                    : "bg-qc-blue/[0.06] text-qc-blue"
                }`}
              >
                {summary.totalBacklog >
                0 ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-extrabold tracking-tight ${
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
        </div>

        {/* Average TAT */}
        <div className="group relative overflow-hidden rounded-[24px] border border-[#DDE3F2] bg-white px-4 py-4 shadow-[0_3px_14px_rgba(24,41,140,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(24,41,140,0.08)]">
          <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-qc-yellow/[0.07] blur-xl transition-transform duration-500 group-hover:scale-125" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                Average TAT
              </p>

              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-qc-yellow/15 text-qc-navy">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-qc-navy">
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
        </div>
      </section>

      {/* =====================================================
          RESULTS
      ===================================================== */}

      <section
        className={`overflow-hidden rounded-[28px] border border-[#DDE3F2] bg-white shadow-[0_4px_18px_rgba(24,41,140,0.05)] transition-opacity duration-200 ${
          isPending
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
        {/* ===================================================
            RESULTS HEADER
        =================================================== */}

        <div className="relative overflow-hidden border-b border-[#E4E8F1] bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
          <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-qc-yellow/10" />

          <div className="pointer-events-none absolute bottom-0 right-28 h-16 w-16 rounded-full bg-qc-blue/[0.035]" />

          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-navy text-qc-yellow shadow-[0_5px_14px_rgba(5,14,64,0.12)]`}
              >
                {statusTab ===
                "backlog" ? (
                  <Clock className="h-5 w-5" />
                ) : statusTab ===
                  "finalized" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Layers className="h-5 w-5" />
                )}
              </div>

              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-qc-navy">
                  {statusTab ===
                  "backlog"
                    ? "Active reading queue"
                    : statusTab ===
                        "finalized"
                      ? "Finalized archive"
                      : "All examination records"}
                </h2>

                
              </div>
            </div>

            {isPending && (
              <span className="inline-flex w-fit items-center rounded-full border border-qc-blue/10 bg-white/70 px-3 py-1.5 text-[10px] font-extrabold text-qc-blue">
                Updating…
              </span>
            )}

            {!isPending &&
              summary.totalBreached >
                0 && (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-extrabold text-qc-red">
                  <AlertTriangle className="h-3 w-3" />

                  {summary.totalBreached} SLA
                  {summary.totalBreached ===
                  1
                    ? ""
                    : "s"}{" "}
                  breached
                </span>
              )}
          </div>
        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left">
            <thead className="border-b border-[#E8EBF2] bg-[#FBFCFE]">
              <tr className="text-[9px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground">
                <th className="px-5 py-3.5">
                  Accession
                </th>

                <th className="px-5 py-3.5">
                  Modality
                </th>

                <th className="px-5 py-3.5">
                  Patient Category
                </th>

                <th className="px-5 py-3.5">
                  Study date
                </th>

                {statusTab ===
                  "backlog" && (
                  <>
                    <th className="px-5 py-3.5">
                      Dwell
                    </th>

                    <th className="px-5 py-3.5">
                      SLA
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Action
                    </th>
                  </>
                )}

                {statusTab ===
                  "finalized" && (
                  <>
                    <th className="px-5 py-3.5">
                      Completed
                    </th>

                    <th className="px-5 py-3.5">
                      Signed
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      TAT
                    </th>

                    <th className="px-5 py-3.5 text-center">
                      SLA
                    </th>
                  </>
                )}

                {statusTab ===
                  "all" && (
                  <>
                    <th className="px-5 py-3.5">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      TAT / dwell
                    </th>

                    <th className="px-5 py-3.5 text-right">
                      Action
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF0F5]">
              {items.map((item) => (
                <tr
                  key={item.examId}
                  className={`group transition-colors ${
                    item.isBreached
                      ? "bg-red-50/[0.28] hover:bg-red-50/[0.5]"
                      : "hover:bg-qc-blue/[0.025]"
                  }`}
                >
                  {/* Accession */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isBreached
                            ? "bg-qc-red"
                            : item.isFinalized
                              ? "bg-qc-blue"
                              : "bg-qc-yellow"
                        }`}
                      />

                      <span className="font-mono text-xs font-extrabold tracking-tight text-qc-navy">
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
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-xl border border-[#E1E5EE] bg-[#FAFBFD] px-2.5 py-1 text-[10px] font-extrabold text-qc-navy transition-colors group-hover:border-qc-blue/10">
                      {MODALITY_CONFIG[
                        item.modalityCode as ModalityCode
                      ]?.shortName ??
                        item.modalityCode}
                    </span>
                  </td>

                  {/* Triage */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-xl border px-2.5 py-1 text-[10px] font-extrabold ${getTriageBadgeClass(
                        item.triageLevel,
                      )}`}
                    >
                      {item.triageLevel}
                    </span>
                  </td>

                  

                  {/* Study date */}
                  <td className="px-5 py-4">
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
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono text-xs font-extrabold ${
                              item.isBreached
                                ? "text-qc-red"
                                : "text-qc-orange"
                            }`}
                          >
                            {item.dwellHours !== null && item.dwellHours !== undefined
                              ? `${item.dwellHours}h`
                              : item.dwellMinutes !== null && item.dwellMinutes !== undefined
                                ? `${Number((item.dwellMinutes / 60).toFixed(1))}h`
                                : "—"}
                          </span>

                          {item.isBreached && (
                            <span className="mt-0.5 text-[9px] font-extrabold text-qc-red">
                              Breached
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.targetTatMinutes
                            ? `${item.targetTatMinutes}m`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <EditExamDialog
                            item={item as any}
                          />

                          <DeleteExamDialog
                            examId={
                              item.examId
                            }
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
                              notifyDatabaseChanged();
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
                              className="group inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-[10px] font-extrabold text-qc-navy shadow-[0_3px_8px_rgba(242,203,73,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-[0_5px_12px_rgba(242,203,73,0.18)] active:translate-y-0"
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
                      <td className="px-5 py-4">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.examCompletedAtFormatted ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {item.reportSignedAtFormatted ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
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

                      <td className="px-5 py-4 text-center">
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
                      <td className="px-5 py-4">
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

                      <td className="px-5 py-4 text-right">
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
                            {item.dwellHours !== null && item.dwellHours !== undefined
                              ? `${item.dwellHours}h`
                              : item.dwellMinutes !== null && item.dwellMinutes !== undefined
                                ? `${Number((item.dwellMinutes / 60).toFixed(1))}h`
                                : "—"}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {!item.isFinalized && (
                          <form
                            action={async (
                              formData,
                            ) => {
                              await signOffReportAction(
                                formData,
                              );

                              loadExaminations();
                              notifyDatabaseChanged();
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
                              className="inline-flex items-center gap-1.5 rounded-xl bg-qc-yellow px-3 py-2 text-[10px] font-extrabold text-qc-navy shadow-[0_3px_8px_rgba(242,203,73,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-[0_5px_12px_rgba(242,203,73,0.18)] active:translate-y-0"
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
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#F2F5FF_0%,#FFF9E9_100%)] text-qc-blue">
                        <div className="absolute inset-0 rounded-2xl border border-qc-blue/[0.06]" />

                        <FileSpreadsheet className="relative h-6 w-6" />
                      </div>

                      <h3 className="mt-4 text-sm font-extrabold text-qc-navy">
                        No records found
                      </h3>

                      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
                        Adjust the current
                        filters or search term
                        to view more
                        examinations.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleResetFilters
                        }
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#DDE3F2] bg-white px-3 py-2 text-[10px] font-extrabold text-qc-blue shadow-sm transition-all hover:-translate-y-0.5 hover:bg-qc-blue/[0.04]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />

                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <div className="flex flex-col gap-2 border-t border-[#E8EBF2] bg-[#FBFCFE] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {items.length}{" "}
            {items.length === 1
              ? "record"
              : "records"}{" "}
            shown
          </span>

          <div className="flex items-center gap-4">
            {summary.totalBreached >
              0 && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-qc-red">
                <span className="h-1.5 w-1.5 rounded-full bg-qc-red" />

                {summary.totalBreached} SLA
                {summary.totalBreached ===
                1
                  ? ""
                  : "s"}{" "}
                breached
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}