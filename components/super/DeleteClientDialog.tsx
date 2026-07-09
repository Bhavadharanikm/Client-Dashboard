"use client";

import { useActionState, useState } from "react";
import { deleteClientAccount, type ClientActionState } from "@/app/admin/super/actions";

const initialState: ClientActionState = {};

export function DeleteClientDialog({ slug, code, userId }: { slug: string; code: string; userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, isPending] = useActionState(deleteClientAccount, initialState);

  if (state.success) {
    return <span className="super-admin-muted">Login removed</span>;
  }

  if (!confirming) {
    return (
      <button type="button" className="super-admin-delete-btn" onClick={() => setConfirming(true)}>
        Delete login
      </button>
    );
  }

  return (
    <div className="super-admin-delete-confirm">
      <p>
        Removes login for <code>{code}@hiddengem.media</code>.
      </p>
      <p>
        Does <strong>not</strong> delete <code>{slug}</code>&apos;s analytics data — a new login can be linked to it
        later.
      </p>
      <form action={formAction} className="super-admin-delete-actions">
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={isPending} className="super-admin-delete-confirm-btn">
          {isPending ? "Deleting..." : "Confirm delete"}
        </button>
        <button type="button" className="super-admin-cancel-btn" onClick={() => setConfirming(false)} disabled={isPending}>
          Cancel
        </button>
      </form>
      {state.error ? <p className="super-admin-error">{state.error}</p> : null}
    </div>
  );
}
