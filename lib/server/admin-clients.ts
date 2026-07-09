import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { isAdminEmail } from "@/lib/server/admin-identity";
import { canonicalizeClientSlug } from "@/lib/client-slug";

/**
 * Client access codes aren't stored as retrievable plaintext anywhere — a
 * code IS the Supabase Auth password for that client's {code}@hiddengem.media
 * account, and Supabase never returns a password once set. But the code is
 * also the email's local part, which the Admin API can list. So codes are
 * derived from auth.users emails, not a password or a stored-code column.
 *
 * Returns { [clientSlug]: code }. Never throws — returns {} on any failure
 * (missing service role key, network error, unexpected schema) so a broken
 * admin-only enhancement can't take down the whole dashboard for anyone.
 */
export async function getClientAccessCodes(): Promise<Record<string, string>> {
  try {
    const supabaseAdmin = createAdminSupabaseClient();

    const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersError || !usersPage) {
      return {};
    }

    const codeByUserId = new Map<string, string>();
    for (const user of usersPage.users) {
      const email = user.email || "";
      if (!email.endsWith("@hiddengem.media") || isAdminEmail(email)) {
        continue;
      }
      codeByUserId.set(user.id, email.slice(0, email.indexOf("@")));
    }
    if (!codeByUserId.size) {
      return {};
    }

    // Assumes the standard Supabase convention: user_profiles.id references
    // auth.users.id 1:1. If this project's profile table uses a different
    // foreign key (e.g. a separate user_id column), adjust the `.select`/
    // match below accordingly — this degrades to an empty map rather than
    // throwing if the assumption is wrong.
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, client_slug")
      .in("id", Array.from(codeByUserId.keys()));
    if (profilesError || !profiles) {
      return {};
    }

    const codeByClientSlug: Record<string, string> = {};
    for (const profile of profiles) {
      const code = codeByUserId.get(profile.id);
      if (code && profile.client_slug) {
        // Canonicalized to match the slugs on workbook.clients (see
        // normalizePerformanceWorkbook), which is what this map gets
        // cross-referenced against in app/dashboard/page.tsx.
        codeByClientSlug[canonicalizeClientSlug(profile.client_slug)] = code;
      }
    }
    return codeByClientSlug;
  } catch {
    return {};
  }
}
