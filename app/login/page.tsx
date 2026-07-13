import { AccessGate } from "@/components/shell/AccessGate";

// Auth pages must never be statically cached/shared — see next.config.ts's
// matching Cache-Control override for the HTTP-level enforcement.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="auth-locked">
      <AccessGate />
    </div>
  );
}
