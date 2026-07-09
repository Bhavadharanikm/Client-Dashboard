import { getDashboardSession } from "@/lib/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchMetaAnalysis,
  fetchMetaRowsFromSupabase,
  fetchPerformanceWorkbook,
  fetchPricingToolData,
  fetchRoiAnalysis,
} from "@/lib/server/data";
import { getClientMonthBounds, type PerformanceWorkbook } from "@/lib/roi-model";
import { getClientAccessCodes } from "@/lib/server/admin-clients";
import { DASHBOARD_CONFIG } from "@/lib/config";
import { DashboardProvider } from "@/hooks/useDashboardState";
import { DashboardDataProvider } from "@/hooks/useDashboardData";
import { DashboardShell } from "@/components/shell/DashboardShell";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; month?: string }>;
}) {
  const session = await getDashboardSession();
  const supabase = await createServerSupabaseClient();
  const params = await searchParams;

  // Bootstrap fetch: everything the session can see, loaded once. Client/month
  // filtering happens entirely client-side afterward (see useDashboardState) —
  // this mirrors the original app's bootstrap() Promise.all + no-refetch-on-Apply
  // behavior. roi_analysis/meta_analysis are fetched here but not yet consumed —
  // that lands with the ROI/Meta views in Phase 4/5.
  const [workbook, metaRowsByClientSlug, roiAnalysis, metaAnalysis, pricingToolData] = await Promise.all([
    fetchPerformanceWorkbook(supabase),
    fetchMetaRowsFromSupabase(supabase),
    fetchRoiAnalysis(supabase),
    fetchMetaAnalysis(supabase),
    fetchPricingToolData(),
  ]);

  const mergedWorkbook: PerformanceWorkbook = Object.keys(metaRowsByClientSlug).length
    ? { ...workbook, metaRowsByClientSlug }
    : workbook;

  let availableClients = mergedWorkbook.clients;
  if (!session.isAdmin && session.clientSlug) {
    availableClients = availableClients.filter((client) => client.slug === session.clientSlug);
  } else if (session.isAdmin) {
    // Only admins ever see access codes — this is the one place that privileged
    // lookup is used, and it's skipped entirely for regular client sessions.
    const codesByClientSlug = await getClientAccessCodes();
    availableClients = availableClients.map((client) => ({
      ...client,
      code: codesByClientSlug[client.slug],
    }));
  }

  const defaultMonth = DASHBOARD_CONFIG.defaults.month || DASHBOARD_CONFIG.defaults.to;

  const initialClientSlug = session.isAdmin
    ? params.client && availableClients.some((c) => c.slug === params.client)
      ? params.client
      : availableClients.some((c) => c.slug === DASHBOARD_CONFIG.defaults.client)
        ? DASHBOARD_CONFIG.defaults.client
        : availableClients[0]?.slug ?? ""
    : session.clientSlug ?? availableClients[0]?.slug ?? "";

  const bounds = getClientMonthBounds(mergedWorkbook, initialClientSlug);
  const initialMonth = session.isAdmin ? params.month || defaultMonth : bounds.max || defaultMonth;

  return (
    <DashboardDataProvider
      workbook={mergedWorkbook}
      roiAnalysis={roiAnalysis}
      metaAnalysis={metaAnalysis}
      pricingToolData={pricingToolData}
    >
      <DashboardProvider
        availableClients={availableClients}
        isAdmin={session.isAdmin}
        initialClientSlug={initialClientSlug}
        initialMonth={initialMonth}
      >
        <DashboardShell />
      </DashboardProvider>
    </DashboardDataProvider>
  );
}
