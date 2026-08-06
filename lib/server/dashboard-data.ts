import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchMetaAnalysis,
  fetchMetaRowsFromSupabase,
  fetchPerformanceWorkbook,
  fetchPricingToolData,
  fetchRoiAnalysis,
  type MetaAnalysis,
  type RoiAnalysis,
} from "@/lib/server/data";
import { getClientAccessCodes } from "@/lib/server/admin-clients";
import { getClientMonthBounds, type Client, type PerformanceWorkbook } from "@/lib/roi-model";
import { DASHBOARD_CONFIG } from "@/lib/config";

export type DashboardBootstrap = {
  workbook: PerformanceWorkbook;
  roiAnalysis: RoiAnalysis;
  metaAnalysis: MetaAnalysis;
  pricingToolData: unknown;
  availableClients: Client[];
  initialClientSlug: string;
  initialMonth: string;
};

/**
 * The shared bootstrap fetch used by both /dashboard (client sessions) and
 * /admin/dashboard (admin sessions) — everything the session can see, loaded
 * once. Client/month filtering happens entirely client-side afterward (see
 * useDashboardState), mirroring the original app's bootstrap() Promise.all +
 * no-refetch-on-Apply behavior.
 */
export async function loadDashboardBootstrap({
  isAdmin,
  clientSlug,
  requestedClient,
  requestedMonth,
}: {
  isAdmin: boolean;
  /** The signed-in client's own slug — ignored when isAdmin is true. */
  clientSlug: string | null;
  /** ?client= query param — only ever honored for admin sessions. */
  requestedClient?: string;
  /** ?month= query param — only ever honored for admin sessions. */
  requestedMonth?: string;
}): Promise<DashboardBootstrap> {
  const supabase = await createServerSupabaseClient();

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
  if (isAdmin) {
    // Only admins ever see access codes — this privileged lookup is skipped
    // entirely for regular client sessions.
    const codesByClientSlug = await getClientAccessCodes();
    availableClients = availableClients.map((client) => ({
      ...client,
      code: codesByClientSlug[client.slug],
    }));
  } else if (clientSlug) {
    availableClients = availableClients.filter((client) => client.slug === clientSlug);
  }

  const defaultMonth = DASHBOARD_CONFIG.defaults.month || DASHBOARD_CONFIG.defaults.to;

  const initialClientSlug = isAdmin
    ? requestedClient && availableClients.some((c) => c.slug === requestedClient)
      ? requestedClient
      : availableClients.some((c) => c.slug === DASHBOARD_CONFIG.defaults.client)
        ? DASHBOARD_CONFIG.defaults.client
        : availableClients[0]?.slug ?? ""
    : clientSlug ?? availableClients[0]?.slug ?? "";

  const bounds = getClientMonthBounds(mergedWorkbook, initialClientSlug);
  // Admin used to fall back to the hardcoded config default (defaults.to,
  // e.g. "2026-03") whenever no ?month= was requested, which goes stale the
  // moment new months are synced in. Falling back to bounds.max — the
  // selected client's own latest available month — matches what the client
  // side already does, so admin opens on the most recent real data too.
  const initialMonth = isAdmin ? requestedMonth || bounds.max || defaultMonth : bounds.max || defaultMonth;

  return {
    workbook: mergedWorkbook,
    roiAnalysis,
    metaAnalysis,
    pricingToolData,
    availableClients,
    initialClientSlug,
    initialMonth,
  };
}
