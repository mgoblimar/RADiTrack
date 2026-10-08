"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
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

export type ActiveTab =
  | "overview"
  | "examinations"
  | "config";

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  pendingCount = 0,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] =
    useState(false);

  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Analytics",
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

  const handleTabChange = (
    tab: ActiveTab,
  ) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-qc-navy px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-qc-blue text-qc-yellow shadow-[0_5px_14px_rgba(24,41,140,0.24)]">
            <div className="pointer-events-none absolute -right-2 -top-2 h-5 w-5 rounded-full bg-qc-yellow/10" />

            <Activity
              className="relative h-[18px] w-[18px]"
              strokeWidth={2.2}
            />
          </div>

          <div>
            <p className="text-sm font-extrabold tracking-tight text-white">
              RADiTrack
            </p>

            <p className="text-[10px] font-medium text-white/40">
              QCGH Radiology
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsMobileOpen(
              (prev) => !prev,
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 text-white/50 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Toggle navigation"
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
          onClick={() =>
            setIsMobileOpen(false)
          }
          className="fixed inset-0 z-40 bg-qc-navy/50 backdrop-blur-[3px] lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-white/[0.08] bg-qc-navy transition-all duration-300 ease-out ${
          isMobileOpen
            ? "w-72 translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${
          isCollapsed
            ? "lg:w-[76px]"
            : "lg:w-[248px]"
        }`}
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-qc-blue/[0.12] blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-qc-yellow/[0.035] blur-3xl" />

        {/* ===================================================
            BRAND
        =================================================== */}

        <div
          className={`relative flex shrink-0 border-b border-white/[0.08] ${
            isCollapsed
              ? "h-[76px] items-center justify-center px-2"
              : "items-center justify-between px-4 py-4"
          }`}
        >
          {isCollapsed ? (
            <div className="relative flex items-center justify-center">
              <div className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-qc-blue text-qc-yellow shadow-[0_7px_18px_rgba(24,41,140,0.28)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_8px_22px_rgba(24,41,140,0.34)]">
                <div className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 rounded-full bg-qc-yellow/10" />

                <Activity
                  className="relative h-5 w-5"
                  strokeWidth={2.2}
                />
              </div>

              {/* Subtle status dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-qc-yellow ring-2 ring-qc-navy" />
            </div>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-qc-blue text-qc-yellow shadow-[0_7px_18px_rgba(24,41,140,0.28)]">
                  <div className="pointer-events-none absolute -right-3 -top-3 h-7 w-7 rounded-full bg-qc-yellow/10" />

                  <Activity
                    className="relative h-5 w-5"
                    strokeWidth={2.2}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-extrabold tracking-tight text-white">
                    RADiTrack
                  </h2>

                  <div className="mt-0.5 flex items-center gap-1.5">

                    <p className="truncate text-[10px] font-medium tracking-wide text-white/40">
                      QCGH Radiology
                    </p>
                  </div>
                </div>
              </div>

              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={
                    onToggleCollapse
                  }
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/35 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.07] hover:text-white active:scale-95 lg:flex"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setIsMobileOpen(false)
                }
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-white/35 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.07] hover:text-white active:scale-95 lg:hidden"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ===================================================
            COLLAPSED TOP CONTROL
        =================================================== */}

        {isCollapsed && onToggleCollapse && (
          <div className="relative flex justify-center border-b border-white/[0.06] px-2 py-2">
            <button
              type="button"
              onClick={
                onToggleCollapse
              }
              className="flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:bg-white/[0.07] hover:text-white active:scale-95"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ===================================================
            NAVIGATION
        =================================================== */}

        <div className="relative flex-1 overflow-y-auto px-3 py-5">
          

          <nav
            className="space-y-2"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleTabChange(
                      item.id,
                    )
                  }
                  title={item.label}
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                  className={`group relative flex w-full items-center rounded-2xl border transition-all duration-200 ${
                    isCollapsed
                      ? "h-12 justify-center"
                      : "justify-between px-3 py-2.5"
                  } ${
                    isActive
                      ? "border-white/[0.08] bg-white/[0.09] text-white shadow-[0_6px_18px_rgba(0,0,0,0.10)]"
                      : "border-transparent text-white/50 hover:border-white/[0.05] hover:bg-white/[0.045] hover:text-white"
                  }`}
                >
                  {/* Active rail */}
                  {isActive && (
                    <span
                      className={`absolute rounded-full bg-qc-yellow shadow-[0_0_10px_rgba(242,203,73,0.42)] ${
                        isCollapsed
                          ? "left-0 top-1/2 h-7 w-[3px] -translate-y-1/2"
                          : "bottom-2.5 left-0 top-2.5 w-[3px]"
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
                      className={`flex shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                        isCollapsed
                          ? "h-10 w-10"
                          : "h-9 w-9"
                      } ${
                        isActive
                          ? "bg-qc-yellow text-qc-navy shadow-[0_5px_12px_rgba(242,203,73,0.16)]"
                          : "bg-white/[0.045] text-white/40 group-hover:bg-white/[0.075] group-hover:text-qc-yellow group-active:scale-95"
                      }`}
                    >
                      <Icon
                        className={
                          isCollapsed
                            ? "h-[18px] w-[18px]"
                            : "h-[17px] w-[17px]"
                        }
                        strokeWidth={2.1}
                      />
                    </div>

                    {!isCollapsed && (
                      <span
                        className={`truncate text-[13px] font-semibold transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-white/60 group-hover:text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!isCollapsed &&
                    item.id ===
                      "examinations" &&
                    pendingCount > 0 && (
                      <span
                        className={`flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-4 ${
                          isActive
                            ? "bg-qc-yellow text-qc-navy"
                            : "bg-qc-orange text-white shadow-[0_3px_8px_rgba(0,0,0,0.12)]"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}

                  {!isCollapsed &&
                    isActive && (
                      <ChevronRight className="ml-2 h-3.5 w-3.5 shrink-0 text-white/25 transition-transform duration-200 group-hover:translate-x-0.5" />
                    )}

                  {isCollapsed &&
                    item.id ===
                      "examinations" &&
                    pendingCount > 0 && (
                      <span className="absolute right-0.5 top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-qc-orange px-1 text-[8px] font-extrabold leading-4 text-white shadow-[0_3px_8px_rgba(0,0,0,0.16)]">
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
            className={`my-5 border-t border-white/[0.07] ${
              isCollapsed
                ? "mx-1"
                : ""
            }`}
          />

          {!isCollapsed && (
            <p className="mb-3 px-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/25">
              Tools
            </p>
          )}

          <div className="space-y-2">
            {/* Patient TV */}
            <Link
              href="/patient"
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                setIsMobileOpen(
                  false,
                )
              }
              className={`group relative flex w-full items-center rounded-2xl border border-transparent text-white/50 transition-all duration-200 hover:border-white/[0.05] hover:bg-white/[0.045] hover:text-white ${
                isCollapsed
                  ? "h-12 justify-center"
                  : "justify-between px-3 py-2.5"
              }`}
              title="Patient TV"
            >
              <div
                className={`flex min-w-0 items-center ${
                  isCollapsed
                    ? "justify-center"
                    : "gap-3"
                }`}
              >
                <div
                  className={`relative flex shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-white/35 transition-all duration-200 group-hover:bg-white/[0.07] group-hover:text-qc-yellow group-active:scale-95 ${
                    isCollapsed
                      ? "h-10 w-10"
                      : "h-9 w-9"
                  }`}
                >
                  <Tv
                    className="h-[17px] w-[17px]"
                    strokeWidth={2.1}
                  />

                  {!isCollapsed && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-qc-yellow shadow-[0_0_7px_rgba(242,203,73,0.45)]" />
                  )}
                </div>

                {!isCollapsed && (
                  <span className="truncate text-[13px] font-semibold transition-colors group-hover:text-white">
                    Patient TV
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/25 transition-colors group-hover:text-white/40">
                    Live
                  </span>

                  <ChevronRight className="h-3.5 w-3.5 text-white/20 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </Link>

            {/* RIS Simulator */}
            <Link
              href="/simulator"
              onClick={() =>
                setIsMobileOpen(
                  false,
                )
              }
              className={`group relative flex w-full items-center rounded-2xl border border-transparent text-white/50 transition-all duration-200 hover:border-white/[0.05] hover:bg-white/[0.045] hover:text-white ${
                isCollapsed
                  ? "h-12 justify-center"
                  : "justify-between px-3 py-2.5"
              }`}
              title="RIS Simulator"
            >
              <div
                className={`flex min-w-0 items-center ${
                  isCollapsed
                    ? "justify-center"
                    : "gap-3"
                }`}
              >
                <div
                  className={`flex shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-white/35 transition-all duration-200 group-hover:bg-white/[0.07] group-hover:text-qc-yellow group-active:scale-95 ${
                    isCollapsed
                      ? "h-10 w-10"
                      : "h-9 w-9"
                  }`}
                >
                  <Radio
                    className="h-[17px] w-[17px]"
                    strokeWidth={2.1}
                  />
                </div>

                {!isCollapsed && (
                  <span className="truncate text-[13px] font-semibold transition-colors group-hover:text-white">
                    RIS Simulator
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <ChevronRight className="h-3.5 w-3.5 text-white/20 transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </Link>
          </div>
        </div>

        {/* ===================================================
            USER PROFILE
        =================================================== */}

        <div className="relative shrink-0 border-t border-white/[0.08] bg-black/[0.10] p-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "config",
                  )
                }
                title="Dr. Test Radiologist"
                className="group relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-qc-blue/60 bg-qc-blue text-qc-yellow shadow-[0_5px_12px_rgba(24,41,140,0.18)] transition-all duration-200 group-hover:border-qc-yellow group-hover:shadow-[0_6px_16px_rgba(242,203,73,0.12)] group-active:scale-95">
                  <User
                    className="h-4 w-4"
                    strokeWidth={2.1}
                  />
                </div>

                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-qc-yellow ring-2 ring-qc-navy" />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "config",
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:bg-white/[0.07] hover:text-white active:scale-95"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings
                  className="h-4 w-4"
                  strokeWidth={2.1}
                />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-2.5 transition-colors hover:bg-white/[0.05]">
              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "config",
                  )
                }
                className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-qc-blue/60 bg-qc-blue text-qc-yellow shadow-[0_5px_12px_rgba(24,41,140,0.18)] transition-all duration-200 hover:border-qc-yellow hover:shadow-[0_6px_16px_rgba(242,203,73,0.12)] active:scale-95"
                title="Dr. Test Radiologist"
              >
                <User
                  className="h-4 w-4"
                  strokeWidth={2.1}
                />

                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-qc-yellow ring-2 ring-qc-navy" />
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "config",
                  )
                }
                className="min-w-0 flex-1 text-left"
                title="Open profile settings"
              >
                <div className="truncate text-xs font-bold text-white">
                  Dr. Test Radiologist
                </div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-qc-yellow" />

                  <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-white/30">
                    Online
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "config",
                  )
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white/30 transition-all duration-200 hover:bg-white/[0.07] hover:text-white active:scale-95"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings
                  className="h-4 w-4"
                  strokeWidth={2.1}
                />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}