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
  const { availableClients, selectedClientSlug, selectedMonth } = useDashboardState();
  const { workbook, roiAnalysis } = useDashboardData();

  const client = availableClients.find((c) => c.slug === selectedClientSlug) || null;

  const model = useMemo(
    () => buildRoiViewModel(workbook, roiAnalysis, client?.name || "", selectedClientSlug, selectedMonth),
    [workbook, roiAnalysis, client?.name, selectedClientSlug, selectedMonth]
  );

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
