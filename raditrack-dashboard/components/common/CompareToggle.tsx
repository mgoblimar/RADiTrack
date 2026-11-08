"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

interface CompareToggleProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  /** Colour of the checkbox when on; matches how the comparison is drawn. */
  accentColor: string;
  /** Small legend mark for the comparison, e.g. a dashed line. */
  swatch?: ReactNode;
  title?: string;
}

/**
 * The dashboard's one "show a comparison" switch: a checkbox and its label.
 * It is deliberately not a pill, so it never reads as another option of a
 * neighbouring SegmentedToggle.
 */
export function CompareToggle({
  label,
  checked,
  onChange,
  accentColor,
  swatch,
  title,
}: CompareToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      title={title}
      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2 text-xs font-extrabold text-qc-navy transition-colors hover:bg-qc-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 lg:h-9"
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors"
        style={{
          backgroundColor: checked ? accentColor : "#FFFFFF",
          borderColor: checked ? accentColor : "#94A3B8",
        }}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span className={checked ? "" : "text-muted-foreground"}>{label}</span>
      {swatch}
    </button>
  );
}
