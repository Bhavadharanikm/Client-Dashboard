import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

/**
 * Per-key login attempt throttle, backed by the login_attempts table so it
 * holds across serverless cold starts and concurrent instances — an
 * in-memory Map (the previous implementation) gives each instance its own
 * private counter, which doesn't actually stop a distributed brute force.
 * Uses the service-role client deliberately: this table has RLS enabled
 * with zero policies (see the login_attempts migration), so the anon-key
 * client the login actions otherwise use has no access to it at all.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function checkAndRecordLoginAttempt(key: string): Promise<{ allowed: boolean }> {
  const supabase = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart);

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  // Best-effort — a failed insert (rare) should not itself block a login
  // attempt that would otherwise be allowed.
  await supabase.from("login_attempts").insert({ key });
  return { allowed: true };
}
