"use client";

import type { MetaHighlightCardModel } from "@/lib/meta-model";
import { formatCurrency } from "@/lib/format";
import { useDashboardDispatch } from "@/hooks/useDashboardState";

function MetaChannelStat({ label, value, note }: { label: string; value: string; note: string }) {
  const isPeak = label === "Peak Month";
  return (
    <div className="meta-channel-stat">
      <div className="meta-channel-stat-label">{label}</div>
      <div className={isPeak ? "meta-channel-stat-value meta-channel-stat-value-peak" : "meta-channel-stat-value"}>{value}</div>
      {!isPeak && <div className="meta-channel-stat-note">{note}</div>}
    </div>
  );
}

/** Ported from renderMetaCampaignHighlightCard(). */
export function MetaCampaignHighlightCard({ card }: { card: MetaHighlightCardModel }) {
  const dispatch = useDashboardDispatch();
  const { campaignType, toggleKey, isOpen, accent, summary } = card;

  return (
    <article
      className={`meta-channel-card${isOpen ? " is-open" : ""}`}
      data-meta-campaign-toggle={campaignType}
      onClick={() => dispatch({ type: "TOGGLE_META_CAMPAIGN", key: toggleKey })}
    >
      <div className="meta-channel-head">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div className="meta-channel-icon" style={{ background: accent.bg, color: accent.color }}>
            {accent.icon}
          </div>
          <div>
            <div className="meta-channel-title">{campaignType}</div>
            <div className="meta-channel-subtitle">{accent.subtitle}</div>
          </div>
        </div>
        <button
          className="meta-channel-toggle"
          type="button"
          data-meta-campaign-toggle-button={campaignType}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Hide" : "Show"} ${campaignType} details`}
          onClick={(event) => {
            event.stopPropagation();
            dispatch({ type: "TOGGLE_META_CAMPAIGN", key: toggleKey });
          }}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      <div className="meta-channel-stats">
        <MetaChannelStat label="Total Spend" value={formatCurrency(summary.totalSpend, 0)} note={`${summary.monthCount}-month total`} />
        <MetaChannelStat label="Revenue" value={formatCurrency(summary.totalRevenue, 0)} note="Attributed" />
        <MetaChannelStat label="Peak Month" value={summary.peakMonthLabel} note={summary.peakMonthNote} />
      </div>
    </article>
  );
}
