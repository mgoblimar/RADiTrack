import React from "react";
import type { LabelProps, XAxisTickContentProps } from "recharts";
import type { ModalityTatDisplayItem } from "./types";

/** Friendly modality names, shared by the axis and the tooltip. */
const MODALITY_LABELS: Record<string, string> = {
  CT: "CT-Scan",
  XRAY: "X-ray",
  XR: "X-ray",
  US: "Ultrasound",
  MRI: "MRI",
  MAMMO: "Mammogram",
  MAMMOGRAPHY: "Mammogram",
};

export function modalityLabel(code: string): string {
  return MODALITY_LABELS[code.toUpperCase()] ?? code;
}

/* =========================================================
   Custom Modality X-Axis Tick (Shows friendly modality name)
========================================================= */
/** X-axis tick showing the friendly modality name; the highlighted one is emphasised. */
export const createModalityTickRenderer = (
  highlightCode: string | null,
  /** Modalities with no finalized scans: marked "No scans" under the name. */
  emptyCodes: ReadonlySet<string>,
) =>
  function renderModalityTick(props: XAxisTickContentProps) {
  const { payload } = props;
  const x = Number(props.x);
  const y = Number(props.y);
  if (!payload || payload.value === undefined || payload.value === null) return null;

  const raw = String(payload.value);
  const code = raw.toUpperCase();
  const label = modalityLabel(raw);
  const isHighlighted = highlightCode !== null && code === highlightCode;
  const isEmpty = emptyCodes.has(code);

  return (
    <g transform={`translate(${x}, ${y + 8})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#050E40"
        fontSize={isHighlighted ? 14 : 13}
        fontWeight={isHighlighted ? 900 : 800}
        textDecoration={isHighlighted ? "underline" : undefined}
        className="select-none tracking-tight"
      >
        {label}
      </text>
      {isEmpty && (
        <text
          x={0}
          y={18}
          textAnchor="middle"
          dominantBaseline="hanging"
          fill="#64748B"
          fontSize={12}
          fontWeight={600}
          className="select-none"
        >
          No scans
        </text>
      )}
    </g>
  );
};

/* =========================================================
   Direct Average TAT Badge Label (no hover needed)
========================================================= */
export const createActualTatLabelRenderer = (
  displayData: ModalityTatDisplayItem[],
  hasTargetSla: boolean,
) => {
  // The LabelList's dataKey is "modality", so `value` is the modality code.
  // Recharts drops zero-height bars before labelling, so the label `index`
  // does not line up with displayData; look items up by code instead.
  const byModality = new Map(displayData.map((item) => [item.modality, item]));

  return function renderActualTatLabel(props: LabelProps) {
    const x = Number(props.x);
    const y = Number(props.y);
    const width = Number(props.width);
    const item = byModality.get(String(props.value));
    if (!item || item.volume === 0) return null;

    const isBreach = hasTargetSla && item.target !== null && item.avgTat > item.target;
    const text = `${item.avgTat} hrs`;
    // Sized to its text (about 7px per character at 12px bold, plus padding).
    const boxWidth = Math.max(40, text.length * 7 + 14);

    return (
      <g transform={`translate(${x + width / 2}, ${y - 10})`}>
        <rect
          x={-boxWidth / 2}
          y={-14}
          width={boxWidth}
          height={18}
          rx={5}
          fill={isBreach ? "#A60808" : "#FFFFFF"}
          stroke={isBreach ? "#DC2626" : "#CBD5E1"}
          strokeWidth={1}
          style={{ filter: "drop-shadow(0 2px 4px rgba(5, 14, 64, 0.12))" }}
        />
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isBreach ? "#FFFFFF" : "#050E40"}
          fontSize={12}
          fontWeight={800}
        >
          {text}
        </text>
      </g>
    );
  };
};
