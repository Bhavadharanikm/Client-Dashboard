"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAndRecordLoginAttempt } from "@/lib/server/rate-limit";
import { isAdminEmail } from "@/lib/server/admin-identity";

export type AdminLoginState = { error: string | null };

const GENERIC_ERROR = "Invalid email or password.";

export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Shares the same rate limiter (keyed by IP) as the client login flow —
  // separate call site, same throttle behavior.
  const { allowed } = await checkAndRecordLoginAttempt(`admin:${ip}`);
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: GENERIC_ERROR };
  }

  // Critical check: this form must never grant admin access to anyone but a
  // real admin account, even though Supabase will happily authenticate ANY
  // valid credential pair typed in here — including a client's own
  // {code}@hiddengem.media / {code} login. If the authenticated user isn't an
  // admin account, undo the sign-in immediately and reject.
  if (!isAdminEmail(data.user.email)) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  redirect("/admin/dashboard");
}
