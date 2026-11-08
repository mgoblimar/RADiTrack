"use client";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional tooltip explaining the option. */
  hint?: string;
}

interface SegmentedToggleProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group, e.g. "Seven-day window". */
  label: string;
}

/**
 * The dashboard's one mode-switch style: a white track where the selected
 * option is filled navy. Use it only for "pick one of these views" choices;
 * read-only values such as date ranges are plain text, not pills.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-10 shrink-0 items-center rounded-xl border border-border bg-white p-0.5 shadow-sm lg:h-9"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.hint}
            className={`inline-flex h-full items-center whitespace-nowrap rounded-[10px] px-3 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
              isActive
                ? "bg-qc-navy text-white shadow-sm"
                : "text-muted-foreground hover:bg-qc-blue/5 hover:text-qc-navy"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
