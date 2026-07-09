"use client";

import { CSSProperties } from "react";
import { formatMoney, formatPercent } from "@/lib/pricing-format";
import { nightGridCells, occClass, type PricingListing } from "@/lib/pricing-model";

/**
 * Expandable per-row detail panel with a 30/60/90 window tab switcher, ported
 * from renderTabbedWindowDetail()/renderWindowDetail()/nightGridDetail() in
 * pricing-tool.js. The source's renderTabbedWindowDetail() doesn't actually
 * render a tab strip (it just resolves the selected window and delegates to
 * renderWindowDetail) — the CSS ships .detail-tabs/.detail-tab classes that go
 * unused by that code path. Since real window-switching is a required
 * behavior here, this component adds a functional tab strip using those
 * existing classes rather than leaving them dead.
 */
export function PricingDetailPanel({
  listing,
  windowKeys,
  activeWindow,
  rowId,
  onSelectWindow,
}: {
  listing: PricingListing;
  windowKeys: string[];
  activeWindow: string;
  rowId: string;
  onSelectWindow: (windowKey: string) => void;
}) {
  const selectedWindow = listing.windows[activeWindow] ? activeWindow : windowKeys[0];
  const windowData = listing.windows[selectedWindow];

  if (!windowData) {
    return <div className="dw-empty">No data available for this window.</div>;
  }

  const occupancy = Math.max(0, Math.min(100, Number(windowData.occupancyRate) || 0));
  const ringClass = occClass(windowData.occupancyRate);
  const ringStyle = { "--dw-ring-value": `${occupancy}%` } as CSSProperties;

  return (
    <div className="detail-panel">
      <div className="detail-tabs" role="tablist" aria-label="Pricing window">
        {windowKeys.map((windowKey) => (
          <button
            key={windowKey}
            type="button"
            role="tab"
            aria-selected={selectedWindow === windowKey}
            data-detail-tab={windowKey}
            data-detail-row={rowId}
            className={`detail-tab${selectedWindow === windowKey ? " on" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelectWindow(windowKey);
            }}
          >
            <span className="detail-tab-label">{windowKey}D</span>
            <span className={`detail-tab-badge ${occClass(listing.windows[windowKey]?.occupancyRate)}`}>
              {formatPercent(listing.windows[windowKey]?.occupancyRate)}
            </span>
          </button>
        ))}
      </div>
      <div className="dw-flat-layout">
        <div className="detail-win dw-flat-card">
          <div className="dw-flat-metrics">
            <div className="dw-metric-block dw-metric-occ">
              <div className="dw-summary-kicker">Occupancy Rate</div>
              <div className="dw-summary-hero">
                <div className={`dw-ring dw-ring-${ringClass}`} style={ringStyle} />
                <div className="dw-summary-copy">
                  <span className={`dw-occ ${ringClass}`}>{formatPercent(windowData.occupancyRate)}</span>
                  <span className="dw-summary-ratio">
                    {windowData.bookedDays}/{windowData.totalDays} booked
                  </span>
                </div>
              </div>
            </div>
            <div className="dw-metric-block dw-metric-fill">
              <div className="dw-label dw-grid-head">
                <span>Night Fill</span>
                <span className="dw-open-pill">{windowData.availableDays} Open</span>
              </div>
              <div className="dw-ngrid">
                {nightGridCells(windowData).map((cell, index) => (
                  <div
                    key={index}
                    className={`dw-ngrid-cell ${cell.booked ? "on" : "off"} ${cell.cls}`}
                  />
                ))}
              </div>
            </div>
            <div className="dw-metric-block dw-metric-revenue">
              <div className="dw-revenue-card">
                <div className="dw-revenue-value">{formatMoney(windowData.potentialRevenue)}</div>
                <div className="dw-revenue-label">Potential Revenue · {selectedWindow}D Window</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
