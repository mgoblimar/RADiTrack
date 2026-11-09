"use client";

import { UserRound } from "lucide-react";
import { MODALITY_CONFIG, type ModalityCode } from "@/lib/enums";

interface MyModalitiesBarProps {
  /** The signed-in doctor's assigned modalities, in assigned order. */
  modalities: readonly ModalityCode[];
  selected: "ALL" | ModalityCode;
  onSelect: (modality: "ALL" | ModalityCode) => void;
}

/**
 * Quick switches between the doctor's own modalities and the whole department.
 * The full modality filter in the filter bar still works as usual.
 */
export function MyModalitiesBar({ modalities, selected, onSelect }: MyModalitiesBarProps) {
  if (modalities.length === 0) return null;

  const options: Array<{ value: "ALL" | ModalityCode; label: string }> = [
    ...modalities.map((code) => ({
      value: code,
      label: MODALITY_CONFIG[code]?.shortName ?? code,
    })),
    { value: "ALL", label: "All modalities" },
  ];

  return (
    <div
      role="group"
      aria-label="Your modalities"
      className="mt-2 flex flex-wrap items-center gap-1.5 px-1"
    >
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
        <UserRound className="h-3.5 w-3.5 text-qc-blue" />
        Your modalities
      </span>
      {options.map((option) => {
        const isActive = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(option.value)}
            className={`h-8 rounded-full border px-3 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
              isActive
                ? "border-qc-navy bg-qc-navy text-white"
                : option.value === "ALL"
                  ? "border-dashed border-border bg-white/80 text-muted-foreground hover:border-qc-blue/40 hover:text-qc-navy"
                  : "border-border bg-white text-qc-navy hover:border-qc-blue/40 hover:bg-qc-blue/5"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
