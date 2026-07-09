import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canonicalizeClientSlug } from "@/lib/client-slug";
import { isAdminEmail } from "@/lib/server/admin-identity";

export type DashboardSession = {
  isAdmin: boolean;
  /** null for admins — they choose a client via the sidebar, not via their own account */
  clientSlug: string | null;
};

async function resolveSession(): Promise<{ isAuthenticated: boolean; isAdmin: boolean; clientSlug: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAuthenticated: false, isAdmin: false, clientSlug: null };
  }

  const isAdmin = isAdminEmail(user.email);
  if (isAdmin) {
    return { isAuthenticated: true, isAdmin: true, clientSlug: null };
  }

  const { data: profile } = await supabase.from("user_profiles").select("client_slug").single();
  const clientSlug = canonicalizeClientSlug(profile?.client_slug ?? "");
  return { isAuthenticated: true, isAdmin: false, clientSlug };
}

/**
 * Guards /dashboard — the client-facing route. Resolves who's logged in from
 * the server-verified session only — never from a URL param. middleware.ts
 * already guarantees a user exists for any request that reaches here; this
 * additionally keeps admin sessions off this route entirely (they belong on
 * /admin/dashboard, a visually and structurally separate area).
 */
export async function getDashboardSession(): Promise<DashboardSession> {
  const { isAuthenticated, isAdmin, clientSlug } = await resolveSession();

  if (!isAuthenticated) {
    redirect("/login");
  }
  if (isAdmin) {
    redirect("/admin/dashboard");
  }

  return { isAdmin: false, clientSlug };
}

/**
 * Guards /admin/dashboard — the admin-only route. A client with a valid
 * session gets bounced to their own /dashboard rather than shown anything
 * admin-shaped, even transiently; an unauthenticated visitor goes to the
 * admin login page, not the client one.
 */
export async function getAdminDashboardSession(): Promise<DashboardSession> {
  const { isAuthenticated, isAdmin } = await resolveSession();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return { isAdmin: true, clientSlug: null };
}
