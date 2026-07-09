import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-only, privileged Supabase client using the service role key — this
 * bypasses RLS entirely and can read/write any row in any table, plus call
 * Admin-only APIs like auth.admin.listUsers(). It is NOT the cookie-scoped
 * per-request client used everywhere else in this app (see lib/supabase/server.ts).
 *
 * NEVER import this from a "use client" file or any module reachable from one —
 * doing so would let Next.js inline SUPABASE_SERVICE_ROLE_KEY into a
 * browser-shipped bundle, which would let anyone read/write the entire database.
 * As of this writing, the only caller is lib/server/admin-clients.ts.
 */
export function createAdminSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
