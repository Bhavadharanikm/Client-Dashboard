import { getAdminDashboardSession } from "@/lib/server/session";
import { loadDashboardBootstrap } from "@/lib/server/dashboard-data";
import { DashboardProvider } from "@/hooks/useDashboardState";
import { DashboardDataProvider } from "@/hooks/useDashboardData";
import { DashboardShell } from "@/components/shell/DashboardShell";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; month?: string }>;
}) {
  const session = await getAdminDashboardSession();
  const params = await searchParams;

  const bootstrap = await loadDashboardBootstrap({
    isAdmin: true,
    clientSlug: null,
    requestedClient: params.client,
    requestedMonth: params.month,
  });

  return (
    <DashboardDataProvider
      workbook={bootstrap.workbook}
      roiAnalysis={bootstrap.roiAnalysis}
      metaAnalysis={bootstrap.metaAnalysis}
      pricingToolData={bootstrap.pricingToolData}
    >
      <DashboardProvider
        availableClients={bootstrap.availableClients}
        isAdmin={true}
        isSuperAdmin={session.isSuperAdmin}
        initialClientSlug={bootstrap.initialClientSlug}
        initialMonth={bootstrap.initialMonth}
      >
        <DashboardShell />
      </DashboardProvider>
    </DashboardDataProvider>
  );
}
