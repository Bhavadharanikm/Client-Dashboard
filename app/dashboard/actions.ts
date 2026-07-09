"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL } from "@/lib/server/admin-identity";

export async function logout() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const wasAdmin = user?.email === ADMIN_EMAIL;

  await supabase.auth.signOut();
  redirect(wasAdmin ? "/admin/login" : "/login");
}
