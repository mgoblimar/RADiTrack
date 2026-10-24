import React from "react";
import type { ModalityTatDisplayItem } from "./types";

/* =========================================================
   Custom Modality X-Axis Tick (Shows friendly modality name)
========================================================= */
export const renderModalityTick = (props: any) => {
  const { x, y, payload } = props;
  if (!payload || payload.value === undefined || payload.value === null) return null;

  const raw = String(payload.value);
  const code = raw.toUpperCase();

  // Map modality code to clean friendly display name
  const labels: Record<string, string> = {
    CT: "CT-Scan",
    XRAY: "X-ray",
    XR: "X-ray",
    US: "Ultrasound",
    MRI: "MRI",
    MAMMO: "Mammogram",
    MAMMOGRAPHY: "Mammogram",
  };

  const label = labels[code] || raw;

  return (
    <g transform={`translate(${x}, ${y + 8})`}>
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#050E40"
        fontSize={12}
        fontWeight={800}
        className="select-none tracking-tight"
      >
        {label}
      </text>
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
  return function renderActualTatLabel(props: any) {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null) return null;
    const item = displayData[index];
    if (!item || item.volume === 0) return null;

    const isBreach = hasTargetSla && item.target !== null && item.avgTat > item.target;

    return (
      <g transform={`translate(${x + width / 2}, ${y - 10})`}>
        <rect
          x={-19}
          y={-14}
          width={38}
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
          fontSize={10}
          fontWeight={800}
        >
          {value} hrs
        </text>
      </g>
    );
  };
};
