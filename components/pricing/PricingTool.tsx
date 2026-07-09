"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { canonicalizeClientSlug, isPricingToolClient, PRICING_ENABLED_SLUGS } from "@/lib/client-slug";
import { normalizePricingData, type PricingViewState, type RawPricingData } from "@/lib/pricing-model";
import { getRevenueIntelligence } from "@/app/dashboard/pricing-actions";
import { PricingKpiBar } from "@/components/pricing/PricingKpiBar";
import { PricingHeatmap } from "@/components/pricing/PricingHeatmap";
import { PricingListingsTable } from "@/components/pricing/PricingListingsTable";

/**
 * Container for the Pricing Tool view — ported from pricing-tool.js's render().
 * Data-source precedence (from renderPricingView() in dashboard.js):
 *   1. Revenue-intelligence-enabled clients (PRICING_ENABLED_SLUGS): always try
 *      the live API via the getRevenueIntelligence Server Action, ignoring the
 *      static bootstrap `pricingToolData` entirely. Empty state if the action
 *      returns null (no key, network failure, unsupported month, etc).
 *   2. All other clients: use the static `pricingToolData` from the bootstrap
 *      fetch (lib/server/data.ts fetchPricingToolData()), gated on
 *      isPricingToolClient(). Empty state if there's no data.
 */
export function PricingTool() {
  const dashboardState = useDashboardState();
  const { pricingToolData } = useDashboardData();
  const { selectedClientSlug, availableClients } = dashboardState;

  const clientName = useMemo(
    () => availableClients.find((c) => c.slug === selectedClientSlug)?.name || "Pricing Tool",
    [availableClients, selectedClientSlug]
  );

  // Mirrors renderPricingView()'s hardcoded slug check in dashboard.js — a
  // narrower, separate concept from isPricingToolClient() (which also governs
  // Sidebar tab visibility and can be widened via DASHBOARD_CONFIG.pricingTool
  // for the static-JSON branch below).
  const isRevenueIntelligenceClient = PRICING_ENABLED_SLUGS.includes(canonicalizeClientSlug(selectedClientSlug));

  const [liveData, setLiveData] = useState<RawPricingData | null>(null);
  const [loading, setLoading] = useState(isRevenueIntelligenceClient);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isRevenueIntelligenceClient) {
      setLiveData(null);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    getRevenueIntelligence(selectedClientSlug)
      .then((data) => {
        if (requestIdRef.current === requestId) {
          setLiveData(data);
        }
      })
      .catch(() => {
        if (requestIdRef.current === requestId) {
          setLiveData(null);
        }
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, [isRevenueIntelligenceClient, selectedClientSlug]);

  // Live data takes precedence for RI-enabled clients (static pricingToolData
  // is never consulted for them, matching renderPricingView()). Otherwise fall
  // back to the bootstrap-fetched static JSON dataset, gated the same way the
  // source's final isPricingToolClient(...) || !state.pricingToolData check does.
  const effectiveRawData: RawPricingData | null = isRevenueIntelligenceClient
    ? liveData
    : isPricingToolClient(selectedClientSlug)
      ? ((pricingToolData as RawPricingData | null) ?? null)
      : null;

  const model = useMemo(() => normalizePricingData(effectiveRawData), [effectiveRawData]);

  // Top-level interaction state, named identically to container.__pricingToolState
  // in the source for easy review.
  const [activeWindow, setActiveWindow] = useState("30");
  const [filterState, setFilterState] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [openRowId, setOpenRowId] = useState("");
  const [detailWindowByRow, setDetailWindowByRow] = useState<Record<string, string>>({});

  // Reset interaction state when the underlying model changes shape (new client/month).
  useEffect(() => {
    setActiveWindow((current) => (model && model.windowKeys.includes(current) ? current : model?.windowKeys[0] || "30"));
    setOpenRowId("");
  }, [model]);

  if (loading) {
    return (
      <div className="pricing-ref-shell pricing-ref-shell-empty">
        <div className="pp-wrap">
          <section className="section visible pricing-ref-hero">
            <header className="pp-header">
              <div className="pp-eyebrow">Pricing Tool</div>
              <h1>{clientName}</h1>
            </header>
            <div className="pricing-empty-card">Loading pricing data…</div>
          </section>
        </div>
      </div>
    );
  }

  if (!model) {
    const message =
      isRevenueIntelligenceClient && !liveData
        ? "No pricing data available for this month."
        : "Pricing data is not available yet for this client.";
    return (
      <div className="pricing-ref-shell pricing-ref-shell-empty">
        <div className="pp-wrap">
          <section className="section visible pricing-ref-hero">
            <header className="pp-header">
              <div className="pp-eyebrow">Pricing Tool</div>
              <h1>{clientName}</h1>
            </header>
            <div className="pricing-empty-card">{message}</div>
          </section>
        </div>
      </div>
    );
  }

  const viewState: PricingViewState = {
    activeWindow,
    filterState,
    search,
    sortKey,
    openRowId,
    detailWindowByRow,
  };

  // Plain row click: simple open/close toggle on openRowId, ported from the
  // [data-pricing-row] handler in pricing-tool.js. Only seeds detailWindowByRow
  // if it isn't already set — does NOT compare/toggle on window like the pill
  // click handler below does.
  function toggleRowOpen(rowId: string) {
    setOpenRowId((current) => (current === rowId ? "" : rowId));
    setDetailWindowByRow((prev) => (prev[rowId] ? prev : { ...prev, [rowId]: activeWindow }));
  }

  // Occupancy pill click: window-aware toggle, ported from the
  // [data-pricing-pill] handler in pricing-tool.js — clicking the same open
  // window's pill again collapses the row; clicking a different window's pill
  // (or a closed row's pill) opens/switches to that window.
  function togglePill(rowId: string, windowKey: string) {
    const alreadyOpenSameWindow = openRowId === rowId && detailWindowByRow[rowId] === windowKey;
    if (alreadyOpenSameWindow) {
      setOpenRowId("");
      return;
    }
    setOpenRowId(rowId);
    setDetailWindowByRow((prev) => ({ ...prev, [rowId]: windowKey }));
  }

  return (
    <div className="pricing-ref-shell">
      <div className="pp-wrap">
        <PricingKpiBar
          model={model}
          clientName={clientName}
          activeWindow={activeWindow}
          onSelectWindow={(windowKey) => setActiveWindow(windowKey)}
        />
        <PricingHeatmap
          model={model}
          onJumpToRow={(rowId, windowKey) => {
            setOpenRowId(rowId);
            setDetailWindowByRow((prev) => ({ ...prev, [rowId]: windowKey }));
          }}
        />
        <PricingListingsTable
          model={model}
          viewState={viewState}
          onFilterChange={(value) => {
            setFilterState(value);
            setOpenRowId("");
          }}
          onSearchChange={(value) => {
            setSearch(value);
            setOpenRowId("");
          }}
          onSortChange={(value) => {
            setSortKey(value);
            setOpenRowId("");
          }}
          onToggleRow={toggleRowOpen}
          onTogglePill={togglePill}
          onSelectDetailWindow={(rowId, windowKey) => {
            setDetailWindowByRow((prev) => ({ ...prev, [rowId]: windowKey }));
            setOpenRowId(rowId);
          }}
        />
      </div>
    </div>
  );
}
