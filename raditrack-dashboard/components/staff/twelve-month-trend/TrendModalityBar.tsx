"use client";

import { Layers } from "lucide-react";
import { ModalityCode } from "@/lib/enums";
import { MODALITIES, ModalityConfig } from "./types";

interface TrendModalityBarProps {
  selectedModality: "ALL" | "MULTI" | ModalityCode;
  onSelectModality: (modality: "ALL" | "MULTI" | ModalityCode) => void;
  isModalitySpecific: boolean;
  activeModalityConfig: ModalityConfig | null;
}

export function TrendModalityBar({
  selectedModality,
  onSelectModality,
  isModalitySpecific,
  activeModalityConfig,
}: TrendModalityBarProps) {
  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Modality:
        </span>

        {/* Overall Avg */}
        <button
          type="button"
          onClick={() => onSelectModality("ALL")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
            selectedModality === "ALL"
              ? "bg-qc-navy text-white shadow-sm ring-1 ring-qc-navy"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              selectedModality === "ALL" ? "bg-qc-yellow" : "bg-qc-blue"
            }`}
          />
          Overall Avg
        </button>

        {/* All Modalities Multi-line */}
        <button
          type="button"
          onClick={() => onSelectModality("MULTI")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
            selectedModality === "MULTI"
              ? "bg-qc-navy text-white shadow-sm ring-1 ring-qc-navy"
              : "border border-border/80 bg-background text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
          }`}
        >
          <Layers className="h-3 w-3 text-qc-yellow" />
          All Modalities
        </button>

        {/* Individual Modality Buttons */}
        {MODALITIES.map((m) => {
          const isSelected = selectedModality === m.code;
          return (
            <button
              key={m.code}
              type="button"
              onClick={() => onSelectModality(m.code)}
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
            Showing:{" "}
            <strong className="text-qc-navy">
              {activeModalityConfig.label}
            </strong>{" "}
            vs Overall Hospital Avg
          </span>
        </div>
      )}
    </div>
  );
}
