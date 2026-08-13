"use client";

import { useMemo } from "react";
import { useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { buildMetaViewModel } from "@/lib/meta-model";
import { formatMonthKey } from "@/lib/format";
import { MetaPortfolioSummary } from "./MetaPortfolioSummary";
import { MetaCampaignHighlightCard } from "./MetaCampaignHighlightCard";
import { MetaCampaignSection } from "./MetaCampaignSection";
import { MetaInsights } from "./MetaInsights";

/** Ported from renderMetaView() — top-level Meta Ads view container. */
export function MetaView() {
  const { isAdmin, availableClients, selectedClientSlug, selectedMonth, metaExpandedCampaigns } = useDashboardState();
  const { workbook, metaAnalysis } = useDashboardData();

  const client = availableClients.find((c) => c.slug === selectedClientSlug) || null;

  const model = useMemo(
    () => buildMetaViewModel(workbook, metaAnalysis, client?.name || "", selectedClientSlug, selectedMonth, metaExpandedCampaigns, isAdmin),
    [workbook, metaAnalysis, client?.name, selectedClientSlug, selectedMonth, metaExpandedCampaigns, isAdmin]
  );

  if (!model.hasData) {
    return (
      <div className="meta-view">
        <div className="meta-header">
          <div>
            <div className="meta-title">{client?.name || ""}</div>
            <div className="meta-legend">
              <div className="meta-legend-item">{formatMonthKey(selectedMonth)}</div>
            </div>
            <div className="meta-subtitle">Meta Ads Report</div>
          </div>
        </div>
        <div className="meta-body">
          <section className="meta-section" id="meta-portfolio">
            <div className="meta-section-label">Portfolio snapshot — selected months</div>
            {model.isComingSoon ? (
              <div className="meta-chart-card" style={{ textAlign: "center", padding: "48px 24px" }}>
                <div
                  className="meta-chart-title"
                  style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                  Report Coming Soon
                </div>
                <div className="meta-chart-sub" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
                  Currently gathering your {formatMonthKey(selectedMonth)} Meta Ads data. Your report will be available shortly.
                </div>
              </div>
            ) : (
              <div className="meta-chart-card">
                <div className="meta-chart-title">No Meta Ads data available</div>
                <div className="meta-chart-sub">Select a different month or client to load a 3-month Meta Ads window.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="meta-view">
      <div className="meta-header">
        <div>
          <div className="meta-title">{model.clientName}</div>
          <div className="meta-legend">
            {model.legendMonths.map((month) => (
              <div className="meta-legend-item" key={month.label}>
                <span className="meta-legend-dot" style={{ background: month.color }} />
                {month.label}
              </div>
            ))}
          </div>
          <div className="meta-subtitle">Meta Ads Report</div>
        </div>
      </div>
      <div className="meta-body">
        <MetaPortfolioSummary model={model} />

        {model.highlightCards.length > 0 && (
          <section className="meta-section" id="meta-campaigns">
            <div className="meta-stage">
              <div className="meta-stage-copy">
                <span className="meta-stage-num">02</span>
                <span className="meta-stage-title">Campaign Channels</span>
                <div className="meta-stage-line" />
              </div>
              <div className="meta-stage-anchor" />
            </div>
            <div className="meta-channel-summary-grid">
              {model.highlightCards.map((card) => (
                <MetaCampaignHighlightCard card={card} key={card.campaignType} />
              ))}
            </div>
            {model.campaignSections.map((section) => (
              <MetaCampaignSection section={section} key={section.campaignType} />
            ))}
          </section>
        )}

        <MetaInsights model={model} />
      </div>
    </div>
  );
}
