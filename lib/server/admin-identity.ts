/** Single source of truth for which Supabase accounts are admin/super-admin accounts. */
export const SUPER_ADMIN_EMAILS = ["pooja@hiddengem.media"];
export const ADMIN_EMAILS = ["hello@hiddengem.media", ...SUPER_ADMIN_EMAILS];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && SUPER_ADMIN_EMAILS.includes(email);
}
