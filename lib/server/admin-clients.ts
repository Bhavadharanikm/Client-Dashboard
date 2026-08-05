import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { isAdminEmail } from "@/lib/server/admin-identity";
import { CLIENT_ALIASES, canonicalizeClientSlug } from "@/lib/client-slug";
import type { Client } from "@/lib/roi-model";

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
  const accounts = await getClientAccountsByClientSlug();
  const codeByClientSlug: Record<string, string> = {};
  for (const [slug, account] of Object.entries(accounts)) {
    codeByClientSlug[slug] = account.code;
  }
  return codeByClientSlug;
}

export type ClientAccountInfo = { code: string; userId: string };

/**
 * Same underlying lookup as getClientAccessCodes(), but also carries each
 * account's auth.users id — needed by the Super Admin UI to target a delete
 * action unambiguously (slugs alone aren't a safe delete key, since a
 * codeless slug has no account to delete). Never throws — returns {} on any
 * failure, same failure philosophy as getClientAccessCodes().
 */
export async function getClientAccountsByClientSlug(): Promise<Record<string, ClientAccountInfo>> {
  try {
    const supabaseAdmin = createAdminSupabaseClient();

    const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (usersError || !usersPage) {
      return {};
    }

    const accountByUserId = new Map<string, { code: string; userId: string }>();
    for (const user of usersPage.users) {
      const email = user.email || "";
      if (!email.endsWith("@hiddengem.media") || isAdminEmail(email)) {
        continue;
      }
      // Supabase always stores email lowercase, but access codes are
      // generated/communicated to clients with uppercase letters (see
      // generateCandidateCode in app/admin/super/actions.ts) — uppercase here
      // purely for display so this matches what the client was actually given.
      accountByUserId.set(user.id, { code: email.slice(0, email.indexOf("@")).toUpperCase(), userId: user.id });
    }
    if (!accountByUserId.size) {
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
      .in("id", Array.from(accountByUserId.keys()));
    if (profilesError || !profiles) {
      return {};
    }

    const accountByClientSlug: Record<string, ClientAccountInfo> = {};
    for (const profile of profiles) {
      const account = accountByUserId.get(profile.id);
      if (account && profile.client_slug) {
        // Canonicalized to match the slugs on workbook.clients (see
        // normalizePerformanceWorkbook), which is what this map gets
        // cross-referenced against in app/dashboard/page.tsx.
        accountByClientSlug[canonicalizeClientSlug(profile.client_slug)] = account;
      }
    }
    return accountByClientSlug;
  } catch {
    return {};
  }
}

export type ClientDirectoryRow = {
  slug: string;
  name: string;
  /** Other raw slugs merged into this canonical one, if any (see CLIENT_ALIASES). */
  aliasSlugs: string[];
  code?: string;
  userId?: string;
};

/**
 * The Super Admin client directory: name/slug/alias/code in one place, with
 * codeless clients sorted last (they can't log in yet — worth surfacing
 * clearly rather than mixing them in alphabetically).
 */
export async function getClientDirectory(clients: Client[]): Promise<ClientDirectoryRow[]> {
  const accountsByClientSlug = await getClientAccountsByClientSlug();

  const rows: ClientDirectoryRow[] = clients.map((client) => {
    const aliasSlugs = (CLIENT_ALIASES[client.slug] || []).filter((slug) => slug !== client.slug);
    const account = accountsByClientSlug[client.slug];
    return {
      slug: client.slug,
      name: client.name,
      aliasSlugs,
      code: account?.code,
      userId: account?.userId,
    };
  });

  return rows.sort((a, b) => {
    if (!!a.code !== !!b.code) {
      return a.code ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
