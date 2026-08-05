"use client";

import type { RoiViewModel } from "@/lib/roi-metrics";
import { useDashboardState } from "@/hooks/useDashboardState";

export function ExecutiveSummary({ model }: { model: RoiViewModel }) {
  const { executiveSummary: s, clientName, dateRangeLabel } = model;
  const { isAdmin, availableClients, selectedClientSlug } = useDashboardState();
  // Admin-only, matching where else access codes are shown (Sidebar's client
  // dropdown, Super Admin directory) — clients don't need to see their own
  // code back at themselves. Small/bracketed so it reads as a quick
  // reference, easy to copy, not a headline element.
  const clientCode = isAdmin ? availableClients.find((c) => c.slug === selectedClientSlug)?.code : undefined;

  return (
    <section id="executive-summary" className="section">
      <header className="pp-header">
        <h1 id="clientNameHeading">
          {clientName}
          {clientCode && (
            <span style={{ fontSize: "0.4em", fontWeight: 500, opacity: 0.5, marginLeft: 10, verticalAlign: "middle" }}>
              ({clientCode})
            </span>
          )}
        </h1>
        <div className="pp-eyebrow" id="dateRangeLabel">
          {dateRangeLabel}
        </div>
        <div className="pp-subtitle">Performance Overview</div>
        <div className="pp-summary-strip">
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel1">
              Total Revenue
            </div>
            <div className="pp-summary-value" id="summaryNewFollowers">
              {s.summaryNewFollowers}
            </div>
            <div className="pp-summary-note" id="summaryNote1">
              {s.summaryNote1}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel2">
              Direct Revenue
            </div>
            <div className="pp-summary-value" id="summaryTotalImpressions">
              {s.summaryTotalImpressions}
            </div>
            <div className="pp-summary-note" id="summaryNote2">
              {s.summaryNote2}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel3">
              Direct Split
            </div>
            <div className="pp-summary-value" id="summaryTotalRevenue">
              {s.summaryTotalRevenue}
            </div>
            <div className="pp-summary-note" id="summaryNote3">
              {s.summaryNote3}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel4">
              New Leads
            </div>
            <div className="pp-summary-value" id="summaryAvgCostPerLead">
              {s.summaryAvgCostPerLead}
            </div>
            <div className="pp-summary-note" id="summaryAvgCostPerLeadNote">
              {s.summaryAvgCostPerLeadNote}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel5">
              New Followers
            </div>
            <div className="pp-summary-value" id="summaryNewLeads">
              {s.summaryNewLeads}
            </div>
            <div className="pp-summary-note" id="summaryNote5">
              {s.summaryNote5}
            </div>
          </div>
          <div className="pp-summary-stat">
            <div className="pp-summary-label" id="summaryLabel6">
              Views
            </div>
            <div className="pp-summary-value" id="summaryDirectSplitAvg">
              {s.summaryDirectSplitAvg}
            </div>
            <div className="pp-summary-note" id="summaryNote6">
              {s.summaryNote6}
            </div>
          </div>
        </div>
        <div id="statusMessage" className="status-message" />
      </header>
    </section>
  );
}
