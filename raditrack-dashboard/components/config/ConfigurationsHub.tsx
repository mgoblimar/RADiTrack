"use client";

import { useState, useTransition, useMemo } from "react";
import {
  ShieldCheck,
  Clock,
  Building2,
  UserCheck,
  RotateCcw,
  Pencil,
  Plus,
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Hospital,
  Lock,
  Cpu,
} from "lucide-react";

import {
  ConfigurationsData,
  ModalityConfigItem,
  updateSlaTargetAction,
  resetDefaultSlasAction,
  updateModalityDetailsAction,
  toggleModalityStatusAction,
  createRadiologistAction,
  toggleRadiologistStatusAction,
} from "@/app/actions";

export function formatSlaDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} mins`;
  }

  const days = minutes / 1440;
  const hrs = minutes / 60;

  if (days >= 1) {
    if (Number.isInteger(days)) {
      return `${days} ${days === 1 ? "day" : "days"} (${hrs} hrs)`;
    }
    const formattedDays = parseFloat(days.toFixed(2));
    const formattedHrs = Number.isInteger(hrs) ? hrs : parseFloat(hrs.toFixed(1));
    return `${formattedDays} days (${formattedHrs} hrs)`;
  }

  return Number.isInteger(hrs)
    ? `${hrs} ${hrs === 1 ? "hr" : "hrs"} (${minutes}m)`
    : `${hrs.toFixed(1)} hrs (${minutes}m)`;
}

type SlaUnit = "minutes" | "hours" | "days";

interface EditSlaModalProps {
  editingSla: {
    modalityCode: string;
    modalityName: string;
    triageLevel: string;
    urgencyLevel: string;
    currentTargetMinutes: number;
  };
  onClose: () => void;
  onSuccess: (updatedMinutes: number) => void;
  onError: (errorMsg: string) => void;
}

function EditSlaModal({
  editingSla,
  onClose,
  onSuccess,
  onError,
}: EditSlaModalProps) {
  const [isPending, startTransition] = useTransition();

  // Determine initial unit based on current target
  const initialUnit: SlaUnit = useMemo(() => {
    const mins = editingSla.currentTargetMinutes;
    if (mins >= 1440 && mins % 1440 === 0) return "days";
    if (mins >= 60 && mins % 60 === 0) return "hours";
    return "minutes";
  }, [editingSla.currentTargetMinutes]);

  const [unit, setUnit] = useState<SlaUnit>(initialUnit);

  // Helper to format minutes to a unit's string value
  const formatValueForUnit = (mins: number, targetUnit: SlaUnit): string => {
    if (mins <= 0) return "";
    if (targetUnit === "days") {
      const d = mins / 1440;
      return Number.isInteger(d) ? d.toString() : parseFloat(d.toFixed(2)).toString();
    }
    if (targetUnit === "hours") {
      const h = mins / 60;
      return Number.isInteger(h) ? h.toString() : parseFloat(h.toFixed(2)).toString();
    }
    return mins.toString();
  };

  const [inputValue, setInputValue] = useState<string>(() =>
    formatValueForUnit(editingSla.currentTargetMinutes, initialUnit)
  );

  // Calculated total minutes based on active input & unit
  const calculatedMinutes = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) return 0;
    if (unit === "days") return Math.round(num * 1440);
    if (unit === "hours") return Math.round(num * 60);
    return Math.round(num);
  }, [inputValue, unit]);

  // Unit switch with seamless value conversion
  const handleUnitChange = (newUnit: SlaUnit) => {
    if (newUnit === unit) return;
    if (calculatedMinutes > 0) {
      setInputValue(formatValueForUnit(calculatedMinutes, newUnit));
    }
    setUnit(newUnit);
  };

  // Boundary validations (5 mins min, 7 days / 10,080 mins max)
  const isTooHigh = calculatedMinutes > 10080;
  const isTooLow = calculatedMinutes > 0 && calculatedMinutes < 5;
  const isValid = calculatedMinutes >= 5 && calculatedMinutes <= 10080;

  const totalDays = calculatedMinutes > 0 ? calculatedMinutes / 1440 : 0;
  const totalHours = calculatedMinutes > 0 ? calculatedMinutes / 60 : 0;

  const presets = [
    { label: "30m", unit: "minutes" as SlaUnit, val: 30, mins: 30 },
    { label: "45m", unit: "minutes" as SlaUnit, val: 45, mins: 45 },
    { label: "1 hr", unit: "hours" as SlaUnit, val: 1, mins: 60 },
    { label: "2 hrs", unit: "hours" as SlaUnit, val: 2, mins: 120 },
    { label: "4 hrs", unit: "hours" as SlaUnit, val: 4, mins: 240 },
    { label: "8 hrs", unit: "hours" as SlaUnit, val: 8, mins: 480 },
    { label: "12 hrs", unit: "hours" as SlaUnit, val: 12, mins: 720 },
    { label: "1 day (24h)", unit: "days" as SlaUnit, val: 1, mins: 1440 },
    { label: "2 days (48h)", unit: "days" as SlaUnit, val: 2, mins: 2880 },
    { label: "3 days (72h)", unit: "days" as SlaUnit, val: 3, mins: 4320 },
    { label: "4 days (96h)", unit: "days" as SlaUnit, val: 4, mins: 5760 },
    { label: "5 days (120h)", unit: "days" as SlaUnit, val: 5, mins: 7200 },
    { label: "7 days (168h)", unit: "days" as SlaUnit, val: 7, mins: 10080 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-qc-yellow/10" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-qc-navy"
          aria-label="Close SLA dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative pr-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
              <Clock className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-qc-navy">
                Edit SLA benchmark
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {editingSla.modalityName} ({editingSla.modalityCode}) ·{" "}
                {editingSla.triageLevel} / {editingSla.urgencyLevel}
              </p>
            </div>
          </div>
        </div>

        <form
          action={async (formData: FormData) => {
            if (!isValid) return;
            startTransition(async () => {
              const res = await updateSlaTargetAction(formData);
              if (res.success) {
                onSuccess(calculatedMinutes);
              } else {
                onError(res.message || "Failed to update SLA");
              }
            });
          }}
          className="relative mt-6 space-y-5"
        >
          <input
            type="hidden"
            name="modalityCode"
            value={editingSla.modalityCode}
          />
          <input
            type="hidden"
            name="triageLevel"
            value={editingSla.triageLevel}
          />
          <input
            type="hidden"
            name="urgencyLevel"
            value={editingSla.urgencyLevel}
          />
          <input
            type="hidden"
            name="targetTatMinutes"
            value={calculatedMinutes}
          />

          {/* Unit selection tabs */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Configure Target By
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Up to 7 days max
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => handleUnitChange("minutes")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  unit === "minutes"
                    ? "bg-white text-qc-navy shadow-sm"
                    : "text-slate-500 hover:text-qc-navy"
                }`}
              >
                Minutes
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange("hours")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  unit === "hours"
                    ? "bg-white text-qc-navy shadow-sm"
                    : "text-slate-500 hover:text-qc-navy"
                }`}
              >
                Hours
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange("days")}
                className={`rounded-xl py-2 text-xs font-bold transition-all ${
                  unit === "days"
                    ? "bg-white text-qc-navy shadow-sm"
                    : "text-slate-500 hover:text-qc-navy"
                }`}
              >
                Days (up to 7d)
              </button>
            </div>
          </div>

          {/* Numeric Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-bold text-qc-navy">
                {unit === "days"
                  ? "Target duration in days"
                  : unit === "hours"
                  ? "Target duration in hours"
                  : "Target duration in minutes"}
              </label>
              <span className="text-xs text-slate-400">
                Current:{" "}
                <strong className="text-qc-navy">
                  {formatSlaDuration(editingSla.currentTargetMinutes)}
                </strong>
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                required
                min={unit === "days" ? 0.1 : unit === "hours" ? 0.1 : 5}
                max={unit === "days" ? 7 : unit === "hours" ? 168 : 10080}
                step={unit === "days" ? "0.25" : unit === "hours" ? "0.5" : "1"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  unit === "days"
                    ? "e.g. 1, 2, 3 (up to 7)"
                    : unit === "hours"
                    ? "e.g. 1, 8, 24, 72"
                    : "e.g. 30, 60, 1440"
                }
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 pr-20 font-mono text-sm font-semibold text-qc-navy outline-none transition-all placeholder:text-slate-400 focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10"
              />

              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold capitalize text-slate-400">
                {unit}
              </span>
            </div>

            {/* Validation messages */}
            {isTooHigh && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Target SLA cannot exceed 7 days (168 hours / 10,080 minutes).</span>
              </div>
            )}
            {isTooLow && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Target SLA benchmark must be at least 5 minutes.</span>
              </div>
            )}
          </div>

          {/* Live Equivalent Breakdown Card */}
          {calculatedMinutes > 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Equivalent breakdown:</span>
                <span className="font-mono text-xs font-bold text-qc-blue">
                  {calculatedMinutes.toLocaleString()} total mins
                </span>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200/60 bg-white p-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Minutes
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-extrabold text-qc-navy">
                    {calculatedMinutes.toLocaleString()}m
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-white p-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hours
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-extrabold text-qc-navy">
                    {Number.isInteger(totalHours)
                      ? `${totalHours} hrs`
                      : `${totalHours.toFixed(1)} hrs`}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/60 bg-white p-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Days
                  </div>
                  <div className="mt-0.5 font-mono text-xs font-extrabold text-qc-navy">
                    {Number.isInteger(totalDays)
                      ? `${totalDays} ${totalDays === 1 ? "day" : "days"}`
                      : `${totalDays.toFixed(2)} days`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500">
                Quick duration presets (up to 7 days)
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const isSelected = calculatedMinutes === p.mins;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setUnit(p.unit);
                      setInputValue(p.val.toString());
                    }}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-qc-blue bg-qc-blue text-white shadow-sm"
                        : "border-slate-200/80 bg-white text-qc-navy hover:border-qc-blue/30 hover:bg-qc-blue/5 hover:text-qc-blue"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-qc-navy"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending || !isValid}
              className="flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-5 py-2.5 text-sm font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Saving..." : "Save benchmark"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ConfigurationsHubProps {
  initialData?: ConfigurationsData;
}

type ConfigTab =
  | "slas"
  | "rooms"
  | "radiologists"
  | "governance";

export function ConfigurationsHub({
  initialData,
}: ConfigurationsHubProps) {
  const [activeTab, setActiveTab] =
    useState<ConfigTab>("slas");

  const [isPending, startTransition] =
    useTransition();

  const [statusMessage, setStatusMessage] =
    useState<{
      text: string;
      type: "success" | "error";
    } | null>(null);

  // =========================================================
  // Data
  // =========================================================

  const modalities =
    initialData?.modalities || [];

  const radiologists =
    initialData?.radiologists || [];

  const governance =
    initialData?.hospitalGovernance || {
      hospitalName:
        "Quezon City General Hospital (QCGH)",
      department:
        "Department of Radiology & Medical Imaging",
      phiZeroCompliance: true,
      dohAccreditation:
        "Tertiary Level III Hospital Center",
      systemVersion:
        "RADiTrack v1.4.0 (Build 2026)",
    };

  // =========================================================
  // Edit SLA dialog
  // =========================================================

  const [editingSla, setEditingSla] =
    useState<{
      modalityCode: string;
      modalityName: string;
      triageLevel: string;
      urgencyLevel: string;
      currentTargetMinutes: number;
    } | null>(null);

  // =========================================================
  // Edit modality dialog
  // =========================================================

  const [editingModality, setEditingModality] =
    useState<ModalityConfigItem | null>(null);

  // =========================================================
  // Add radiologist dialog
  // =========================================================

  const [isAddingRadiologist, setIsAddingRadiologist] =
    useState(false);

  // =========================================================
  // Feedback
  // =========================================================

  const showFeedback = (
    text: string,
    type: "success" | "error" = "success",
  ) => {
    setStatusMessage({
      text,
      type,
    });

    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // =========================================================
  // Duration formatter
  // =========================================================

  const formatDuration = formatSlaDuration;

  // =========================================================
  // Shared styles
  // =========================================================

  const panelBase =
    "rounded-[28px] border border-white/70 bg-white/[0.78] shadow-[0_16px_45px_rgba(5,14,64,0.07)] backdrop-blur-xl";

  const inputBase =
    "w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 text-sm font-semibold text-qc-navy outline-none transition-all placeholder:text-slate-400 focus:border-qc-blue/30 focus:bg-white focus:ring-2 focus:ring-qc-blue/10";

  const tabButtonBase =
    "inline-flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-all duration-150";

  return (
    <div className="space-y-4">
      {/* =========================================================
          WORKSPACE TABS
          ========================================================= */}

      <div className={panelBase + " p-2"}>
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("slas")}
              className={`${tabButtonBase} ${
                activeTab === "slas"
                  ? "bg-qc-yellow text-qc-navy shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-qc-navy"
              }`}
            >
              <Clock className="h-4 w-4" />
              SLA Benchmarks
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rooms")}
              className={`${tabButtonBase} ${
                activeTab === "rooms"
                  ? "bg-qc-yellow text-qc-navy shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-qc-navy"
              }`}
            >
              <Building2 className="h-4 w-4" />
              Modality Rooms

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "rooms"
                    ? "bg-qc-navy/10 text-qc-navy"
                    : "bg-qc-blue/10 text-qc-blue"
                }`}
              >
                {modalities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("radiologists")
              }
              className={`${tabButtonBase} ${
                activeTab === "radiologists"
                  ? "bg-qc-yellow text-qc-navy shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-qc-navy"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Radiologists

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  activeTab === "radiologists"
                    ? "bg-qc-navy/10 text-qc-navy"
                    : "bg-qc-blue/10 text-qc-blue"
                }`}
              >
                {radiologists.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab("governance")
              }
              className={`${tabButtonBase} ${
                activeTab === "governance"
                  ? "bg-qc-yellow text-qc-navy shadow-sm"
                  : "text-slate-500 hover:bg-white/70 hover:text-qc-navy"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Data Governance
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          FEEDBACK
          ========================================================= */}

      {statusMessage && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm backdrop-blur-xl ${
            statusMessage.type === "success"
              ? "border-qc-blue/15 bg-qc-blue/[0.07] text-qc-blue"
              : "border-red-200 bg-red-50/85 text-qc-red"
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              statusMessage.type === "success"
                ? "bg-qc-blue/10"
                : "bg-red-100"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </span>

          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* =========================================================
          TAB 1 — SLA BENCHMARKS
          ========================================================= */}

      {activeTab === "slas" && (
        <div className="space-y-4">
          <section
            className={panelBase + " overflow-hidden"}
          >
            <div className="relative border-b border-white/70 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-qc-yellow/10" />

              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                    Turnaround targets
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-qc-navy">
                    SLA BENCHMARK MATRIX
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to restore all SLA target benchmarks to hospital defaults?",
                      )
                    ) {
                      startTransition(async () => {
                        const res =
                          await resetDefaultSlasAction();

                        if (res.success) {
                          showFeedback(
                            "All SLA benchmarks successfully restored to QCGH hospital standards!",
                          );
                        }
                      });
                    }
                  }}
                  disabled={isPending}
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-2.5 text-sm font-bold text-qc-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-qc-blue/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4 text-qc-orange" />
                  Reset SLA defaults
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {modalities.map((m) => {
              const statSla =
                m.slaConfigs.find(
                  (s) =>
                    s.urgencyLevel === "STAT" ||
                    s.triageLevel === "ER",
                );

              const opdSla =
                m.slaConfigs.find(
                  (s) =>
                    s.urgencyLevel === "ROUTINE" &&
                    s.triageLevel === "OPD",
                );

              const inSla =
                m.slaConfigs.find(
                  (s) =>
                    s.urgencyLevel === "ROUTINE" &&
                    s.triageLevel === "IN",
                );

              return (
                <section
                  key={m.modalityCode}
                  className={panelBase + " overflow-hidden"}
                >
                  {/* Modality header */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/70 bg-white/[0.62] px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="rounded-xl bg-qc-navy px-2.5 py-1.5 font-mono text-[11px] font-extrabold text-qc-yellow">
                        {m.modalityCode}
                      </span>

                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-extrabold text-qc-navy">
                          {m.modalityName}
                        </h4>

                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {m.departmentRoom ||
                            "Unassigned room"}{" "}
                          · {m.totalExams} scans
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                        m.isActive
                          ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                          : "border-orange-200 bg-orange-50 text-qc-orange"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.isActive
                            ? "bg-qc-blue"
                            : "bg-qc-orange"
                        }`}
                      />

                      {m.isActive
                        ? "Online"
                        : "Maintenance"}
                    </span>
                  </div>

                  {/* SLA rows */}
                  <div className="space-y-2.5 p-4">
                    {/* STAT / ER */}
                    <div className="rounded-2xl border border-red-100/90 bg-red-50/70 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-extrabold text-qc-red">
                            STAT / ER
                          </span>

                          <span className="truncate text-sm font-bold text-qc-navy">
                            Emergency priority
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-extrabold text-qc-red">
                            {statSla
                              ? formatDuration(
                                  statSla.targetTatMinutes,
                                )
                              : "2 days (48 hrs)"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingSla({
                                modalityCode:
                                  m.modalityCode,
                                modalityName:
                                  m.modalityName,
                                triageLevel: "ER",
                                urgencyLevel: "STAT",
                                currentTargetMinutes:
                                  statSla?.targetTatMinutes ||
                                  2880,
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
                            title="Edit target benchmark"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OPD */}
                    <div className="rounded-2xl border border-qc-blue/10 bg-qc-blue/5 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="rounded-lg bg-qc-blue/10 px-2 py-1 text-[10px] font-extrabold text-qc-blue">
                            OPD
                          </span>

                          <span className="truncate text-sm font-bold text-qc-navy">
                            Routine outpatient
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-extrabold text-qc-blue">
                            {opdSla
                              ? formatDuration(
                                  opdSla.targetTatMinutes,
                                )
                              : "3 days (72 hrs)"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingSla({
                                modalityCode:
                                  m.modalityCode,
                                modalityName:
                                  m.modalityName,
                                triageLevel: "OPD",
                                urgencyLevel: "ROUTINE",
                                currentTargetMinutes:
                                  opdSla?.targetTatMinutes ||
                                  4320,
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
                            title="Edit target benchmark"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* INPATIENT */}
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/65 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="rounded-lg bg-orange-100 px-2 py-1 text-[10px] font-extrabold text-qc-orange">
                            INPATIENT
                          </span>

                          <span className="truncate text-sm font-bold text-qc-navy">
                            Hospital ward / ICU
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-extrabold text-qc-orange">
                            {inSla
                              ? formatDuration(
                                  inSla.targetTatMinutes,
                                )
                              : "2 days (48 hrs)"}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingSla({
                                modalityCode:
                                  m.modalityCode,
                                modalityName:
                                  m.modalityName,
                                triageLevel: "IN",
                                urgencyLevel: "ROUTINE",
                                currentTargetMinutes:
                                  inSla?.targetTatMinutes ||
                                  2880,
                              })
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
                            title="Edit target benchmark"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2 — MODALITY ROOMS
          ========================================================= */}

      {activeTab === "rooms" && (
        <section
          className={panelBase + " overflow-hidden"}
        >
          <div className="border-b border-white/70 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                  Imaging operations
                </p>

                <h3 className="mt-0.5 text-lg font-extrabold text-qc-navy">
                  MODALITY ROOMS
                </h3>
              </div>

              <span className="shrink-0 rounded-full border border-qc-blue/15 bg-qc-blue/5 px-3 py-1.5 text-[11px] font-extrabold text-qc-blue">
                {modalities.length} modalities
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-slate-200/80 bg-white/[0.46]">
                <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-3.5">
                    Modality
                  </th>

                  <th className="px-5 py-3.5">
                    Service title
                  </th>

                  <th className="px-5 py-3.5">
                    Suite / room
                  </th>

                  <th className="px-5 py-3.5">
                    Scans
                  </th>

                  <th className="px-5 py-3.5">
                    Status
                  </th>

                  <th className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/70">
                {modalities.map((m) => (
                  <tr
                    key={m.modalityCode}
                    className="transition-colors hover:bg-qc-blue/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-xl bg-qc-navy px-2.5 py-1.5 font-mono text-[11px] font-extrabold text-qc-yellow">
                        {m.modalityCode}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-qc-navy">
                        {m.modalityName}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {m.departmentRoom ? (
                        <span className="text-sm font-medium text-slate-600">
                          {m.departmentRoom}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          None assigned
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-500">
                        {m.totalExams}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                          m.isActive
                            ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                            : "border-orange-200 bg-orange-50 text-qc-orange"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            m.isActive
                              ? "bg-qc-blue"
                              : "bg-qc-orange"
                          }`}
                        />

                        {m.isActive
                          ? "Online & active"
                          : "Under maintenance"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingModality(m)
                          }
                          className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs font-bold text-qc-navy transition-all hover:border-qc-blue/20 hover:bg-white hover:text-qc-blue"
                        >
                          Edit room
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(
                              async () => {
                                const res =
                                  await toggleModalityStatusAction(
                                    m.modalityCode,
                                    !m.isActive,
                                  );

                                if (res.success) {
                                  showFeedback(
                                    `${m.modalityCode} status updated to ${
                                      !m.isActive
                                        ? "Online"
                                        : "Under Maintenance"
                                    }`,
                                  );
                                }
                              },
                            );
                          }}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            m.isActive
                              ? "border-orange-200 bg-orange-50/80 text-qc-orange hover:bg-orange-100"
                              : "border-qc-blue/15 bg-qc-blue/5 text-qc-blue hover:bg-qc-blue/10"
                          }`}
                        >
                          {m.isActive
                            ? "Set maintenance"
                            : "Set online"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================
          TAB 3 — RADIOLOGISTS
          ========================================================= */}

      {activeTab === "radiologists" && (
        <section
          className={panelBase + " overflow-hidden"}
        >
          <div className="border-b border-white/70 bg-[linear-gradient(110deg,#F9FAFE_0%,#F4F7FF_55%,#FFF9E9_100%)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                  Clinical staffing
                </p>

                <h3 className="mt-0.5 text-lg font-extrabold text-qc-navy">
                  RADIOLOGISTS
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsAddingRadiologist(true)
                }
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-sm font-extrabold text-qc-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#eac13d]"
              >
                <Plus className="h-4 w-4" />
                Register radiologist
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-slate-200/80 bg-white/[0.46]">
                <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  <th className="px-5 py-3.5">
                    Physician
                  </th>

                  <th className="px-5 py-3.5">
                    Subspecialty
                  </th>


                  <th className="px-5 py-3.5">
                    Finalized scans
                  </th>

                  <th className="px-5 py-3.5">
                    Duty status
                  </th>

                  <th className="px-5 py-3.5 text-right">
                    Duty toggle
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200/70">
                {radiologists.map((r) => (
                  <tr
                    key={r.radiologistId}
                    className="transition-colors hover:bg-qc-blue/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="text-sm font-extrabold text-qc-navy">
                        {r.fullName}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {r.subspecialty ? (
                        <span className="text-sm font-medium text-slate-600">
                          {r.subspecialty}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">
                          General Radiology
                        </span>
                      )}
                    </td>


                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-500">
                        {r.totalReports}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                          r.isActive
                            ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                            : "border-slate-200 bg-white/70 text-slate-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.isActive
                              ? "bg-qc-blue"
                              : "bg-slate-400"
                          }`}
                        />

                        {r.isActive
                          ? "On active duty"
                          : "Off duty / leave"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            startTransition(
                              async () => {
                                const res =
                                  await toggleRadiologistStatusAction(
                                    r.radiologistId,
                                    !r.isActive,
                                  );

                                if (res.success) {
                                  showFeedback(
                                    `${r.fullName} is now ${
                                      !r.isActive
                                        ? "On Duty"
                                        : "Off Duty"
                                    }`,
                                  );
                                }
                              },
                            );
                          }}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            r.isActive
                              ? "border-slate-200 bg-white/70 text-slate-500 hover:bg-white hover:text-qc-navy"
                              : "border-qc-blue/15 bg-qc-blue/5 text-qc-blue hover:bg-qc-blue/10"
                          }`}
                        >
                          {r.isActive
                            ? "Set off-duty"
                            : "Activate duty"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================
          TAB 4 — DATA GOVERNANCE
          ========================================================= */}

      {activeTab === "governance" && (
        <section
          className={panelBase + " overflow-hidden"}
        >
          <div className="border-b border-white/70 bg-white/[0.62] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-qc-blue">
                Privacy & compliance
              </p>

              <h3 className="mt-1 text-lg font-extrabold text-qc-navy">
                DATA GOVERNANCE
              </h3>
            </div>
          </div>

          <div className="divide-y divide-slate-200/70">
            {/* Zero-PII */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  Zero-PII mode
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Patient-identifying information is not used
                  in the operational dashboard.
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-extrabold ${
                  governance.phiZeroCompliance
                    ? "border-qc-blue/15 bg-qc-blue/5 text-qc-blue"
                    : "border-orange-200 bg-orange-50 text-qc-orange"
                }`}
              >
                {governance.phiZeroCompliance
                  ? "Enabled"
                  : "Review"}
              </span>
            </div>

            {/* Accession keys */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  Examination identifiers
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Workflow records use de-identified accession
                  keys.
                </p>
              </div>

              <span className="shrink-0 text-xs font-semibold text-slate-500">
                De-identified
              </span>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  TAT timestamps
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Calculated from examination completion (T₁)
                  to report sign-off (T₂).
                </p>
              </div>

              <span className="shrink-0 text-xs font-semibold text-slate-500">
                T₁ → T₂
              </span>
            </div>

            {/* Accreditation */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  Hospital accreditation
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {governance.hospitalName}
                </p>
              </div>

              <span className="max-w-[240px] text-right text-xs font-semibold text-slate-500">
                {governance.dohAccreditation}
              </span>
            </div>

            {/* Ingestion */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  Ingestion
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Simulation and ingestion workflows remain
                  separate from the dashboard.
                </p>
              </div>

              <span className="shrink-0 text-xs font-semibold text-slate-500">
                Isolated
              </span>
            </div>

            {/* Version */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div>
                <p className="text-sm font-bold text-qc-navy">
                  System version
                </p>
              </div>

              <span className="shrink-0 font-mono text-xs font-semibold text-slate-500">
                {governance.systemVersion}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================
          MODAL 1 — EDIT SLA
          ========================================================= */}

      {editingSla && (
        <EditSlaModal
          editingSla={editingSla}
          onClose={() => setEditingSla(null)}
          onSuccess={(targetMinutes) => {
            showFeedback(
              `Updated SLA target for ${editingSla.modalityCode} (${editingSla.urgencyLevel}) to ${formatSlaDuration(targetMinutes)}!`,
            );
            setEditingSla(null);
          }}
          onError={(msg) => {
            showFeedback(msg, "error");
          }}
        />
      )}

      {/* =========================================================
          MODAL 2 — EDIT MODALITY
          ========================================================= */}

      {editingModality && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-qc-yellow/10" />

            <button
              type="button"
              onClick={() =>
                setEditingModality(null)
              }
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-qc-navy"
              aria-label="Close modality dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative pr-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-blue/10 text-qc-blue">
                  <Building2 className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-qc-navy">
                    Edit modality suite
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {editingModality.modalityName} (
                    {editingModality.modalityCode})
                  </p>
                </div>
              </div>
            </div>

            <form
              action={async (formData: FormData) => {
                startTransition(async () => {
                  const res =
                    await updateModalityDetailsAction(
                      formData,
                    );

                  if (res.success) {
                    showFeedback(
                      `Updated room details for ${editingModality.modalityCode}!`,
                    );

                    setEditingModality(null);
                  }
                });
              }}
              className="relative mt-6 space-y-5"
            >
              <input
                type="hidden"
                name="modalityCode"
                value={editingModality.modalityCode}
              />

              <div>
                <label className="mb-2 block text-sm font-bold text-qc-navy">
                  Department room assignment
                </label>

                <input
                  type="text"
                  name="departmentRoom"
                  defaultValue={
                    editingModality.departmentRoom ||
                    ""
                  }
                  placeholder="e.g. CT Suite 1, X-Ray Room 2"
                  className={inputBase}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-qc-navy">
                  Operational status
                </label>

                <select
                  name="isActive"
                  defaultValue={
                    editingModality.isActive
                      ? "true"
                      : "false"
                  }
                  className={inputBase}
                >
                  <option value="true">
                    Online & operational
                  </option>

                  <option value="false">
                    Under maintenance (offline)
                  </option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setEditingModality(null)
                  }
                  className="rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-qc-navy"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-sm font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3 — ADD RADIOLOGIST
          ========================================================= */}

      {isAddingRadiologist && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-qc-navy/45 p-4 backdrop-blur-[4px] animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_70px_rgba(5,6,64,0.18)]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-qc-yellow/10" />

            <button
              type="button"
              onClick={() =>
                setIsAddingRadiologist(false)
              }
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-qc-navy"
              aria-label="Close radiologist dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative pr-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-yellow/20 text-qc-navy">
                  <UserCheck className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-qc-navy">
                    Register attending radiologist
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Add an interpreting physician to the
                    active departmental roster.
                  </p>
                </div>
              </div>
            </div>

            <form
              action={async (formData: FormData) => {
                startTransition(async () => {
                  const res =
                    await createRadiologistAction(
                      formData,
                    );

                  if (res.success) {
                    showFeedback(
                      "New radiologist registered successfully!",
                    );

                    setIsAddingRadiologist(false);
                  } else {
                    showFeedback(
                      res.message ||
                        "Failed to register radiologist",
                      "error",
                    );
                  }
                });
              }}
              className="relative mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-qc-navy">
                  Physician full name & title
                </label>

                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Dr. Juan Santos, MD, FPCR"
                  className={inputBase}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-qc-navy">
                  Subspecialty fellowship
                </label>

                <input
                  type="text"
                  name="subspecialty"
                  placeholder="e.g. Neuroradiology, MSK, Thoracic"
                  className={inputBase}
                />
              </div>


              <div className="flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsAddingRadiologist(false)
                  }
                  className="rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-qc-navy"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-qc-yellow px-4 py-2.5 text-sm font-extrabold text-qc-navy transition-all hover:-translate-y-0.5 hover:bg-[#eac13d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Register doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}