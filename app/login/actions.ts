"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAndRecordLoginAttempt } from "@/lib/server/rate-limit";
import { normalizeAccessCode } from "@/lib/client-slug";

export type AccessCodeState = { error: string | null };

const GENERIC_ERROR = "That access code was not recognized.";

export async function submitAccessCode(
  _prevState: AccessCodeState,
  formData: FormData
): Promise<AccessCodeState> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const { allowed } = checkAndRecordLoginAttempt(ip);
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const code = normalizeAccessCode(formData.get("code"));
  if (code.length < 4) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: `${code}@hiddengem.media`,
    password: code,
  });
  if (error) {
    return { error: GENERIC_ERROR };
  }

  redirect("/dashboard");
}
