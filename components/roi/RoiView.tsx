"use client";

import { useMemo } from "react";
import { useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardData } from "@/hooks/useDashboardData";
import { buildRoiViewModel } from "@/lib/roi-metrics";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { FullFunnelSummary } from "./FullFunnelSummary";
import { AwarenessSection } from "./AwarenessSection";
import { AudienceSection } from "./AudienceSection";
import { LeadGenerationSection } from "./LeadGenerationSection";
import { WebsiteTrafficSection } from "./WebsiteTrafficSection";
import { RevenueBookingsSection } from "./RevenueBookingsSection";

export function RoiView() {
  const { isAdmin, availableClients, selectedClientSlug, selectedMonth } = useDashboardState();
  const { workbook, roiAnalysis } = useDashboardData();

  const client = availableClients.find((c) => c.slug === selectedClientSlug) || null;

  const model = useMemo(
    () => buildRoiViewModel(workbook, roiAnalysis, client?.name || "", selectedClientSlug, selectedMonth, isAdmin),
    [workbook, roiAnalysis, client?.name, selectedClientSlug, selectedMonth, isAdmin]
  );

  if (model.isComingSoon) {
    return (
      <div id="roiView" className="roi-view pp-view">
        <div className="pp-ambient pp-ambient-1" />
        <div className="pp-ambient pp-ambient-2" />
        <div className="pp-ambient pp-ambient-3" />
        <div className="pp-wrap">
          <div className="pp-glass" style={{ textAlign: "center", padding: "64px 24px" }}>
            <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Report Coming Soon
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
              Currently gathering your {model.dateRangeLabel} performance data. Your report will be available
              shortly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="roiView" className="roi-view pp-view">
      <div className="pp-ambient pp-ambient-1" />
      <div className="pp-ambient pp-ambient-2" />
      <div className="pp-ambient pp-ambient-3" />
      <div className="pp-wrap">
        <ExecutiveSummary model={model} />
        <FullFunnelSummary model={model} />
        <AwarenessSection model={model} />
        <AudienceSection model={model} />
        <LeadGenerationSection model={model} />
        <WebsiteTrafficSection model={model} />
        <RevenueBookingsSection model={model} />
      </div>
    </div>
  );
}
