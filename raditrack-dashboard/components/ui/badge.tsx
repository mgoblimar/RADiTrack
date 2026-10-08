import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
  [
    "group/badge",
    "inline-flex",
    "h-6",
    "w-fit",
    "shrink-0",
    "items-center",
    "justify-center",
    "gap-1",
    "overflow-hidden",
    "rounded-full",
    "border",
    "px-2.5",
    "py-1",
    "text-[11px]",
    "font-bold",
    "leading-none",
    "whitespace-nowrap",
    "transition-colors",
    "focus-visible:border-ring",
    "focus-visible:outline-none",
    "focus-visible:ring-[3px]",
    "focus-visible:ring-ring/30",
    "has-data-[icon=inline-end]:pr-2",
    "has-data-[icon=inline-start]:pl-2",
    "aria-invalid:border-destructive",
    "aria-invalid:ring-destructive/20",
    "dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none",
    "[&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-qc-blue/15 bg-qc-blue/5 text-qc-blue hover:bg-qc-blue/10",

        secondary:
          "border-border bg-muted text-qc-navy hover:bg-muted/80",

        destructive:
          "border-red-200 bg-red-50 text-qc-red hover:bg-red-100 focus-visible:ring-destructive/20",

        outline:
          "border-border bg-transparent text-qc-navy hover:bg-muted hover:text-qc-navy",

        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-qc-navy",

        link:
          "border-transparent bg-transparent text-qc-blue underline-offset-4 hover:underline",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",

    props: mergeProps<"span">(
      {
        className: cn(
          badgeVariants({ variant }),
          className,
        ),
      },
      props,
    ),

    render,

    state: {
      slot: "badge",
      variant,
    },
  });
}

export {
  Badge,
  badgeVariants,
};