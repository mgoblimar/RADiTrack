import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        [
          "h-10",
          "w-full",
          "min-w-0",
          "rounded-2xl",
          "border",
          "border-border",
          "bg-background",
          "px-3.5",
          "py-2.5",
          "text-sm",
          "font-medium",
          "text-qc-navy",
          "shadow-none",
          "transition-colors",
          "outline-none",

          // File inputs
          "file:inline-flex",
          "file:h-7",
          "file:border-0",
          "file:bg-transparent",
          "file:text-sm",
          "file:font-semibold",
          "file:text-qc-navy",

          // Placeholder
          "placeholder:text-muted-foreground",

          // Focus
          "focus-visible:border-qc-blue/30",
          "focus-visible:bg-card",
          "focus-visible:ring-[3px]",
          "focus-visible:ring-qc-blue/10",

          // Disabled
          "disabled:pointer-events-none",
          "disabled:cursor-not-allowed",
          "disabled:bg-muted",
          "disabled:text-muted-foreground",
          "disabled:opacity-70",

          // Invalid
          "aria-invalid:border-red-200",
          "aria-invalid:bg-red-50/50",
          "aria-invalid:ring-[3px]",
          "aria-invalid:ring-red-100",

          // Remove browser-specific dark input treatment
          "dark:bg-background",
          "dark:disabled:bg-muted",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

export { Input };