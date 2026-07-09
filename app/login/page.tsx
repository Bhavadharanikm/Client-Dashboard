import { AccessGate } from "@/components/shell/AccessGate";

export default function LoginPage() {
  return (
    <div className="auth-locked">
      <AccessGate />
    </div>
  );
}
