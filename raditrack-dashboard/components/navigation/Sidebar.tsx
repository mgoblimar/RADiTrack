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
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
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
      description: "Live dashboard & TAT intelligence",
    },
    {
      id: "examinations" as ActiveTab,
      label: "Examinations",
      icon: FileSpreadsheet,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      fullBadge: pendingCount > 0 ? `${pendingCount} pending` : null,
      description: "Study archive & reading backlogs",
    },
    {
      id: "config" as ActiveTab,
      label: "Configurations",
      icon: Sliders,
      badge: null,
      description: "Modalities & SLA benchmarks",
    },
  ];

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-sky-400" />
          <span className="font-bold text-white text-base">QCGH RADiTrack</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          aria-label="Toggle navigation"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Shell (Desktop Fixed Collapsible / Mobile Full Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900/95 backdrop-blur-md border-r border-slate-800/80 flex flex-col transition-all duration-200 ease-in-out ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Brand Header */}
        <div
          className={`border-b border-slate-800 flex items-center ${
            isCollapsed
              ? "justify-center p-3"
              : "justify-between p-4 sm:p-5"
          }`}
        >
          {/* Logo & Name (hidden when collapsed so only the arrow is shown) */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-sky-950/60 border border-sky-800/80 rounded-xl text-sky-400 shadow-sm shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div className="truncate">
                <h2 className="font-extrabold text-white text-base tracking-tight leading-tight truncate">
                  RADiTrack
                </h2>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  QCGH Radiology
                </p>
              </div>
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle Button (Only the arrow) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5 text-sky-400" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Workspace Navigation Tabs */}
        <div className="px-3 py-4 flex-1 space-y-1 overflow-y-auto">
          <p
            className={`px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 ${
              isCollapsed ? "lg:text-center lg:px-0" : ""
            }`}
          >
            {isCollapsed ? <span className="lg:hidden">Workspaces</span> : "Workspaces"}
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileOpen(false);
                }}
                title={item.label}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all group relative ${
                  isCollapsed
                    ? "lg:justify-center lg:px-0 lg:py-3 px-3 py-2.5 justify-between"
                    : "px-3 py-2.5 justify-between"
                } ${
                  isActive
                    ? "bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div
                  className={`flex items-center gap-3 min-w-0 ${
                    isCollapsed ? "lg:justify-center" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Icon
                      className={`h-4 w-4 transition ${
                        isActive
                          ? "text-sky-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    {/* Collapsed Badge Dot / Pip */}
                    {isCollapsed && item.badge && (
                      <span className="hidden lg:flex absolute -top-1.5 -right-2 h-3.5 min-w-3.5 px-1 bg-amber-500 text-[9px] font-extrabold text-slate-950 rounded-full items-center justify-center shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-left truncate ${
                      isCollapsed ? "lg:hidden block" : "block"
                    }`}
                  >
                    <div className="truncate">{item.label}</div>
                  </div>
                </div>

                {/* Expanded Badge */}
                {item.fullBadge ? (
                  <span
                    className={`text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded-full font-bold ${
                      isCollapsed ? "lg:hidden inline-block" : "inline-block"
                    }`}
                  >
                    {item.fullBadge}
                  </span>
                ) : (
                  isActive && (
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-sky-400 shrink-0 ${
                        isCollapsed ? "lg:hidden block" : "block"
                      }`}
                    />
                  )
                )}
              </button>
            );
          })}

          {/* Horizontal Divider Line */}
          <div className="my-4 border-t border-slate-800/80 mx-1" />

          {/* Quick Actions & Navigation Section */}
          <div className="pb-2">
            <p
              className={`px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 ${
                isCollapsed ? "lg:text-center lg:px-0" : ""
              }`}
            >
              {isCollapsed ? (
                <span className="lg:hidden">Display & Simulator</span>
              ) : (
                "Display & Simulator"
              )}
            </p>

            <Link
              href="/patient"
              target="_blank"
              title="Patient TV Display (/patient)"
              className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 border border-transparent hover:border-emerald-800/40 transition group ${
                isCollapsed
                  ? "lg:justify-center lg:px-0 lg:py-3 px-3 py-2.5 justify-between"
                  : "px-3 py-2.5 justify-between"
              }`}
            >
              <div
                className={`flex items-center gap-3 ${
                  isCollapsed ? "lg:justify-center" : ""
                }`}
              >
                <Tv className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className={isCollapsed ? "lg:hidden block" : "block"}>
                  Patient TV Display
                </span>
              </div>
              <span
                className={`text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 ${
                  isCollapsed ? "lg:hidden inline-block" : "inline-block"
                }`}
              >
                Live
              </span>
            </Link>

            <Link
              href="/simulator"
              title="RIS Simulator (/simulator)"
              className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-400 hover:text-sky-400 hover:bg-sky-950/20 border border-transparent hover:border-sky-800/40 transition group ${
                isCollapsed
                  ? "lg:justify-center lg:px-0 lg:py-3 px-3 py-2.5 justify-between"
                  : "px-3 py-2.5 justify-between"
              }`}
            >
              <div
                className={`flex items-center gap-3 ${
                  isCollapsed ? "lg:justify-center" : ""
                }`}
              >
                <Radio className="h-4 w-4 text-sky-400 shrink-0" />
                <span className={isCollapsed ? "lg:hidden block" : "block"}>
                  RIS Simulator
                </span>
              </div>
              <span
                className={`text-[10px] bg-sky-950 text-sky-400 px-1.5 py-0.5 rounded border border-sky-800 ${
                  isCollapsed ? "lg:hidden inline-block" : "inline-block"
                }`}
              >
                Ingest
              </span>
            </Link>
          </div>
        </div>

        {/* Account User Profile & Settings Footer */}
        <div
          className={`border-t border-slate-800/80 bg-slate-900/60 ${
            isCollapsed
              ? "p-3 flex flex-col items-center justify-center gap-2.5"
              : "p-3 sm:p-4"
          }`}
        >
          {isCollapsed ? (
            /* Collapsed View: Centered Avatar + Settings Gear */
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative cursor-pointer"
                title="Dr. Test Radiologist • Attending Radiologist"
                onClick={() => onTabChange("config")}
              >
                <div className="h-8 w-8 rounded-xl bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400 shadow-sm hover:border-sky-600 transition">
                  <User className="h-4 w-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>

              <button
                type="button"
                onClick={() => onTabChange("config")}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Configurations & Settings"
                aria-label="Configurations & Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Expanded View: Full Profile Card + Settings Gear */
            <div className="flex items-center justify-between gap-2.5 p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-xl bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400 shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                </div>

                <div className="min-w-0 truncate">
                  <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                    Dr. Test Radiologist
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <span>Attending Radiologist</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTabChange("config")}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0"
                title="Configurations & Settings"
                aria-label="Configurations & Settings"
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
