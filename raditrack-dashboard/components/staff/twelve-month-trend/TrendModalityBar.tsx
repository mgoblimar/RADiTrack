"use client";

import { Layers } from "lucide-react";
import { ModalityCode } from "@/lib/enums";
import {
  MODALITIES,
  QC_BLUE,
  QC_NAVY,
} from "./types";
import type { ModalityConfig } from "./types";

/* RADiTrack official yellow accent */
const QC_YELLOW = "#ffd230";

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
  const baseButtonClass =
    "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d3e9d] focus-visible:ring-offset-2 lg:min-h-0 lg:px-2.5";

  const inactiveButtonClass =
    "border border-border/80 bg-background text-muted-foreground hover:bg-[#2d3e9d]/[0.06] hover:text-[#00357a]";

  const activeButtonStyle = {
    backgroundColor: QC_NAVY,
    borderColor: QC_NAVY,
    color: "#FFFFFF",
  };

  return (
    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          Modality:
        </span>

        {/* Overall Average */}

        <button
          type="button"
          onClick={() => onSelectModality("ALL")}
          aria-pressed={selectedModality === "ALL"}
          className={`${baseButtonClass} ${
            selectedModality === "ALL"
              ? "border shadow-sm"
              : inactiveButtonClass
          }`}
          style={
            selectedModality === "ALL"
              ? activeButtonStyle
              : undefined
          }
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor:
                selectedModality === "ALL"
                  ? QC_YELLOW
                  : QC_BLUE,
            }}
          />

          Overall Avg
        </button>

        {/* All Modalities Multi-line */}

        <button
          type="button"
          onClick={() => onSelectModality("MULTI")}
          aria-pressed={selectedModality === "MULTI"}
          className={`${baseButtonClass} ${
            selectedModality === "MULTI"
              ? "border shadow-sm"
              : inactiveButtonClass
          }`}
          style={
            selectedModality === "MULTI"
              ? activeButtonStyle
              : undefined
          }
        >
          <Layers
            className="h-3 w-3"
            style={{ color: QC_YELLOW }}
          />

          All Modalities
        </button>

        {/* Individual Modality Buttons */}

        {MODALITIES.map((modality) => {
          const isSelected =
            selectedModality === modality.code;

          return (
            <button
              key={modality.code}
              type="button"
              onClick={() =>
                onSelectModality(modality.code)
              }
              aria-pressed={isSelected}
              className={`${baseButtonClass} ${
                isSelected
                  ? "border shadow-sm ring-1 ring-black/10"
                  : inactiveButtonClass
              }`}
              style={{
                backgroundColor: isSelected
                  ? modality.color
                  : undefined,
                borderColor: isSelected
                  ? modality.color
                  : undefined,
                color: isSelected
                  ? "#FFFFFF"
                  : undefined,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: isSelected
                    ? "#FFFFFF"
                    : modality.color,
                }}
              />

              {modality.label}
            </button>
          );
        })}
      </div>

      {/* Selected Modality Description */}

      {isModalitySpecific && activeModalityConfig && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing:{" "}
            <strong style={{ color: QC_NAVY }}>
              {activeModalityConfig.label}
            </strong>{" "}
            vs Overall Hospital Avg
          </span>
        </div>
      )}
    </div>
  );
}