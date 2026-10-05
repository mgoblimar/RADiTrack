"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportExaminationsCSVAction } from "@/app/actions";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const csvData = await exportExaminationsCSVAction();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `RADiTrack_Export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3.5 py-2 rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
      title="Download raw de-identified examination dataset for auditing & RIS validation"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
      ) : (
        <Download className="h-4 w-4 text-sky-400" />
      )}
      <span>Export Raw Data (CSV)</span>
    </button>
  );
}
