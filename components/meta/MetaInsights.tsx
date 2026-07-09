"use client";

import type { MetaViewModel } from "@/lib/meta-model";
import { formatMultiple } from "@/lib/format";

/** Ported from renderMetaInsights() + renderMetaEfficiencyCard(). */
export function MetaInsights({ model }: { model: MetaViewModel }) {
  const { insights } = model;

  return (
    <section className="meta-section" id="meta-insights">
      <div className="meta-stage">
        <div className="meta-stage-copy">
          <span className="meta-stage-num">03</span>
          <span className="meta-stage-title">Performance Insights</span>
          <div className="meta-stage-line" />
        </div>
        <div className="meta-stage-anchor" />
      </div>

      <div className="meta-insight-split">
        <div className="meta-takeaway-card">
          <div className="meta-takeaway-title">
            Key Takeaways
            {insights.periodLabel && (
              <span style={{ fontSize: "0.6em", fontWeight: 500, opacity: 0.5, whiteSpace: "nowrap" }}> ({insights.periodLabel})</span>
            )}
          </div>
          <ul className="meta-takeaway-list">
            {insights.takeaways.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="meta-insight-card meta-efficiency-card">
          <div className="meta-efficiency-head">
            <div className="meta-efficiency-title">Campaign Efficiency — ROAS</div>
            <div className="meta-efficiency-sub">Higher ROAS = better performance</div>
          </div>
          <div className="meta-efficiency-list">
            {insights.efficiencyRows.map((row) => (
              <div className="meta-efficiency-row" key={row.key}>
                <div className="meta-efficiency-label">
                  <span
                    className={`meta-pill meta-efficiency-pill month-${row.monthIndex}`}
                    style={{ background: row.monthBg, color: row.monthColor }}
                  >
                    {row.shortLabel}
                  </span>
                  <span>{row.campaignType}</span>
                </div>
                <div className="meta-efficiency-track">
                  <div className="meta-efficiency-fill" style={{ width: `${row.barWidth}%`, background: row.barColor }} />
                </div>
                <div className="meta-efficiency-cost">{row.hasRoas ? formatMultiple(row.roas) : "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
