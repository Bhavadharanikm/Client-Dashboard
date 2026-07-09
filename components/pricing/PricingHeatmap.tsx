"use client";

import { formatPercent } from "@/lib/pricing-format";
import { hmColor, hmOpacity, occClass, rowDomId, type PricingModel } from "@/lib/pricing-model";

const WINDOW_KEYS = ["30", "60", "90"];

/** Portfolio occupancy heatmap grid, ported from heatmapRows() in pricing-tool.js. */
export function PricingHeatmap({
  model,
  onJumpToRow,
}: {
  model: PricingModel;
  onJumpToRow: (rowId: string, windowKey: string) => void;
}) {
  return (
    <section className="section visible" id="pricing-heatmap">
      <div className="heatmap-wrap">
        <div className="heatmap-title">Portfolio Occupancy at a Glance</div>
        <div className="heatmap-sub">
          30D, 60D, 90D occupancy across all {model.totalListings} listings. Color intensity reflects booking
          density.
        </div>
        <div className="heatmap-legend" aria-label="Occupancy legend">
          <span className="heatmap-legend-item">
            <span className="heatmap-legend-swatch full" />
            90%-100%
          </span>
          <span className="heatmap-legend-item">
            <span className="heatmap-legend-swatch high" />
            60%-89%
          </span>
          <span className="heatmap-legend-item">
            <span className="heatmap-legend-swatch mid" />
            40%-59%
          </span>
          <span className="heatmap-legend-item">
            <span className="heatmap-legend-swatch low" />
            Under 40%
          </span>
        </div>
        <div className="heatmap-grid">
          {model.listings.map((listing) => {
            const rowId = rowDomId(listing.id);
            const displayName =
              listing.nickname.length > 28 ? `${listing.nickname.slice(0, 26)}...` : listing.nickname;
            return (
              <div className="hm-row" key={listing.id}>
                <div className="hm-name" title={listing.nickname}>
                  {displayName}
                </div>
                <div className="hm-bars">
                  {WINDOW_KEYS.map((windowKey) => {
                    const windowData = listing.windows[windowKey];
                    const occupancy = Number(windowData?.occupancyRate) || 0;
                    return (
                      <button
                        key={windowKey}
                        type="button"
                        className={`hm-seg hm-seg-${windowKey} hm-seg-${occClass(occupancy)}`}
                        style={{ background: hmColor(occupancy), opacity: hmOpacity() }}
                        title={`${windowKey}D: ${formatPercent(occupancy)}`}
                        onClick={() => onJumpToRow(rowId, windowKey)}
                      >
                        {formatPercent(occupancy)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
