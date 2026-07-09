"use client";

import { useMemo, useState } from "react";
import type { ClientDirectoryRow } from "@/lib/server/admin-clients";
import { testFetchSheetRow, syncSheetRow, type SheetFetchResult, type SheetKind } from "@/app/admin/super/sheets-actions";
import { getAllMonthKeys, type PerformanceWorkbook } from "@/lib/roi-model";
import { MonthPicker } from "@/components/shared/MonthPicker";

export function SheetSyncPanel({
  directory,
  workbook,
}: {
  directory: ClientDirectoryRow[];
  workbook: PerformanceWorkbook;
}) {
  const [clientSlug, setClientSlug] = useState(directory[0]?.slug || "");
  const [month, setMonth] = useState(""); // "YYYY-MM"
  const [sheet, setSheet] = useState<SheetKind>("performance");
  const [result, setResult] = useState<SheetFetchResult | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"test" | "sync" | null>(null);

  const [year, monthNum] = month ? month.split("-").map(Number) : [0, 0];
  const canRun = !!clientSlug && !!year && !!monthNum;

  function handleClientChange(nextSlug: string) {
    setClientSlug(nextSlug);
    if (month && !getAllMonthKeys(workbook, nextSlug).includes(month)) {
      setMonth("");
    }
    setResult(null);
    setSyncMessage(null);
  }

  async function handleTest() {
    if (!canRun) return;
    setLoading("test");
    setSyncMessage(null);
    try {
      const res = await testFetchSheetRow(clientSlug, year, monthNum, sheet);
      setResult(res);
    } finally {
      setLoading(null);
    }
  }

  async function handleSync() {
    if (!canRun) return;
    setLoading("sync");
    try {
      const res = await syncSheetRow(clientSlug, year, monthNum, sheet);
      setSyncMessage(res.success ? "Synced successfully." : res.error || "Sync failed.");
    } finally {
      setLoading(null);
    }
  }

  const selectedClient = directory.find((c) => c.slug === clientSlug);
  const availableMonths = useMemo(() => getAllMonthKeys(workbook, clientSlug), [workbook, clientSlug]);

  return (
    <div className="super-admin-table-wrap super-admin-create-card">
      <div className="super-admin-create-form">
        <div className="super-admin-field-group">
          <label className="super-admin-field-label" htmlFor="sheetSyncClient">
            Client
          </label>
          <select
            id="sheetSyncClient"
            className="super-admin-input"
            value={clientSlug}
            onChange={(event) => handleClientChange(event.target.value)}
          >
            {directory.map((client) => (
              <option key={client.slug} value={client.slug}>
                {client.name} ({client.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="super-admin-field-group">
          <label className="super-admin-field-label" htmlFor="sheetSyncMonth">
            Month
          </label>
          <div className="super-admin-input">
            <MonthPicker id="sheetSyncMonth" value={month} onChange={setMonth} availableMonths={availableMonths} />
          </div>
        </div>
        <div className="super-admin-field-group">
          <label className="super-admin-field-label" htmlFor="sheetSyncSheet">
            Sheet
          </label>
          <select
            id="sheetSyncSheet"
            className="super-admin-input"
            value={sheet}
            onChange={(event) => setSheet(event.target.value as SheetKind)}
          >
            <option value="performance">Performance data</option>
            <option value="ads_roi">Ads ROI data (⚠ not verified yet — see below)</option>
          </select>
        </div>
        <button type="button" className="super-admin-cancel-btn" disabled={!canRun || loading !== null} onClick={handleTest}>
          {loading === "test" ? "Testing..." : "Test"}
        </button>
        <button type="button" className="super-admin-submit-btn" disabled={!canRun || loading !== null} onClick={handleSync}>
          {loading === "sync" ? "Syncing..." : "Sync"}
        </button>
      </div>

      {sheet === "ads_roi" && (
        <p className="super-admin-error" style={{ margin: "14px 24px 0" }}>
          Ads ROI data mapping is not verified against the live sheet yet — client-block grouping and duplicate
          Spend/ROAS columns aren&apos;t handled correctly. Always check the &quot;Test&quot; result carefully before
          syncing, or use Performance data only until this is fixed.
        </p>
      )}

      {syncMessage && <p className={syncMessage.startsWith("Synced") ? "super-admin-success-code-label" : "super-admin-error"}>{syncMessage}</p>}

      {result && (
        <div className="super-admin-sheet-result">
          {result.tabUsed && (
            <p className="super-admin-muted">
              Read from tab: <code>{result.tabUsed}</code>
              {result.otherCandidateTabs && result.otherCandidateTabs.length > 0 && (
                <>
                  {" "}
                  (other candidates for this month: {result.otherCandidateTabs.map((t) => <code key={t}>{t}</code>)})
                </>
              )}
            </p>
          )}
          {result.error && <p className="super-admin-error">{result.error}</p>}
          {result.found && (
            <div className="super-admin-sheet-columns">
              <div>
                <div className="super-admin-field-label">Raw</div>
                <pre className="super-admin-sheet-pre">{JSON.stringify(result.raw, null, 2)}</pre>
              </div>
              <div>
                <div className="super-admin-field-label">Mapped ({selectedClient?.slug})</div>
                <pre className="super-admin-sheet-pre">{JSON.stringify(result.mapped, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
