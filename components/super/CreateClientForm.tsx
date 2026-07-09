"use client";

import { useActionState } from "react";
import { createClientAccount, type ClientActionState } from "@/app/admin/super/actions";

const initialState: ClientActionState = {};

export function CreateClientForm() {
  const [state, formAction, isPending] = useActionState(createClientAccount, initialState);

  return (
    <div className="super-admin-table-wrap super-admin-create-card">
      <form action={formAction} className="super-admin-create-form">
        <div className="super-admin-field-group">
          <label htmlFor="clientName" className="super-admin-field-label">
            Client name
          </label>
          <input
            id="clientName"
            name="clientName"
            type="text"
            required
            placeholder="e.g. Apple Mountain Resort"
            className="super-admin-input"
          />
        </div>
        <div className="super-admin-field-group">
          <label htmlFor="clientSlugOverride" className="super-admin-field-label">
            Custom slug (optional)
          </label>
          <input
            id="clientSlugOverride"
            name="clientSlugOverride"
            type="text"
            placeholder="Auto-derived from name if left blank"
            className="super-admin-input"
          />
        </div>
        <button type="submit" disabled={isPending} className="super-admin-submit-btn">
          {isPending ? "Creating..." : "Create Login"}
        </button>
      </form>

      {state.error ? <p className="super-admin-error">{state.error}</p> : null}

      {state.success && state.code ? (
        <div className="super-admin-success-code">
          <p className="super-admin-success-code-label">
            Login created for <code>{state.slug}</code> — shown once, save it now:
          </p>
          <p className="super-admin-success-code-value">{state.code}</p>
          <p className="super-admin-success-code-email">
            {state.code}@hiddengem.media
          </p>
        </div>
      ) : null}
    </div>
  );
}
