import * as React from "react";
import { cn } from "cn";

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        [
          "group/card",
          "flex",
          "flex-col",
          "gap-(--card-spacing)",
          "overflow-hidden",
          "rounded-3xl",
          "border",
          "border-border",
          "bg-card",
          "py-(--card-spacing)",
          "text-sm",
          "text-foreground",
          "[--card-spacing:--spacing(5)]",
          "data-[size=sm]:[--card-spacing:--spacing(4)]",
          "shadow-[0_4px_20px_rgba(5,14,64,0.035)]",
          "transition-shadow",
          "duration-200",
          "hover:shadow-[0_8px_28px_rgba(5,14,64,0.055)]",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        [
          "group/card-header",
          "@container/card-header",
          "grid",
          "auto-rows-min",
          "items-start",
          "gap-1.5",
          "px-(--card-spacing)",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        [
          "text-lg",
          "font-extrabold",
          "tracking-tight",
          "text-qc-navy",
          "group-data-[size=sm]/card:text-base",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
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

function CardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        [
          "col-start-2",
          "row-span-2",
          "row-start-1",
          "self-start",
          "justify-self-end",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        [
          "flex",
          "items-center",
          "px-(--card-spacing)",
          "pt-3",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};