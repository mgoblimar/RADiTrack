"use client";

import { useState } from "react";
import Link from "next/link";

import {
  ChevronRight,
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
  User,
  X,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { isAdmin, type CurrentUser } from "@/lib/auth/roles";

export type ActiveTab =
  | "overview"
  | "examinations"
  | "config"
  | "settings";

// Left padding the main content needs so it clears the sidebar on desktop.
export const SIDEBAR_OFFSET = {
  expanded: "lg:pl-[248px]",
  collapsed: "lg:pl-[76px]",
} as const;

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  currentUser: CurrentUser;
}

export function Sidebar({
  activeTab,
  onTabChange,
  pendingCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  currentUser,
}: SidebarProps) {
  const canUseSimulator = isAdmin(currentUser);

  const accountType = canUseSimulator
    ? "Administrator"
    : "Staff account";

  const [isMobileOpen, setIsMobileOpen] =
    useState(false);

  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "examinations" as ActiveTab,
      label: "Examinations",
      icon: FileSpreadsheet,
    },
    {
      id: "config" as ActiveTab,
      label: "Configurations",
      icon: Sliders,
    },
  ];

  const handleTabChange = (tab: ActiveTab) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <div className="sticky top-0 z-40 flex h-[64px] items-center justify-center border-b border-white/10 bg-qc-blue px-4 lg:hidden">
        <h1 className="text-[23px] font-black tracking-[-0.055em] text-white">
          RADiTrack
        </h1>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen((previous) => !previous)
          }
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 transition-all hover:bg-white/10 hover:text-qc-yellow active:scale-95"
          aria-label={
            isMobileOpen
              ? "Close navigation"
              : "Open navigation"
          }
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-qc-blue/60 backdrop-blur-[3px] lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-white/[0.15] bg-qc-blue shadow-[8px_0_30px_rgba(0,35,82,0.12)] transition-all duration-300 ease-out ${
          isMobileOpen
            ? "w-72 translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${
          isCollapsed
            ? "lg:w-[76px]"
            : "lg:w-[248px]"
        }`}
      >
        {/* Background accents */}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.055] blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-qc-yellow/[0.06] blur-3xl"
        />

        {/* ===================================================
            RADiTrack BRAND
        =================================================== */}

        <div
          className={`relative flex shrink-0 items-center justify-center border-b border-white/[0.15] ${
            isCollapsed
              ? "h-[76px] px-2"
              : "h-[88px] px-4"
          }`}
        >
          {isCollapsed ? (
            <span
              title="RADiTrack"
              aria-label="RADiTrack"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.09] text-xl font-black tracking-tighter text-white"
            >
              R
            </span>
          ) : (
            <h2 className="text-center text-[25px] font-black tracking-[-0.065em] text-white sm:text-[27px]">
              RADiTrack
            </h2>
          )}

          {/* Desktop collapse button */}

          {!isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="absolute right-3 hidden h-8 w-8 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.035] text-white/65 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.12] hover:text-qc-yellow active:scale-95 lg:flex"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {/* Mobile close button */}

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.12] text-white/65 transition-all hover:bg-white/[0.12] hover:text-white active:scale-95 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ===================================================
            EXPAND COLLAPSED SIDEBAR
        =================================================== */}

        {isCollapsed && onToggleCollapse && (
          <div className="relative flex justify-center border-b border-white/[0.12] px-2 py-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/65 transition-all duration-200 hover:bg-white/[0.12] hover:text-qc-yellow active:scale-95"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===================================================
            PRIMARY NAVIGATION
        =================================================== */}

        <div className="relative flex-1 overflow-y-auto px-3 py-6">
          <nav
            className="space-y-2.5"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  title={item.label}
                  aria-current={
                    isActive ? "page" : undefined
                  }
                  className={`group relative flex min-h-[54px] w-full items-center rounded-2xl border transition-all duration-200 ${
                    isCollapsed
                      ? "h-[52px] justify-center px-1"
                      : "justify-between px-3 py-2.5"
                  } ${
                    isActive
                      ? "border-white/[0.20] bg-white/[0.13] text-white shadow-[0_6px_18px_rgba(0,0,0,0.10)]"
                      : "border-transparent text-white/75 hover:border-white/[0.09] hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {/* Active indicator */}

                  {isActive && (
                    <span
                      className={`absolute rounded-full bg-qc-yellow shadow-[0_0_12px_rgba(255,210,48,0.50)] ${
                        isCollapsed
                          ? "left-0 top-1/2 h-8 w-[4px] -translate-y-1/2"
                          : "bottom-2.5 left-0 top-2.5 w-[4px]"
                      }`}
                    />
                  )}

                  <div
                    className={`flex min-w-0 items-center ${
                      isCollapsed
                        ? "justify-center"
                        : "gap-3"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-qc-yellow text-qc-blue shadow-[0_4px_12px_rgba(255,210,48,0.22)]"
                          : "bg-white/[0.09] text-white/75 group-hover:bg-white/[0.16] group-hover:text-qc-yellow group-active:scale-95"
                      }`}
                    >
                      <Icon
                        className="h-[19px] w-[19px]"
                        strokeWidth={2.1}
                      />
                    </div>

                    {!isCollapsed && (
                      <span
                        className={`truncate text-[14px] font-bold tracking-[0.005em] transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-white/80 group-hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Pending examinations badge */}

                  {!isCollapsed &&
                    item.id === "examinations" &&
                    pendingCount > 0 && (
                      <span
                        className={`flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[11px] font-extrabold leading-none ${
                          isActive
                            ? "bg-qc-yellow text-qc-blue"
                            : "bg-qc-red text-white shadow-[0_3px_8px_rgba(0,0,0,0.16)]"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}

                  {/* Active navigation arrow */}

                  {!isCollapsed && isActive && (
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5" />
                  )}

                  {/* Collapsed pending badge */}

                  {isCollapsed &&
                    item.id === "examinations" &&
                    pendingCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-qc-red px-1 text-[9px] font-extrabold leading-4 text-white shadow-[0_3px_8px_rgba(0,0,0,0.16)]">
                        {pendingCount}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>

          {/* =================================================
              TOOLS
          ================================================= */}

          <div
            className={`my-6 border-t border-white/[0.15] ${
              isCollapsed ? "mx-1" : ""
            }`}
          />

          {!isCollapsed && (
            <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">
              Tools
            </p>
          )}

          <div className="space-y-2.5">
            {/* Patient TV */}

            <Link
              href="/patient"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMobileOpen(false)}
              title="Patient TV"
              className={`group relative flex min-h-[54px] w-full items-center rounded-2xl border border-transparent text-white/75 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.07] hover:text-white ${
                isCollapsed
                  ? "h-[52px] justify-center px-1"
                  : "justify-between px-3 py-2.5"
              }`}
            >
              <div
                className={`flex min-w-0 items-center ${
                  isCollapsed
                    ? "justify-center"
                    : "gap-3"
                }`}
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.09] text-white/75 transition-all duration-200 group-hover:bg-white/[0.16] group-hover:text-qc-yellow group-active:scale-95">
                  <Tv
                    className="h-[19px] w-[19px]"
                    strokeWidth={2.1}
                  />

                  {!isCollapsed && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-qc-yellow shadow-[0_0_7px_rgba(255,210,48,0.45)]" />
                  )}
                </div>

                {!isCollapsed && (
                  <span className="truncate text-[14px] font-bold tracking-[0.005em] transition-colors group-hover:text-white">
                    Patient TV
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/60 transition-colors group-hover:text-qc-yellow">
                    Live
                  </span>

                  <ChevronRight className="h-4 w-4 text-white/50 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </Link>

            {/* RIS Simulator (administrators only) */}

            {canUseSimulator && (
              <Link
                href="/simulator"
                onClick={() => setIsMobileOpen(false)}
                title="RIS Simulator"
                className={`group relative flex min-h-[54px] w-full items-center rounded-2xl border border-transparent text-white/75 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.07] hover:text-white ${
                  isCollapsed
                    ? "h-[52px] justify-center px-1"
                    : "justify-between px-3 py-2.5"
                }`}
              >
                <div
                  className={`flex min-w-0 items-center ${
                    isCollapsed
                      ? "justify-center"
                      : "gap-3"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.09] text-white/75 transition-all duration-200 group-hover:bg-white/[0.16] group-hover:text-qc-yellow group-active:scale-95">
                    <Radio
                      className="h-[19px] w-[19px]"
                      strokeWidth={2.1}
                    />
                  </div>

                  {!isCollapsed && (
                    <span className="truncate text-[14px] font-bold tracking-[0.005em] transition-colors group-hover:text-white">
                      RIS Simulator
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <ChevronRight className="h-4 w-4 text-white/50 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ===================================================
            USER PROFILE
        =================================================== */}

        <div className="relative shrink-0 border-t border-white/[0.15] bg-black/[0.10] p-3">
          {isCollapsed ? (
            /* COLLAPSED PROFILE */
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.045] py-2.5">
              <button
                type="button"
                onClick={() => handleTabChange("settings")}
                title={`Profile settings: ${currentUser.fullName}`}
                aria-label="Open profile settings"
                className="group relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.10] text-qc-yellow transition-all duration-200 group-hover:border-qc-yellow group-hover:bg-white/[0.16] group-active:scale-95">
                  <User
                    className="h-[19px] w-[19px]"
                    strokeWidth={2}
                  />
                </div>

                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-qc-blue"
                  aria-label="Signed in"
                />
              </button>

              <div className="h-px w-8 bg-white/[0.12]" />

              <button
                type="button"
                onClick={() => handleTabChange("settings")}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/65 transition-all duration-200 hover:bg-white/[0.12] hover:text-qc-yellow active:scale-95"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings
                  className="h-[18px] w-[18px]"
                  strokeWidth={2}
                />
              </button>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/65 transition-all duration-200 hover:bg-white/[0.12] hover:text-qc-yellow active:scale-95"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut
                    className="h-[18px] w-[18px]"
                    strokeWidth={2}
                  />
                </button>
              </form>
            </div>
          ) : (
            /* EXPANDED PROFILE */
            <div className="rounded-2xl border border-white/[0.15] bg-white/[0.07] p-3 transition-colors hover:bg-white/[0.10]">

              {/* Account identity */}
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleTabChange("settings")}
                  title="Open profile settings"
                  aria-label={`Open profile settings for ${currentUser.fullName}`}
                  className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.10] text-qc-yellow shadow-[0_4px_12px_rgba(0,0,0,0.10)] transition-all duration-200 hover:border-qc-yellow hover:bg-white/[0.16] active:scale-95"
                >
                  <User
                    className="h-5 w-5"
                    strokeWidth={2}
                  />

                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-qc-blue" />
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-2 break-words text-[13px] font-extrabold leading-snug text-white"
                    title={currentUser.fullName}
                  >
                    {currentUser.fullName}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.10em] text-white/60">
                    {accountType}
                  </p>
                </div>
              </div>

              {/* Profile actions */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.12] pt-2.5">
                <button
                  type="button"
                  onClick={() => handleTabChange("settings")}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white/75 transition-all hover:bg-white/[0.10] hover:text-qc-yellow active:scale-[0.98]"
                  title="Open settings"
                  aria-label="Open settings"
                >
                  <Settings
                    className="h-4 w-4"
                    strokeWidth={2}
                  />
                  Settings
                </button>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-white/75 transition-all hover:bg-white/[0.10] hover:text-qc-yellow active:scale-[0.98]"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut
                      className="h-4 w-4"
                      strokeWidth={2}
                    />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}