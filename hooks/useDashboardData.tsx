"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PerformanceWorkbook } from "@/lib/roi-model";
import type { MetaAnalysis, RoiAnalysis } from "@/lib/server/data";

/**
 * Immutable server-fetched data blobs, populated once from app/dashboard/page.tsx's
 * Server Component fetch — mirrors bootstrap()'s Promise.all in the original app,
 * which fetches everything once and never refetches on client/month changes.
 * Selection state (which client/month is active) lives in useDashboardState instead;
 * this context only holds the data those selections index into.
 */
type DashboardData = {
  workbook: PerformanceWorkbook;
  roiAnalysis: RoiAnalysis;
  metaAnalysis: MetaAnalysis;
  /** Not consumed until Phase 6 (Pricing Tool) — threaded through now so page.tsx doesn't need to change again later. */
  pricingToolData: unknown | null;
};

const DashboardDataContext = createContext<DashboardData | null>(null);

export function DashboardDataProvider({
  children,
  workbook,
  roiAnalysis,
  metaAnalysis,
  pricingToolData,
}: {
  children: ReactNode;
} & DashboardData) {
  return (
    <DashboardDataContext.Provider value={{ workbook, roiAnalysis, metaAnalysis, pricingToolData }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error("useDashboardData must be used within a DashboardDataProvider");
  return context;
}
