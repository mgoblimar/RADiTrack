"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Sheet({
  ...props
}: SheetPrimitive.Root.Props) {
  return (
    <SheetPrimitive.Root
      data-slot="sheet"
      {...props}
    />
  );
}

function SheetTrigger({
  ...props
}: SheetPrimitive.Trigger.Props) {
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      {...props}
    />
  );
}

function SheetClose({
  ...props
}: SheetPrimitive.Close.Props) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      {...props}
    />
  );
}

function SheetPortal({
  ...props
}: SheetPrimitive.Portal.Props) {
  return (
    <SheetPrimitive.Portal
      data-slot="sheet-portal"
      {...props}
    />
  );
}

function SheetOverlay({
  className,
  ...props
}: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        [
          "fixed",
          "inset-0",
          "z-50",
          "bg-qc-navy/20",
          "transition-opacity",
          "duration-200",
          "data-ending-style:opacity-0",
          "data-starting-style:opacity-0",
          "supports-backdrop-filter:backdrop-blur-[2px]",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <SheetPortal>
      <SheetOverlay />

      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          [
            "fixed",
            "z-50",
            "flex",
            "flex-col",
            "gap-5",
            "bg-card",
            "bg-clip-padding",
            "text-sm",
            "text-foreground",
            "shadow-[0_20px_60px_rgba(5,14,64,0.14)]",
            "transition",
            "duration-200",
            "ease-in-out",

            // Animation state
            "data-ending-style:opacity-0",
            "data-starting-style:opacity-0",

            // Bottom
            "data-[side=bottom]:inset-x-0",
            "data-[side=bottom]:bottom-0",
            "data-[side=bottom]:h-auto",
            "data-[side=bottom]:border-t",
            "data-[side=bottom]:border-border",
            "data-[side=bottom]:rounded-t-3xl",
            "data-[side=bottom]:data-ending-style:translate-y-[2.5rem]",
            "data-[side=bottom]:data-starting-style:translate-y-[2.5rem]",

            // Left
            "data-[side=left]:inset-y-0",
            "data-[side=left]:left-0",
            "data-[side=left]:h-full",
            "data-[side=left]:w-3/4",
            "data-[side=left]:border-r",
            "data-[side=left]:border-border",
            "data-[side=left]:rounded-r-3xl",
            "data-[side=left]:data-ending-style:translate-x-[-2.5rem]",
            "data-[side=left]:data-starting-style:translate-x-[-2.5rem]",

            // Right
            "data-[side=right]:inset-y-0",
            "data-[side=right]:right-0",
            "data-[side=right]:h-full",
            "data-[side=right]:w-3/4",
            "data-[side=right]:border-l",
            "data-[side=right]:border-border",
            "data-[side=right]:rounded-l-3xl",
            "data-[side=right]:data-ending-style:translate-x-[2.5rem]",
            "data-[side=right]:data-starting-style:translate-x-[2.5rem]",

            // Top
            "data-[side=top]:inset-x-0",
            "data-[side=top]:top-0",
            "data-[side=top]:h-auto",
            "data-[side=top]:border-b",
            "data-[side=top]:border-border",
            "data-[side=top]:rounded-b-3xl",
            "data-[side=top]:data-ending-style:translate-y-[-2.5rem]",
            "data-[side=top]:data-starting-style:translate-y-[-2.5rem]",

            // Responsive widths
            "data-[side=left]:sm:max-w-sm",
            "data-[side=right]:sm:max-w-sm",
          ].join(" "),
          className,
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-4 top-4 rounded-xl"
              />
            }
          >
            <XIcon />
            <span className="sr-only">
              Close
            </span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-1 p-5 sm:p-6",
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        [
          "mt-auto",
          "flex",
          "flex-col",
          "gap-2",
          "border-t",
          "border-border",
          "bg-background/60",
          "p-5",
          "sm:p-6",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        [
          "font-heading",
          "text-lg",
          "font-extrabold",
          "tracking-tight",
          "text-qc-navy",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(
        [
          "text-sm",
          "font-medium",
          "leading-relaxed",
          "text-muted-foreground",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};