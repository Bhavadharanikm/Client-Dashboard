"use client";

import { useActionState } from "react";
import { createClientAccount, type ClientActionState } from "@/app/admin/super/actions";

const initialState: ClientActionState = {};

/**
 * One-click login provisioning for a client row that already exists (has a
 * slug/name from the sheet) but has no auth account yet — skips the manual
 * "type the client name" form since we already know exactly who this is.
 */
export function CreateAccessCodeButton({ slug, name }: { slug: string; name: string }) {
  const [state, formAction, isPending] = useActionState(createClientAccount, initialState);

  if (state.success && state.code) {
    return (
      <div className="super-admin-success-code" style={{ margin: 0, padding: "10px 12px" }}>
        <p className="super-admin-success-code-label">Created — shown once:</p>
        <p className="super-admin-success-code-value" style={{ fontSize: 18 }}>
          {state.code}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="clientName" value={name} />
      <input type="hidden" name="clientSlugOverride" value={slug} />
      <button type="submit" className="super-admin-delete-btn" disabled={isPending} style={{ color: "#2563eb" }}>
        {isPending ? "Creating..." : "Create access code"}
      </button>
      {state.error ? <p className="super-admin-error" style={{ margin: "4px 0 0" }}>{state.error}</p> : null}
    </form>
  );
}
