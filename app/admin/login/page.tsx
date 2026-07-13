import { AdminLoginForm } from "@/components/shell/AdminLoginForm";

// Auth pages must never be statically cached/shared — see next.config.ts's
// matching Cache-Control override for the HTTP-level enforcement.
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="auth-locked">
      <AdminLoginForm />
    </div>
  );
}
