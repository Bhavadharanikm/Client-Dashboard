import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canonicalizeClientSlug } from "@/lib/client-slug";
import { ADMIN_EMAIL } from "@/lib/server/admin-identity";

export type DashboardSession = {
  isAdmin: boolean;
  /** null for admins — they choose a client via the sidebar, not via their own account */
  clientSlug: string | null;
};

/**
 * Resolves who's logged in from the server-verified session only — never from
 * a URL param. middleware.ts already guarantees a user exists for any request
 * that reaches a /dashboard route; this just classifies admin vs. client and,
 * for non-admins, looks up their client_slug (RLS-scoped to their own row).
 */
export async function getDashboardSession(): Promise<DashboardSession> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  if (isAdmin) {
    return { isAdmin: true, clientSlug: null };
  }

  const { data: profile } = await supabase.from("user_profiles").select("client_slug").single();
  const clientSlug = canonicalizeClientSlug(profile?.client_slug ?? "");
  return { isAdmin: false, clientSlug };
}
