"use client";

import { useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { exportClientDataCSV, exportMetaDataCSV } from "@/lib/csv-export";

export function ExportButtons() {
  const { availableClients, selectedClientSlug, activeView } = useDashboardState();
  const { workbook } = useDashboardData();

  const isMeta = activeView === "meta";
  const isPricing = activeView === "pricing";

  function handleExportCsv() {
    const client = availableClients.find((c) => c.slug === selectedClientSlug) || null;
    exportClientDataCSV(workbook, client);
  }

  function handleExportMetaCsv() {
    const client = availableClients.find((c) => c.slug === selectedClientSlug) || null;
    exportMetaDataCSV(workbook, client);
  }

  return (
    <div
      id="exportBtnGroup"
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 999,
        display: selectedClientSlug ? "flex" : "none",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
      }}
    >
      <div className="export-btn-wrap" style={{ display: isMeta ? "flex" : "none" }} id="exportMetaBtnWrap">
        <span className="export-tooltip">Export Meta Data</span>
        <button id="exportMetaCsvBtn" className="export-icon-btn" aria-label="Export Meta Data" onClick={handleExportMetaCsv}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={22} height={22}>
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="export-btn-wrap" style={{ display: !isMeta && !isPricing ? "flex" : "none" }} id="exportPerfBtnWrap">
        <span className="export-tooltip">Export Performance</span>
        <button id="exportCsvBtn" className="export-icon-btn" aria-label="Export Performance" onClick={handleExportCsv}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width={22} height={22}>
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
