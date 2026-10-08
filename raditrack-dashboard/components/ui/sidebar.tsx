"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";
import { cn } from "cn";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Skeleton } from "@/components/ui/skeleton";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { PanelLeftIcon } from "lucide-react";

// =========================================================
// Sidebar constants
// =========================================================

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE =
  60 * 60 * 24 * 7;

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";

const SIDEBAR_KEYBOARD_SHORTCUT = "b";

// =========================================================
// Sidebar context
// =========================================================

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (
    open: boolean | ((open: boolean) => boolean),
  ) => void;
  openMobile: boolean;
  setOpenMobile: (
    open: boolean | ((open: boolean) => boolean),
  ) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext =
  React.createContext<SidebarContextProps | null>(
    null,
  );

function useSidebar() {
  const context =
    React.useContext(SidebarContext);

  if (!context) {
    throw new Error(
      "useSidebar must be used within a SidebarProvider.",
    );
  }

  return context;
}

// =========================================================
// Sidebar Provider
// =========================================================

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();

  const [openMobile, setOpenMobile] =
    React.useState(false);

  const [_open, _setOpen] =
    React.useState(defaultOpen);

  const open = openProp ?? _open;

  const setOpen = React.useCallback(
    (
      value:
        | boolean
        | ((value: boolean) => boolean),
    ) => {
      const openState =
        typeof value === "function"
          ? value(open)
          : value;

      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // =======================================================
  // Toggle sidebar
  // =======================================================

  const toggleSidebar =
    React.useCallback(() => {
      return isMobile
        ? setOpenMobile(
            (current) => !current,
          )
        : setOpen(
            (current) => !current,
          );
    }, [
      isMobile,
      setOpen,
      setOpenMobile,
    ]);

  // =======================================================
  // Keyboard shortcut
  // =======================================================

  React.useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
          SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey ||
          event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [toggleSidebar]);

  const state = open
    ? "expanded"
    : "collapsed";

  const contextValue =
    React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      ],
    );

  return (
    <SidebarContext.Provider
      value={contextValue}
    >
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width":
              SIDEBAR_WIDTH,
            "--sidebar-width-icon":
              SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full bg-background",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// =========================================================
// Sidebar
// =========================================================

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?:
    | "sidebar"
    | "floating"
    | "inset";
  collapsible?:
    | "offcanvas"
    | "icon"
    | "none";
}) {
  const {
    isMobile,
    state,
    openMobile,
    setOpenMobile,
  } = useSidebar();

  // =======================================================
  // Non-collapsible sidebar
  // =======================================================

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          [
            "flex",
            "h-full",
            "w-(--sidebar-width)",
            "flex-col",
            "bg-sidebar",
            "text-sidebar-foreground",
          ].join(" "),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // =======================================================
  // Mobile sidebar
  // =======================================================

  if (isMobile) {
    return (
      <Sheet
        open={openMobile}
        onOpenChange={setOpenMobile}
        {...props}
      >
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width":
                SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>
              Sidebar
            </SheetTitle>

            <SheetDescription>
              Displays the mobile sidebar.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full w-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // =======================================================
  // Desktop sidebar
  // =======================================================

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={
        state === "collapsed"
          ? collapsible
          : ""
      }
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Sidebar gap */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          [
            "relative",
            "w-(--sidebar-width)",
            "bg-transparent",
            "transition-[width]",
            "duration-200",
            "ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
          ].join(" "),

          variant === "floating" ||
            variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+--spacing(4))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />

      {/* Sidebar container */}
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          [
            "fixed",
            "inset-y-0",
            "z-10",
            "hidden",
            "h-svh",
            "w-(--sidebar-width)",
            "transition-[left,right,width]",
            "duration-200",
            "ease-linear",

            "data-[side=left]:left-0",
            "data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]",

            "data-[side=right]:right-0",
            "data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",

            "md:flex",
          ].join(" "),

          variant === "floating" ||
            variant === "inset"
            ? [
                "p-2",
                "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+--spacing(4)+2px)]",
              ].join(" ")
            : [
                "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
                "group-data-[side=left]:border-r",
                "group-data-[side=right]:border-l",
                "group-data-[side=left]:border-sidebar-border",
                "group-data-[side=right]:border-sidebar-border",
              ].join(" "),

          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={cn(
            [
              "flex",
              "size-full",
              "flex-col",
              "bg-sidebar",
              "text-sidebar-foreground",
              "group-data-[variant=floating]:rounded-3xl",
              "group-data-[variant=floating]:shadow-[0_16px_40px_rgba(5,14,64,0.12)]",
              "group-data-[variant=floating]:ring-1",
              "group-data-[variant=floating]:ring-sidebar-border",
            ].join(" "),
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Sidebar trigger
// =========================================================

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } =
    useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">
        Toggle Sidebar
      </span>
    </Button>
  );
}

// =========================================================
// Sidebar rail
// =========================================================

function SidebarRail({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } =
    useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        [
          "absolute",
          "inset-y-0",
          "z-20",
          "hidden",
          "w-4",
          "transition-all",
          "ease-linear",

          "group-data-[side=left]:-right-4",
          "group-data-[side=right]:left-0",

          "after:absolute",
          "after:inset-y-0",
          "after:start-1/2",
          "after:w-px",

          "hover:after:bg-sidebar-border",

          "sm:flex",

          "ltr:-translate-x-1/2",
          "rtl:-translate-x-1/2",

          "in-data-[side=left]:cursor-w-resize",
          "in-data-[side=right]:cursor-e-resize",

          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize",
          "[[data-side=right][data-state=collapsed]_&]:cursor-w-resize",

          "group-data-[collapsible=offcanvas]:translate-x-0",
          "group-data-[collapsible=offcanvas]:after:left-full",
          "hover:group-data-[collapsible=offcanvas]:bg-sidebar",

          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Sidebar inset
// =========================================================

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        [
          "relative",
          "flex",
          "w-full",
          "flex-1",
          "flex-col",
          "bg-background",

          "md:peer-data-[variant=inset]:m-2",
          "md:peer-data-[variant=inset]:ml-0",
          "md:peer-data-[variant=inset]:rounded-3xl",
          "md:peer-data-[variant=inset]:shadow-sm",
          "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Sidebar input
// =========================================================

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        [
          "h-9",
          "border-white/10",
          "bg-white/5",
          "text-white",
          "shadow-none",
          "placeholder:text-sidebar-foreground/45",
          "focus-visible:border-qc-yellow/50",
          "focus-visible:bg-white/10",
          "focus-visible:ring-qc-yellow/10",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Header
// =========================================================

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(
        "flex flex-col gap-2 border-b border-white/8 p-3",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Footer
// =========================================================

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn(
        "flex flex-col gap-2 border-t border-white/8 p-3",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Sidebar separator
// =========================================================

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<
  typeof Separator
>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn(
        "mx-3 w-auto bg-white/8",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Content
// =========================================================

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        [
          "no-scrollbar",
          "flex",
          "min-h-0",
          "flex-1",
          "flex-col",
          "gap-0",
          "overflow-auto",
          "group-data-[collapsible=icon]:overflow-hidden",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Group
// =========================================================

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn(
        "relative flex w-full min-w-0 flex-col p-2.5",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Group label
// =========================================================

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> &
  React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",

    props: mergeProps<"div">(
      {
        className: cn(
          [
            "flex",
            "h-8",
            "shrink-0",
            "items-center",
            "rounded-xl",
            "px-2.5",
            "text-[10px]",
            "font-extrabold",
            "uppercase",
            "tracking-wider",
            "text-sidebar-foreground/45",

            "ring-sidebar-ring",
            "outline-hidden",

            "transition-[margin,opacity]",
            "duration-200",
            "ease-linear",

            "group-data-[collapsible=icon]:-mt-8",
            "group-data-[collapsible=icon]:opacity-0",

            "focus-visible:ring-2",

            "[&>svg]:size-4",
            "[&>svg]:shrink-0",
          ].join(" "),
          className,
        ),
      },
      props,
    ),

    render,

    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  });
}

// =========================================================
// Group action
// =========================================================

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",

    props: mergeProps<"button">(
      {
        className: cn(
          [
            "absolute",
            "right-3",
            "top-3.5",
            "flex",
            "aspect-square",
            "w-7",
            "items-center",
            "justify-center",
            "rounded-xl",
            "p-0",
            "text-sidebar-foreground/60",

            "ring-sidebar-ring",
            "outline-hidden",

            "transition-colors",

            "group-data-[collapsible=icon]:hidden",

            "after:absolute",
            "after:-inset-2",

            "hover:bg-sidebar-accent",
            "hover:text-white",

            "focus-visible:ring-2",

            "md:after:hidden",

            "[&>svg]:size-4",
            "[&>svg]:shrink-0",
          ].join(" "),
          className,
        ),
      },
      props,
    ),

    render,

    state: {
      slot: "sidebar-group-action",
      sidebar: "group-action",
    },
  });
}

// =========================================================
// Group content
// =========================================================

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn(
        "w-full text-sm",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu
// =========================================================

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(
        "flex w-full min-w-0 flex-col gap-1",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu item
// =========================================================

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn(
        "group/menu-item relative",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu button variants
// =========================================================

const sidebarMenuButtonVariants =
  cva(
    [
      "peer/menu-button",
      "group/menu-button",
      "flex",
      "w-full",
      "items-center",
      "gap-2.5",
      "overflow-hidden",
      "rounded-xl",
      "px-2.5",
      "text-left",
      "text-sm",
      "font-semibold",

      "ring-sidebar-ring",
      "outline-hidden",

      "transition-all",
      "duration-150",

      "group-has-data-[sidebar=menu-action]/menu-item:pr-8",

      "group-data-[collapsible=icon]:size-8!",
      "group-data-[collapsible=icon]:p-2!",

      "focus-visible:ring-2",

      "active:scale-[0.99]",

      "disabled:pointer-events-none",
      "disabled:opacity-50",

      "aria-disabled:pointer-events-none",
      "aria-disabled:opacity-50",

      "[&_svg]:size-4",
      "[&_svg]:shrink-0",
      "[&>span:last-child]:truncate",
    ].join(" "),

    {
      variants: {
        variant: {
          default:
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",

          outline:
            [
              "border",
              "border-sidebar-border",
              "bg-white/[0.025]",
              "text-sidebar-foreground/80",
              "hover:border-sidebar-accent",
              "hover:bg-sidebar-accent",
              "hover:text-white",
            ].join(" "),
        },

        size: {
          default:
            "h-9 text-sm",

          sm:
            "h-8 text-xs",

          lg:
            "h-12 text-sm group-data-[collapsible=icon]:p-0!",
        },
      },

      defaultVariants: {
        variant: "default",
        size: "default",
      },
    },
  );

// =========================================================
// Menu button
// =========================================================

function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?:
      | string
      | React.ComponentProps<
          typeof TooltipContent
        >;
  } & VariantProps<
    typeof sidebarMenuButtonVariants
  >) {
  const {
    isMobile,
    state,
  } = useSidebar();

  const comp = useRender({
    defaultTagName: "button",

    props: mergeProps<"button">(
      {
        className: cn(
          sidebarMenuButtonVariants({
            variant,
            size,
          }),
          isActive &&
            [
              "bg-qc-yellow",
              "text-qc-navy",
              "shadow-sm",
              "hover:bg-[#eac13d]",
              "hover:text-qc-navy",
              "[&>svg]:text-qc-navy",
            ].join(" "),
          className,
        ),
      },
      props,
    ),

    render: !tooltip
      ? render
      : (
          <TooltipTrigger
            render={render}
          />
        ),

    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      size,
      active: isActive,
    },
  });

  if (!tooltip) {
    return comp;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      {comp}

      <TooltipContent
        side="right"
        align="center"
        hidden={
          state !== "collapsed" ||
          isMobile
        }
        {...tooltip}
      />
    </Tooltip>
  );
}

// =========================================================
// Menu action
// =========================================================

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",

    props: mergeProps<"button">(
      {
        className: cn(
          [
            "absolute",
            "right-1.5",
            "top-1.5",
            "flex",
            "aspect-square",
            "w-6",
            "items-center",
            "justify-center",
            "rounded-lg",
            "p-0",
            "text-sidebar-foreground/55",

            "ring-sidebar-ring",
            "outline-hidden",

            "transition-all",

            "group-data-[collapsible=icon]:hidden",

            "peer-hover/menu-button:text-white",
            "peer-data-[size=default]/menu-button:top-1.5",
            "peer-data-[size=lg]/menu-button:top-2.5",
            "peer-data-[size=sm]/menu-button:top-1",

            "after:absolute",
            "after:-inset-2",

            "hover:bg-sidebar-accent",
            "hover:text-white",

            "focus-visible:ring-2",

            "md:after:hidden",

            "[&>svg]:size-4",
            "[&>svg]:shrink-0",
          ].join(" "),

          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-qc-navy aria-expanded:opacity-100 md:opacity-0",

          className,
        ),
      },
      props,
    ),

    render,

    state: {
      slot: "sidebar-menu-action",
      sidebar: "menu-action",
    },
  });
}

// =========================================================
// Menu badge
// =========================================================

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        [
          "pointer-events-none",
          "absolute",
          "right-1.5",
          "flex",
          "h-5",
          "min-w-5",
          "items-center",
          "justify-center",
          "rounded-full",
          "border",
          "border-white/10",
          "bg-white/5",
          "px-1.5",
          "text-[10px]",
          "font-extrabold",
          "text-sidebar-foreground/75",
          "tabular-nums",
          "select-none",

          "group-data-[collapsible=icon]:hidden",

          "peer-hover/menu-button:text-white",
          "peer-data-[size=default]/menu-button:top-1.5",
          "peer-data-[size=lg]/menu-button:top-2.5",
          "peer-data-[size=sm]/menu-button:top-1",

          "peer-data-active/menu-button:border-qc-navy/10",
          "peer-data-active/menu-button:bg-qc-navy/10",
          "peer-data-active/menu-button:text-qc-navy",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu skeleton
// =========================================================

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  const [width] =
    React.useState(() => {
      return `${
        Math.floor(
          Math.random() * 40,
        ) + 50
      }%`;
    });

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-xl px-2.5",
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-lg"
          data-sidebar="menu-skeleton-icon"
        />
      )}

      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1 rounded-lg"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width":
              width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

// =========================================================
// Menu sub
// =========================================================

function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        [
          "mx-3.5",
          "flex",
          "min-w-0",
          "translate-x-px",
          "flex-col",
          "gap-1",
          "border-l",
          "border-sidebar-border",
          "px-2.5",
          "py-1",
          "group-data-[collapsible=icon]:hidden",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu sub item
// =========================================================

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(
        "group/menu-sub-item relative",
        className,
      )}
      {...props}
    />
  );
}

// =========================================================
// Menu sub button
// =========================================================

function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",

    props: mergeProps<"a">(
      {
        className: cn(
          [
            "flex",
            "h-8",
            "min-w-0",
            "-translate-x-px",
            "items-center",
            "gap-2",
            "overflow-hidden",
            "rounded-xl",
            "px-2.5",
            "text-sidebar-foreground/70",

            "ring-sidebar-ring",
            "outline-hidden",

            "transition-colors",

            "group-data-[collapsible=icon]:hidden",

            "hover:bg-sidebar-accent",
            "hover:text-white",

            "focus-visible:ring-2",

            "active:bg-sidebar-accent",
            "active:text-white",

            "disabled:pointer-events-none",
            "disabled:opacity-50",

            "aria-disabled:pointer-events-none",
            "aria-disabled:opacity-50",

            "data-[size=md]:text-sm",
            "data-[size=sm]:text-xs",

            "[&>span:last-child]:truncate",
            "[&>svg]:size-4",
            "[&>svg]:shrink-0",
            "[&>svg]:text-sidebar-foreground/55",
          ].join(" "),

          isActive &&
            [
              "bg-sidebar-accent",
              "text-white",
              "[&>svg]:text-qc-yellow",
            ].join(" "),

          className,
        ),
      },
      props,
    ),

    render,

    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      size,
      active: isActive,
    },
  });
}

// =========================================================
// Exports
// =========================================================

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};