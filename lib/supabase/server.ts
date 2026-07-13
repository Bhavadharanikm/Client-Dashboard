import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Reads/writes the auth session via httpOnly cookies through @supabase/ssr.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          // @supabase/ssr's default cookie options don't set httpOnly (it
          // supports browser clients that need JS to read the cookie) — this
          // app never uses createBrowserSupabaseClient, so force it here to
          // keep the session token out of document.cookie/XSS reach.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: "lax" });
          });
        } catch {
          // Called from a Server Component render (not a Server Action/Route Handler) —
          // cookies() is read-only there. Middleware refreshes the session on every
          // request, so this is safe to ignore.
        }
      },
    },
  });
}
