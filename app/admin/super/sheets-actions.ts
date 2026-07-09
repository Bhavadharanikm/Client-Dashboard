"use server";

import { revalidatePath } from "next/cache";
import { getSuperAdminSession } from "@/lib/server/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSheetsClient, GOOGLE_SHEETS_PERFORMANCE_ID, GOOGLE_SHEETS_ADS_ROI_ID } from "@/lib/server/sheets/client";
import { findPerformanceTab, findPerformanceRow, findAdsRoiTabForMonth, findAdsRoiRows } from "@/lib/server/sheets/parsing";
import { mapPerformanceRow, mapAdsRoiRows, type MappedPerformanceRow, type MappedAdsRoiRow } from "@/lib/server/sheets/mapping";

export type SheetKind = "performance" | "ads_roi";

export type SheetFetchResult = {
  error?: string;
  found?: boolean;
  tabUsed?: string;
  otherCandidateTabs?: string[];
  raw?: unknown;
  mapped?: MappedPerformanceRow | MappedAdsRoiRow[];
};

async function fetchAndMap(clientSlug: string, year: number, month: number, sheet: SheetKind): Promise<SheetFetchResult> {
  const sheetsClient = getSheetsClient();

  if (sheet === "performance") {
    const tabTitle = await findPerformanceTab(sheetsClient, GOOGLE_SHEETS_PERFORMANCE_ID, clientSlug);
    if (!tabTitle) {
      return { found: false, error: `No Performance data tab found for client slug '${clientSlug}'.` };
    }
    const row = await findPerformanceRow(sheetsClient, GOOGLE_SHEETS_PERFORMANCE_ID, tabTitle, year, month);
    if (!row) {
      return { found: false, tabUsed: tabTitle, error: `Tab '${tabTitle}' has no row for ${year}-${String(month).padStart(2, "0")}.` };
    }
    return { found: true, tabUsed: tabTitle, raw: row.rowMap, mapped: mapPerformanceRow(row.rowMap, year, month) };
  }

  const tabInfo = await findAdsRoiTabForMonth(sheetsClient, GOOGLE_SHEETS_ADS_ROI_ID, year, month);
  if (!tabInfo) {
    return { found: false, error: `No Ads ROI data tab found for ${year}-${String(month).padStart(2, "0")}.` };
  }
  const rows = await findAdsRoiRows(sheetsClient, GOOGLE_SHEETS_ADS_ROI_ID, tabInfo.chosen, clientSlug);
  if (!rows.length) {
    return {
      found: false,
      tabUsed: tabInfo.chosen,
      otherCandidateTabs: tabInfo.candidates.filter((title) => title !== tabInfo.chosen),
      error: `Tab '${tabInfo.chosen}' has no rows for client slug '${clientSlug}'.`,
    };
  }
  return {
    found: true,
    tabUsed: tabInfo.chosen,
    otherCandidateTabs: tabInfo.candidates.filter((title) => title !== tabInfo.chosen),
    raw: rows,
    mapped: mapAdsRoiRows(rows, year, month),
  };
}

/** Read-only — never writes to Supabase. Lets the operator verify the mapping before committing. */
export async function testFetchSheetRow(
  clientSlug: string,
  year: number,
  month: number,
  sheet: SheetKind
): Promise<SheetFetchResult> {
  await getSuperAdminSession();

  try {
    return await fetchAndMap(clientSlug, year, month, sheet);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error fetching sheet data." };
  }
}

export type SyncResult = { error?: string; success?: boolean; written?: MappedPerformanceRow | MappedAdsRoiRow[] };

/** Fetches the same row(s) as testFetchSheetRow, then upserts into Supabase. */
export async function syncSheetRow(clientSlug: string, year: number, month: number, sheet: SheetKind): Promise<SyncResult> {
  await getSuperAdminSession();

  let result: SheetFetchResult;
  try {
    result = await fetchAndMap(clientSlug, year, month, sheet);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error fetching sheet data." };
  }

  if (!result.found || !result.mapped) {
    return { error: result.error || "Nothing found to sync." };
  }

  const supabase = await createServerSupabaseClient();

  if (sheet === "performance") {
    const mapped = result.mapped as MappedPerformanceRow;
    const { error } = await supabase
      .from("dashboard_performance")
      .upsert({ client_slug: clientSlug, ...mapped }, { onConflict: "client_slug,year,month" });
    if (error) {
      return { error: `Could not write to dashboard_performance: ${error.message}` };
    }
  } else {
    const mapped = result.mapped as MappedAdsRoiRow[];
    const { error } = await supabase
      .from("dashboard_meta_ads")
      .upsert(
        mapped.map((row) => ({ client_slug: clientSlug, ...row })),
        { onConflict: "client_slug,year,month,campaign_type" }
      );
    if (error) {
      return { error: `Could not write to dashboard_meta_ads: ${error.message}` };
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/super");
  return { success: true, written: result.mapped };
}
