"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/server/admin-identity";

export async function logout() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const wasAdmin = isAdminEmail(user?.email);

  await supabase.auth.signOut();
  redirect(wasAdmin ? "/admin/login" : "/login");
}
