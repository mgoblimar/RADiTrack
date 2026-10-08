"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportExaminationsCSVAction } from "@/app/actions";

export function ExportCsvButton() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const csvData =
        await exportExaminationsCSVAction();

      const blob = new Blob([csvData], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;

      link.setAttribute(
        "download",
        `RADiTrack_Export_${new Date()
          .toISOString()
          .split("T")[0]}.csv`,
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert(
        "Failed to export CSV. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-extrabold text-qc-navy shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-qc-blue/20 hover:bg-qc-blue/5 hover:text-qc-blue disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      title="Download raw de-identified examination dataset for auditing and RIS validation"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-qc-blue" />
      ) : (
        <Download className="h-4 w-4 text-qc-blue" />
      )}

      <span>
        {loading
          ? "Preparing export…"
          : "Export CSV"}
      </span>
    </button>
  );
}