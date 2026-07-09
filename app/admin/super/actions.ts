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

function generateCandidateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
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
  const existingLocalParts = new Set(
    usersPage.users.map((user) => (user.email || "").slice(0, (user.email || "").indexOf("@")))
  );

  let code: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generateCandidateCode();
    if (!existingLocalParts.has(candidate)) {
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
