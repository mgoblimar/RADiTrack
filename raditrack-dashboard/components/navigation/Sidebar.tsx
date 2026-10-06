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
} from "lucide-react";
import { QuickIngestionModal } from "@/components/dashboard/QuickIngestionModal";

export type ActiveTab = "overview" | "examinations" | "config";

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount?: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  pendingCount = 0,
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Analytics & Ops",
      icon: LayoutDashboard,
      badge: null,
      description: "Live dashboard & TAT intelligence",
    },
    {
      id: "examinations" as ActiveTab,
      label: "Examinations Hub",
      icon: FileSpreadsheet,
      badge: pendingCount > 0 ? `${pendingCount} pending` : null,
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
      {/* Mobile Top Header */}
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

      {/* Main Sidebar Shell (Desktop Fixed / Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-md border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950/60 border border-sky-800/80 rounded-xl text-sky-400 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base tracking-tight leading-tight">
                RADiTrack
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                QCGH Department of Radiology
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Workspace Tabs */}
        <div className="px-3 py-4 flex-1 space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Workspaces
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition ${
                      isActive ? "text-sky-400" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <div className="text-left">
                    <div>{item.label}</div>
                  </div>
                </div>

                {item.badge ? (
                  <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="h-3.5 w-3.5 text-sky-400" />
                )}
              </button>
            );
          })}

          {/* Quick Actions & Navigation Section */}
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Clinical Shortcuts
            </p>

            <Link
              href="/patient"
              target="_blank"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 border border-transparent hover:border-emerald-800/40 transition group"
            >
              <div className="flex items-center gap-3">
                <Tv className="h-4 w-4 text-emerald-400" />
                <span>Patient TV Display</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                Live
              </span>
            </Link>

            <div className="mt-2 px-1">
              <QuickIngestionModal />
            </div>
          </div>
        </div>

        {/* Footer & Audit Badge */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium">System Online • SQLite Local</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>100% Zero-PII Guardrail Enforced</span>
          </div>
        </div>
      </aside>
    </>
  );
}
