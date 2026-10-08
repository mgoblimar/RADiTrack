import { Button as ButtonPrimitive } from "@base-ui/react/button";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  [
    "group/button",
    "inline-flex",
    "shrink-0",
    "items-center",
    "justify-center",
    "rounded-2xl",
    "border",
    "border-transparent",
    "bg-clip-padding",
    "text-sm",
    "font-extrabold",
    "whitespace-nowrap",
    "transition-all",
    "duration-150",
    "outline-none",
    "select-none",
    "focus-visible:border-ring",
    "focus-visible:ring-[3px]",
    "focus-visible:ring-ring/25",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "aria-invalid:border-destructive",
    "aria-invalid:ring-3",
    "aria-invalid:ring-destructive/20",
    "dark:aria-invalid:border-destructive/50",
    "dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-qc-yellow text-qc-navy shadow-sm hover:-translate-y-0.5 hover:bg-[#eac13d] hover:shadow-md",

        outline:
          "border-border bg-card text-qc-navy shadow-sm hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue aria-expanded:bg-qc-blue/5 aria-expanded:text-qc-blue",

        secondary:
          "border-border bg-muted text-qc-navy hover:bg-muted/80 hover:text-qc-navy aria-expanded:bg-muted aria-expanded:text-qc-navy",

        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-qc-navy aria-expanded:bg-muted aria-expanded:text-qc-navy",

        destructive:
          "border-red-200 bg-red-50 text-qc-red hover:bg-red-100 focus-visible:border-red-300 focus-visible:ring-red-200/40",

        link:
          "border-transparent bg-transparent px-0 text-qc-blue underline-offset-4 hover:underline",
      },

      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",

        xs:
          "h-7 gap-1.5 rounded-xl px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",

        sm:
          "h-8 gap-1.5 rounded-xl px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",

        lg:
          "h-11 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",

        icon:
          "size-10",

        "icon-xs":
          "size-7 rounded-xl [&_svg:not([class*='size-'])]:size-3",

        "icon-sm":
          "size-8 rounded-xl [&_svg:not([class*='size-'])]:size-3.5",

        "icon-lg":
          "size-11",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    />
  );
}

export {
  Button,
  buttonVariants,
};