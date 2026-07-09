import { getSuperAdminSession } from "@/lib/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchPerformanceWorkbook } from "@/lib/server/data";
import { getClientDirectory } from "@/lib/server/admin-clients";
import { SuperAdminShell } from "@/components/super/SuperAdminShell";

export default async function SuperAdminPage() {
  await getSuperAdminSession();

  const supabase = await createServerSupabaseClient();
  const workbook = await fetchPerformanceWorkbook(supabase);
  const directory = await getClientDirectory(workbook.clients);

  return <SuperAdminShell directory={directory} workbook={workbook} />;
}
