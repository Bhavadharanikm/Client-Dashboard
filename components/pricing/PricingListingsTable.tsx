"use client";

import { Fragment } from "react";
import { formatMoney, formatPercent } from "@/lib/pricing-format";
import {
  filteredListings,
  hmColor,
  hmOpacity,
  occClass,
  revenueNext30,
  rowDomId,
  type PricingListing,
  type PricingModel,
  type PricingViewState,
} from "@/lib/pricing-model";
import { PricingDetailPanel } from "@/components/pricing/PricingDetailPanel";

const WINDOW_KEYS = ["30", "60", "90"];
const SORT_OPTIONS = [
  { value: "name", label: "A-Z" },
  { value: "window-value", label: "Top opportunity" },
  { value: "30", label: "Highest 30D occupancy" },
  { value: "90", label: "Highest 90D occupancy" },
  { value: "opportunity", label: "Highest total value" },
];

function Sparkbar({ listing }: { listing: PricingListing }) {
  return (
    <div className="sparkbar-wrap">
      {WINDOW_KEYS.map((windowKey) => {
        const windowData = listing.windows[windowKey];
        const occupancy = Number(windowData?.occupancyRate) || 0;
        const height = Math.max(4, Math.round((occupancy / 100) * 22));
        return (
          <div
            key={windowKey}
            className="sparkbar-col"
            style={{ height, background: hmColor(occupancy), opacity: hmOpacity() + 0.18 }}
            title={`${windowKey}D: ${formatPercent(occupancy)}`}
          />
        );
      })}
    </div>
  );
}

/** Sortable/filterable/searchable listings table, ported from the table-building
 * portion of render() in pricing-tool.js. */
export function PricingListingsTable({
  model,
  viewState,
  onFilterChange,
  onSearchChange,
  onSortChange,
  onToggleRow,
  onTogglePill,
  onSelectDetailWindow,
}: {
  model: PricingModel;
  viewState: PricingViewState;
  onFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onToggleRow: (rowId: string) => void;
  onTogglePill: (rowId: string, windowKey: string) => void;
  onSelectDetailWindow: (rowId: string, windowKey: string) => void;
}) {
  const visibleListings = filteredListings(model, viewState);

  return (
    <section className="section visible" id="pricing-listings">
      <div className="sec-label">
        <div className="sec-label-line" />
        <div className="sec-label-text">All Listings · Click Any Row To Expand</div>
        <div className="sec-label-line" />
      </div>
      <div className="pricing-controls">
        <div className="pricing-filter-group">
          <span className="filter-label">Filter:</span>
          <button
            type="button"
            className={`filter-chip${viewState.filterState === "ALL" ? " active" : ""}`}
            onClick={() => onFilterChange("ALL")}
          >
            All
          </button>
          {model.states.map((code) => (
            <button
              key={code}
              type="button"
              className={`filter-chip${viewState.filterState === code ? " active" : ""}`}
              onClick={() => onFilterChange(code)}
            >
              <span className="filter-dot" style={{ background: hmColor(65 + (code.charCodeAt(0) % 20)) }} />
              {code}
            </button>
          ))}
        </div>
        <div className="pricing-search-group">
          <div className="search-shell">
            <input
              className="search-input"
              type="text"
              placeholder="Search listings..."
              value={viewState.search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
          <div className="sort-shell">
            <label htmlFor="pricingSortSelect">Sort</label>
            <select
              id="pricingSortSelect"
              className="sort-select"
              value={viewState.sortKey}
              onChange={(event) => onSortChange(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="port-table-wrap">
        <table className="port-table">
          <thead className="pt-head">
            <tr>
              <th>Listing</th>
              <th>30D</th>
              <th>60D</th>
              <th>90D</th>
              <th>Trend</th>
              <th style={{ textAlign: "center" }}>Revenue (Next 30D)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleListings.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="pricing-no-results">No listings match this filter.</div>
                </td>
              </tr>
            )}
            {visibleListings.map((listing) => {
              const rowId = rowDomId(listing.id);
              const isOpen = viewState.openRowId === rowId;
              const activeWin = isOpen ? viewState.detailWindowByRow[rowId] || viewState.activeWindow : null;

              return (
                <Fragment key={rowId}>
                  <tr
                    className={`pt-row${isOpen ? " active" : ""}`}
                    onClick={() => onToggleRow(rowId)}
                  >
                    <td>
                      <div className="pt-name">{listing.nickname}</div>
                      <div className="pt-loc">{[listing.city, listing.state].filter(Boolean).join(", ")}</div>
                    </td>
                    {WINDOW_KEYS.slice(0, 3).map((windowKey) => (
                      <td style={{ textAlign: "center" }} key={windowKey}>
                        <span
                          className={`occ-pill ${occClass(listing.windows[windowKey]?.occupancyRate)}${
                            isOpen && activeWin === windowKey ? " pill-active" : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onTogglePill(rowId, windowKey);
                          }}
                        >
                          {formatPercent(listing.windows[windowKey]?.occupancyRate)}
                        </span>
                      </td>
                    ))}
                    <td>
                      <Sparkbar listing={listing} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="revenue-next-30">{formatMoney(revenueNext30(listing))}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="expand-icon">{isOpen ? "−" : "+"}</span>
                    </td>
                  </tr>
                  <tr className={`detail-row${isOpen ? " open" : ""}`} id={`${rowId}-detail`}>
                    <td className="detail-cell" colSpan={7}>
                      {isOpen && (
                        <div className="detail-inner">
                          <PricingDetailPanel
                            listing={listing}
                            windowKeys={model.windowKeys}
                            activeWindow={viewState.detailWindowByRow[rowId] || viewState.activeWindow}
                            rowId={rowId}
                            onSelectWindow={(windowKey) => onSelectDetailWindow(rowId, windowKey)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
