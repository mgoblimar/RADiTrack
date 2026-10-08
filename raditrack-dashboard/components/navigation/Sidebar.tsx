"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Sliders,
  Tv,
  Activity,
  Menu,
  X,
  ChevronRight,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Settings,
} from "lucide-react";

export type ActiveTab = "overview" | "examinations" | "config";

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Analytics",
      icon: LayoutDashboard,
      badge: null,
      fullBadge: null,
      description: "Live dashboard & TAT intelligence",
    },
    {
      id: "examinations" as ActiveTab,
      label: "Examinations",
      icon: FileSpreadsheet,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      fullBadge:
        pendingCount > 0 ? `${pendingCount} pending` : null,
      description: "Study archive & reading backlogs",
    },
    {
      id: "config" as ActiveTab,
      label: "Configurations",
      icon: Sliders,
      badge: null,
      fullBadge: null,
      description: "Modalities & SLA benchmarks",
    },
  ];

  const handleTabChange = (tab: ActiveTab) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* =========================================================
          MOBILE HEADER
          ========================================================= */}

      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qc-navy text-qc-yellow">
            <Activity className="h-4.5 w-4.5" />
          </div>

          <div>
            <p className="text-sm font-extrabold tracking-tight text-qc-navy">
              RADiTrack
            </p>

            <p className="text-[10px] font-medium text-muted-foreground">
              QCGH Radiology
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-qc-navy"
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

      {/* =========================================================
          MOBILE BACKDROP
          ========================================================= */}

      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-qc-navy/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* =========================================================
          SIDEBAR
          ========================================================= */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-white/10 bg-qc-navy transition-all duration-200 ease-in-out ${
          isMobileOpen
            ? "w-72 translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } ${
          isCollapsed
            ? "lg:w-20"
            : "lg:w-64"
        }`}
      >
        {/* =======================================================
            BRAND HEADER
            ======================================================= */}

        <div
          className={`flex shrink-0 items-center border-b border-white/10 ${
            isCollapsed
              ? "justify-center p-3"
              : "justify-between px-4 py-4"
          }`}
        >
          {!isCollapsed ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-qc-blue text-qc-yellow shadow-sm">
                <Activity className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold tracking-tight text-white">
                  RADiTrack
                </h2>

                <p className="truncate text-[11px] font-medium text-white/55">
                  QCGH Radiology
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-qc-blue text-qc-yellow"
              title="RADiTrack"
            >
              <Activity className="h-5 w-5" />
            </div>
          )}

          {/* Desktop collapse control */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/8 hover:text-white lg:flex"
              title={
                isCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
              aria-label={
                isCollapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4.5 w-4.5 text-qc-yellow" />
              ) : (
                <PanelLeftClose className="h-4.5 w-4.5" />
              )}
            </button>
          )}

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/8 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =======================================================
            SCROLLABLE NAVIGATION
            ======================================================= */}

        <div className="flex-1 overflow-y-auto px-3 py-5">
          {/* Workspace heading */}
          <div
            className={`mb-2 px-2 ${
              isCollapsed ? "lg:px-0 lg:text-center" : ""
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            >
              Workspaces
            </p>

            {isCollapsed && (
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-white/30 lg:block">
                NAV
              </span>
            )}
          </div>

          {/* Primary navigation */}
          <nav className="space-y-1.5" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  title={
                    isCollapsed
                      ? item.label
                      : item.description
                  }
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex w-full items-center rounded-2xl text-left transition-all duration-150 ${
                    isCollapsed
                      ? "px-3 py-3 lg:justify-center"
                      : "justify-between px-3 py-3"
                  } ${
                    isActive
                      ? "bg-qc-yellow text-qc-navy shadow-sm"
                      : "text-white/65 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  <div
                    className={`flex min-w-0 items-center gap-3 ${
                      isCollapsed
                        ? "lg:justify-center"
                        : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Icon
                        className={`h-4.5 w-4.5 ${
                          isActive
                            ? "text-qc-navy"
                            : "text-white/45 group-hover:text-qc-yellow"
                        }`}
                        strokeWidth={2.2}
                      />

                      {/* Collapsed pending badge */}
                      {isCollapsed && item.badge && (
                        <span className="absolute -right-2 -top-2 hidden min-w-4 items-center justify-center rounded-full bg-qc-orange px-1 text-[9px] font-extrabold leading-4 text-white shadow-sm lg:flex">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div
                      className={`min-w-0 ${
                        isCollapsed
                          ? "lg:hidden"
                          : ""
                      }`}
                    >
                      <div
                        className={`truncate text-sm font-bold ${
                          isActive
                            ? "text-qc-navy"
                            : "text-white/80"
                        }`}
                      >
                        {item.label}
                      </div>

                      {!isCollapsed && (
                        <div
                          className={`mt-0.5 truncate text-[10px] font-medium ${
                            isActive
                              ? "text-qc-navy/60"
                              : "text-white/35"
                          }`}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded right-side indicator */}
                  {!isCollapsed && (
                    <div className="ml-2 shrink-0">
                      {item.fullBadge ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isActive
                              ? "bg-qc-navy/10 text-qc-navy"
                              : "bg-qc-orange text-white"
                          }`}
                        >
                          {item.fullBadge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="h-4 w-4 text-qc-navy/60" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* =====================================================
              SECONDARY AREA
              ===================================================== */}

          <div className="my-6 border-t border-white/10" />

          <div
            className={`mb-2 px-2 ${
              isCollapsed
                ? "lg:px-0 lg:text-center"
                : ""
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            >
              Display & Simulator
            </p>

            {isCollapsed && (
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.12em] text-white/30 lg:block">
                TOOLS
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {/* Patient TV */}
            <Link
              href="/patient"
              target="_blank"
              rel="noreferrer"
              onClick={() => setIsMobileOpen(false)}
              className={`group flex w-full items-center rounded-2xl text-white/60 transition-all duration-150 hover:bg-white/7 hover:text-white ${
                isCollapsed
                  ? "px-3 py-3 lg:justify-center"
                  : "justify-between px-3 py-3"
              }`}
              title="Open Patient TV Display"
            >
              <div
                className={`flex min-w-0 items-center gap-3 ${
                  isCollapsed
                    ? "lg:justify-center"
                    : ""
                }`}
              >
                <Tv className="h-4.5 w-4.5 shrink-0 text-white/40 transition-colors group-hover:text-qc-yellow" />

                <div
                  className={`min-w-0 ${
                    isCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  <div className="truncate text-sm font-semibold">
                    Patient TV Display
                  </div>

                  <div className="mt-0.5 text-[10px] font-medium text-white/35">
                    Live public monitor
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-extrabold text-qc-yellow ${
                  isCollapsed ? "lg:hidden" : ""
                }`}
              >
                Live
              </span>
            </Link>

            {/* RIS Simulator */}
            <Link
              href="/simulator"
              onClick={() => setIsMobileOpen(false)}
              className={`group flex w-full items-center rounded-2xl text-white/60 transition-all duration-150 hover:bg-white/7 hover:text-white ${
                isCollapsed
                  ? "px-3 py-3 lg:justify-center"
                  : "justify-between px-3 py-3"
              }`}
              title="Open RIS Simulator"
            >
              <div
                className={`flex min-w-0 items-center gap-3 ${
                  isCollapsed
                    ? "lg:justify-center"
                    : ""
                }`}
              >
                <Radio className="h-4.5 w-4.5 shrink-0 text-white/40 transition-colors group-hover:text-qc-yellow" />

                <div
                  className={`min-w-0 ${
                    isCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  <div className="truncate text-sm font-semibold">
                    RIS Simulator
                  </div>

                  <div className="mt-0.5 text-[10px] font-medium text-white/35">
                    Examination ingestion
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-extrabold text-white/55 ${
                  isCollapsed ? "lg:hidden" : ""
                }`}
              >
                Ingest
              </span>
            </Link>
          </div>
        </div>

        {/* =======================================================
            USER PROFILE / SETTINGS
            ======================================================= */}

        <div className="shrink-0 border-t border-white/10 bg-black/10 p-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleTabChange("config")}
                title="Dr. Test Radiologist • Attending Radiologist"
                className="group relative"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-qc-blue/60 bg-qc-blue text-qc-yellow transition-colors group-hover:border-qc-yellow">
                  <User className="h-4 w-4" />
                </div>

                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-qc-yellow ring-2 ring-qc-navy" />
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("config")}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                title="Configurations & Settings"
                aria-label="Open configurations and settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 p-2.5">
              <button
                type="button"
                onClick={() => handleTabChange("config")}
                className="flex min-w-0 items-center gap-2.5 text-left"
                title="Open profile settings"
              >
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-qc-blue/60 bg-qc-blue text-qc-yellow">
                    <User className="h-4 w-4" />
                  </div>

                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-qc-yellow ring-2 ring-qc-navy" />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-white">
                    Dr. Test Radiologist
                  </div>

                  <div className="mt-0.5 truncate text-[10px] font-medium text-white/40">
                    Attending Radiologist
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("config")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                title="Configurations & Settings"
                aria-label="Open configurations and settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}