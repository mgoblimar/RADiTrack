"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Settings,
  Sliders,
  Tv,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS, isAdmin, type CurrentUser } from "@/lib/auth/roles";

export type ActiveTab = "overview" | "examinations" | "config" | "settings";

/** Width of the floating card plus its outer gaps; the page uses these to sit beside it. */
export const SIDEBAR_OFFSET = { expanded: "lg:pl-[264px]", collapsed: "lg:pl-[96px]" } as const;

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUser: CurrentUser;
}

interface NavEntry {
  key: string;
  label: string;
  icon: LucideIcon;
  /** In-page section, or a separate page. */
  tab?: ActiveTab;
  href?: string;
  external?: boolean;
  badge?: number | null;
}

/** "Dr. Maria Santos" → "MS". */
function initialsOf(fullName: string): string {
  const words = fullName
    .replace(/^(dr|dra)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function Sidebar({
  activeTab,
  onTabChange,
  pendingCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const roleLabel = ROLE_LABELS[currentUser.role];

  // The phone drawer is always shown expanded.
  const collapsed = isCollapsed && !isMobileOpen;
  const closeMobile = () => setIsMobileOpen(false);

  const groups: Array<{ title: string; items: NavEntry[] }> = [
    {
      title: "Menu",
      items: [
        { key: "overview", label: "Dashboard", icon: LayoutDashboard, tab: "overview" },
        {
          key: "examinations",
          label: "Examinations",
          icon: FileSpreadsheet,
          tab: "examinations",
          badge: pendingCount > 0 ? pendingCount : null,
        },
        { key: "config", label: "Configurations", icon: Sliders, tab: "config" },
      ],
    },
    {
      title: "Tools",
      items: [
        { key: "patient", label: "Patient TV", icon: Tv, href: "/patient", external: true },
        ...(isAdmin(currentUser)
          ? [{ key: "simulator", label: "RIS Simulator", icon: Radio, href: "/simulator" }]
          : []),
      ],
    },
    {
      title: "Account",
      items: [{ key: "settings", label: "Settings", icon: Settings, tab: "settings" }],
    },
  ];

  return (
    <>
      {/* Phones and tablets: top bar with the menu button */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#E4E8F1] bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setIsMobileOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-qc-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
          aria-label={isMobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-qc-navy/30 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* Floating card */}
      <aside
        // Phones: a full-height drawer from the left edge. Desktop: a card inset 12px from the edges.
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col rounded-r-[22px] border border-[#E4E8F1] bg-white shadow-[0_10px_30px_rgba(5,14,64,0.08)] transition-[width,transform] duration-200 ease-out lg:inset-y-3 lg:left-3 lg:rounded-[22px] ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-[72px]" : "lg:w-[240px]"}`}
      >
        {/* Brand and collapse */}
        <div className={`flex h-[68px] shrink-0 items-center ${collapsed ? "justify-center" : "justify-between pl-4 pr-3"}`}>
          {collapsed ? <BrandMark /> : <Brand />}

          {!collapsed && onToggleCollapse && (
            <IconButton label="Collapse menu" onClick={onToggleCollapse} className="hidden lg:flex">
              <PanelLeftClose className="h-[18px] w-[18px]" />
            </IconButton>
          )}
          {isMobileOpen && (
            <IconButton label="Close navigation" onClick={closeMobile} className="lg:hidden">
              <X className="h-[18px] w-[18px]" />
            </IconButton>
          )}
        </div>

        {/* Collapsed: the arrow that opens the menu again */}
        {collapsed && onToggleCollapse && (
          <div className="flex shrink-0 justify-center pb-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand menu"
              className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-qc-blue/30 hover:bg-qc-blue/5 hover:text-qc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
              <Tooltip label="Expand menu" />
            </button>
          </div>
        )}

        {/* Navigation (visible overflow when collapsed so hover labels can stick out) */}
        <nav
          aria-label="Primary navigation"
          className={`flex-1 px-3 pb-3 ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}
        >
          {groups.map((group, index) =>
            group.items.length === 0 ? null : (
              <div key={group.title} className={index === 0 ? "" : "mt-4"}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-slate-200" aria-hidden />
                ) : (
                  <p className="mb-1.5 px-3 text-[12px] font-semibold text-slate-400">{group.title}</p>
                )}
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <NavItem
                        item={item}
                        collapsed={collapsed}
                        isActive={item.tab !== undefined && activeTab === item.tab}
                        onSelect={() => {
                          if (item.tab) onTabChange(item.tab);
                          closeMobile();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </nav>

        {/* Signed-in user */}
        <div className="shrink-0 px-3 pb-3">
          <div className={`border-t border-slate-200 pt-3 ${collapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-2.5 px-1"}`}>
            <button
              type="button"
              onClick={() => {
                onTabChange("settings");
                closeMobile();
              }}
              className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
              aria-label="Open settings"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-qc-yellow text-[13px] font-extrabold text-qc-navy">
                {initialsOf(currentUser.fullName)}
              </span>
              {collapsed && <Tooltip label={`${currentUser.fullName} · ${roleLabel}`} />}
            </button>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="break-words text-[13px] font-bold leading-snug text-qc-navy" title={roleLabel}>
                  {currentUser.fullName}
                </p>
              </div>
            )}

            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                aria-label="Log out"
                title={collapsed ? undefined : "Log out"}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-qc-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40"
              >
                <LogOut className="h-[18px] w-[18px]" />
                {collapsed && <Tooltip label="Log out" />}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

function BrandMark() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-qc-navy text-qc-yellow">
      <Activity className="h-5 w-5" strokeWidth={2.4} />
    </span>
  );
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <div className="min-w-0">
        <p className="truncate text-[16px] font-extrabold leading-tight tracking-tight text-qc-navy">RADiTrack</p>
        <p className="truncate text-[11px] font-medium text-slate-400">QCGH Radiology</p>
      </div>
    </div>
  );
}

/** Dark label shown to the right on hover or keyboard focus. */
function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-qc-navy px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-qc-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
        className.includes("hidden") ? className : `flex ${className}`
      }`}
    >
      {children}
    </button>
  );
}

interface NavItemProps {
  item: NavEntry;
  collapsed: boolean;
  isActive: boolean;
  onSelect: () => void;
}

function NavItem({ item, collapsed, isActive, onSelect }: NavItemProps) {
  const { icon: Icon, label, badge, href, external } = item;

  const className = `group relative flex h-11 w-full items-center rounded-xl text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-qc-blue/40 ${
    collapsed ? "justify-center" : "gap-3 px-3"
  } ${
    isActive
      ? "bg-qc-blue text-white shadow-[0_6px_14px_rgba(24,41,140,0.25)]"
      : "text-slate-600 hover:bg-slate-100 hover:text-qc-navy"
  }`;

  const content = (
    <>
      <Icon className={`h-[19px] w-[19px] shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-qc-navy"}`} strokeWidth={1.9} />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {!collapsed && external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />}
      {badge != null &&
        (collapsed ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-qc-orange ring-2 ring-white" aria-hidden />
        ) : (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-4 ${
              isActive ? "bg-white text-qc-blue" : "bg-qc-orange text-white"
            }`}
          >
            {badge}
          </span>
        ))}
      {collapsed && <Tooltip label={badge != null ? `${label} (${badge})` : label} />}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onSelect}
        aria-label={collapsed ? label : undefined}
        className={className}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {content}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {content}
    </button>
  );
}
