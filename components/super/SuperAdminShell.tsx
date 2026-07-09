"use client";

import { useState } from "react";
import type { ClientDirectoryRow } from "@/lib/server/admin-clients";
import type { PerformanceWorkbook } from "@/lib/roi-model";
import { ClientsTable } from "@/components/super/ClientsTable";
import { CreateClientForm } from "@/components/super/CreateClientForm";
import { SheetSyncPanel } from "@/components/super/SheetSyncPanel";

type Tab = "client" | "data";

export function SuperAdminShell({
  directory,
  workbook,
}: {
  directory: ClientDirectoryRow[];
  workbook: PerformanceWorkbook;
}) {
  const [tab, setTab] = useState<Tab>("client");

  return (
    <div className="super-admin-shell">
      <header className="super-admin-header">
        <h1>Super Admin</h1>
        <a href="/admin/dashboard" className="super-admin-back-link">
          &larr; Back to dashboard
        </a>
      </header>

      <div className="super-admin-tabs">
        <button
          type="button"
          className={`super-admin-tab${tab === "client" ? " active" : ""}`}
          onClick={() => setTab("client")}
        >
          Client
        </button>
        <button
          type="button"
          className={`super-admin-tab${tab === "data" ? " active" : ""}`}
          onClick={() => setTab("data")}
        >
          Data
        </button>
      </div>

      {tab === "client" && (
        <>
          <section>
            <h2>Create Client Login</h2>
            <CreateClientForm />
          </section>
          <section>
            <h2>Client Directory</h2>
            <ClientsTable directory={directory} />
          </section>
        </>
      )}

      {tab === "data" && (
        <section>
          <h2>Google Sheets Sync</h2>
          <SheetSyncPanel directory={directory} workbook={workbook} />
        </section>
      )}
    </div>
  );
}
