"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdminSession } from "@/lib/server/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { isAdminEmail } from "@/lib/server/admin-identity";
import { slugify } from "@/lib/client-slug";

export type ClientActionState = {
  error?: string;
  success?: boolean;
  code?: string;
  slug?: string;
  partialSuccess?: boolean;
};

const EMAIL_DOMAIN = "hiddengem.media";
const MAX_CODE_ATTEMPTS = 10;

// 8 random digits + the client name's first 3 letters, spliced in at a
// random position among the digits (not fixed to the start or end) — e.g.
// Flohom -> "56FLO864235", Paradise Pointe -> "87354322PAR". 11 characters
// total, mixing digits and letters, is a large jump from the original
// 5-digit-only codes (100,000 combinations) and even the later 8-digit-only
// ones (10,000,000). Existing clients keep whatever code they already have;
// only newly created accounts get this format. Login (AccessGate.tsx,
// normalizeAccessCode) accepts any of the three formats side by side.
function generateCandidateCode(clientName: string): string {
  const letters = clientName
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  const insertAt = Math.floor(Math.random() * 9); // 0..8 inclusive — before, between, or after all 8 digits
  return digits.slice(0, insertAt) + letters + digits.slice(insertAt);
}

/**
 * Creates a brand-new client login: a 5-digit code that becomes both the
 * local-part of a {code}@hiddengem.media Supabase Auth account and that
 * account's password, plus a user_profiles row linking it to a client_slug.
 */
export async function createClientAccount(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  // Server Actions are independently network-reachable regardless of which
  // page rendered the calling form — re-verify here even though the UI only
  // ever renders this form on the already-gated /admin/super page.
  await getSuperAdminSession();

  const clientName = String(formData.get("clientName") || "").trim();
  if (!clientName) {
    return { error: "Client name is required." };
  }

  const clientSlugOverride = String(formData.get("clientSlugOverride") || "").trim();
  const derivedSlug = clientSlugOverride ? slugify(clientSlugOverride) : slugify(clientName);
  if (!derivedSlug) {
    return { error: "Could not derive a valid slug from the input given." };
  }

  const supabaseAdmin = createAdminSupabaseClient();

  const { data: existingProfiles, error: existingProfilesError } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("client_slug", derivedSlug)
    .limit(1);
  if (existingProfilesError) {
    return { error: `Could not verify slug availability: ${existingProfilesError.message}` };
  }
  if (existingProfiles && existingProfiles.length > 0) {
    return { error: `A login for slug '${derivedSlug}' already exists.` };
  }

  const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (usersError || !usersPage) {
    return { error: `Could not list existing accounts: ${usersError?.message || "unknown error"}` };
  }
  // Supabase normalizes stored emails to lowercase, but the generated code
  // (and the password it becomes) keeps its original uppercase letters —
  // lowercase the comparison side only, not the candidate itself.
  const existingLocalParts = new Set(
    usersPage.users.map((user) => (user.email || "").slice(0, (user.email || "").indexOf("@")).toLowerCase())
  );

  let code: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateCandidateCode(clientName);
    if (!existingLocalParts.has(candidate.toLowerCase())) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return { error: "Could not generate a unique access code after multiple attempts. Please try again." };
  }

  const email = `${code}@${EMAIL_DOMAIN}`;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    return { error: `Could not create account: ${createError?.message || "unknown error"}` };
  }

  const { error: profileError } = await supabaseAdmin.from("user_profiles").insert({
    id: created.user.id,
    client_slug: derivedSlug,
    pricing_api_key: null,
  });
  if (profileError) {
    return {
      error: `Account created (code ${code}) but the profile link failed — client can log in but won't appear in the dashboard yet. Contact support or retry linking manually. (${profileError.message})`,
      partialSuccess: true,
      code,
    };
  }

  revalidatePath("/admin/super");
  revalidatePath("/admin/dashboard");

  return { success: true, code, slug: derivedSlug };
}

/**
 * Deletes a client's login account. Never touches dashboard_performance or
 * dashboard_meta_ads — those are keyed by client_slug text and are fully
 * independent of the auth/profile rows, and that separation is intentional:
 * removing login access must never cascade to delete a client's historical
 * analytics data. Do not "helpfully" add that cascade here.
 */
export async function deleteClientAccount(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  await getSuperAdminSession();

  const userId = String(formData.get("userId") || "").trim();
  if (!userId) {
    return { error: "Missing user id." };
  }

  const supabaseAdmin = createAdminSupabaseClient();

  const { data: userLookup, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (lookupError) {
    // "User not found" here means it's already gone — treat as idempotent
    // success rather than a hard error.
    const message = lookupError.message || "";
    if (/not.?found/i.test(message)) {
      revalidatePath("/admin/super");
      revalidatePath("/admin/dashboard");
      return { success: true };
    }
    return { error: `Could not look up account: ${message}` };
  }

  const targetEmail = userLookup?.user?.email;
  if (isAdminEmail(targetEmail)) {
    // Defense against ever deleting an admin account even if the UI somehow
    // offered it (it shouldn't — admins aren't listed in the client
    // directory — but this action itself must not trust the UI).
    return { error: "Refusing to delete an admin account." };
  }

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteError) {
    const message = deleteError.message || "";
    if (!/not.?found/i.test(message)) {
      return { error: `Could not delete account: ${message}` };
    }
    // Already gone — idempotent success.
  }

  // Intentionally does NOT touch dashboard_performance / dashboard_meta_ads:
  // deleting login access must never delete a client's analytics history.

  revalidatePath("/admin/super");
  revalidatePath("/admin/dashboard");

  return { success: true };
}
