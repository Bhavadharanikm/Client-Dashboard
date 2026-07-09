/** Single source of truth for which Supabase accounts are admin accounts. */
export const ADMIN_EMAILS = ["admin@hiddengem.media", "superadmin@hiddengem.media"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
