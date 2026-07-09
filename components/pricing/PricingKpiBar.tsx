"use client";

import { formatMoney, formatPercent } from "@/lib/pricing-format";
import { getAvgOccupancy, getWindowSummary, type PricingModel } from "@/lib/pricing-model";

/** Hero header + KPI summary bar, ported from the top of render() in pricing-tool.js. */
export function PricingKpiBar({
  model,
  clientName,
  activeWindow,
  onSelectWindow,
}: {
  model: PricingModel;
  clientName: string;
  activeWindow: string;
  onSelectWindow: (windowKey: string) => void;
}) {
  const summary = getWindowSummary(model.listings, activeWindow);
  const averageOccupancy = getAvgOccupancy(model.listings, activeWindow);

  return (
    <section id="pricing-overview" className="section visible pricing-ref-hero">
      <header className="pp-header">
        <h1>{clientName}</h1>
        <div className="pp-eyebrow">Pricing Tool</div>
        <div className="pp-subtitle">Upcoming occupancy and projected revenue over the next 30, 60, and 90 days.</div>
      </header>
      <div className="pricing-kpi-bar">
        <div className="pricing-kpi-cards">
          <div className="kpi-card">
            <div className="kpi-val white">{summary.nearingFull}</div>
            <div className="kpi-lbl">Nearing Full</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val sage">{formatPercent(averageOccupancy)}</div>
            <div className="kpi-lbl">Avg Occupancy</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-val gold">{formatMoney(summary.openValue)}</div>
            <div className="kpi-lbl">
              Open Value{" "}
              <span style={{ fontSize: "0.75em", color: "#000", fontWeight: 600, whiteSpace: "nowrap" }}>
                (direct booking revenue)
              </span>
            </div>
          </div>
        </div>
        <div className="kpi-bar-divider" />
        <div className="kpi-right-panel">
          <div className="kpi-win-tabs">
            {model.windowKeys.map((windowKey) => (
              <button
                key={windowKey}
                type="button"
                className={`kpi-win-btn${activeWindow === windowKey ? " on" : ""}`}
                onClick={() => onSelectWindow(windowKey)}
              >
                {windowKey}D
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
