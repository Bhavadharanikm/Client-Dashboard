import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/server/admin-identity";

export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(isAdminEmail(user.email) ? "/admin/dashboard" : "/dashboard");
}
