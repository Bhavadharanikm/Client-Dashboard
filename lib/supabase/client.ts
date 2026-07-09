import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser Supabase client. Not used for the bootstrap data fetch (that happens
 * server-side, see lib/server/data.ts) — reserved for any future client-only
 * interaction that genuinely needs it.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
