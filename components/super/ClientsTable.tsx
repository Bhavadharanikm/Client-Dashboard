"use client";

import type { ClientDirectoryRow } from "@/lib/server/admin-clients";
import { DeleteClientDialog } from "@/components/super/DeleteClientDialog";
import { CreateAccessCodeButton } from "@/components/super/CreateAccessCodeButton";

export function ClientsTable({ directory }: { directory: ClientDirectoryRow[] }) {
  if (!directory.length) {
    return <p className="super-admin-empty">No clients found.</p>;
  }

  return (
    <div className="super-admin-table-wrap">
      <table className="super-admin-table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Client Slug</th>
            <th>Alias Slug</th>
            <th>Access Code</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {directory.map((row) => (
            <tr key={row.slug} className={row.code ? "" : "super-admin-row-codeless"}>
              <td>{row.name}</td>
              <td>
                <code>{row.slug}</code>
              </td>
              <td>
                {row.aliasSlugs.length ? (
                  row.aliasSlugs.map((alias) => <code key={alias}>{alias}</code>)
                ) : (
                  <span className="super-admin-muted">—</span>
                )}
              </td>
              <td>
                {row.code ? (
                  <code>{row.code}</code>
                ) : (
                  <span className="super-admin-badge super-admin-badge-warn">No login</span>
                )}
              </td>
              <td>
                {row.code && row.userId ? (
                  <DeleteClientDialog slug={row.slug} code={row.code} userId={row.userId} />
                ) : (
                  <CreateAccessCodeButton slug={row.slug} name={row.name} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
