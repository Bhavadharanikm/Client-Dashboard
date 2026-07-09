import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLIENT_DISPLAY_NAMES,
  normalizePerformanceWorkbook,
  titleCaseSlug,
  type Client,
  type PerformanceRow,
  type PerformanceWorkbook,
} from "@/lib/roi-model";
import { canonicalizeClientSlug } from "@/lib/client-slug";

export async function fetchPerformanceWorkbook(supabase: SupabaseClient): Promise<PerformanceWorkbook> {
  const { data, error } = await supabase
    .from("dashboard_performance")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error || !data) {
    return normalizePerformanceWorkbook({ clients: [], rowsByClientSlug: {}, metaRowsByClientSlug: {} });
  }

  const rowsByClientSlug: Record<string, PerformanceRow[]> = {};
  (data as PerformanceRow[]).forEach((row) => {
    const slug = canonicalizeClientSlug(row.client_slug);
    if (!rowsByClientSlug[slug]) rowsByClientSlug[slug] = [];
    rowsByClientSlug[slug].push(row);
  });

  const seen = new Set<string>();
  const clients: Client[] = Object.keys(rowsByClientSlug)
    .map((slug) => ({ slug, name: CLIENT_DISPLAY_NAMES[slug] || titleCaseSlug(slug) }))
    .filter((client) => (seen.has(client.slug) ? false : (seen.add(client.slug), true)));

  return normalizePerformanceWorkbook({ clients, rowsByClientSlug, metaRowsByClientSlug: {} });
}

/** Raw client_slug-keyed (NOT canonicalized) — see normalizePerformanceWorkbook's docstring. */
export async function fetchMetaRowsFromSupabase(
  supabase: SupabaseClient
): Promise<Record<string, PerformanceRow[]>> {
  const { data, error } = await supabase
    .from("dashboard_meta_ads")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  if (error || !data) return {};

  const metaRowsByClientSlug: Record<string, PerformanceRow[]> = {};
  (data as PerformanceRow[]).forEach((row) => {
    const slug = row.client_slug;
    if (!metaRowsByClientSlug[slug]) metaRowsByClientSlug[slug] = [];
    metaRowsByClientSlug[slug].push(row);
  });
  return metaRowsByClientSlug;
}

export type RoiAnalysisPeriod = { range_label: string; key_takeaways: string[] };
export type RoiAnalysis = Record<string, { roi: Record<string, RoiAnalysisPeriod> }>;

export async function fetchRoiAnalysis(supabase: SupabaseClient): Promise<RoiAnalysis> {
  const { data, error } = await supabase
    .from("roi_analysis")
    .select("client_slug,period_key,range_label,key_takeaways");
  if (error || !data) return {};

  const result: RoiAnalysis = {};
  for (const row of data) {
    if (!result[row.client_slug]) result[row.client_slug] = { roi: {} };
    result[row.client_slug].roi[row.period_key] = {
      range_label: row.range_label || "",
      key_takeaways: row.key_takeaways || [],
    };
  }
  return result;
}

export type MetaAnalysisPeriod = {
  range_label: string;
  discovery_key_takeaways: string[];
  retargeting_key_takeaways: string[];
  performance_insights: string[];
  performance_overview: string[];
};
export type MetaAnalysis = Record<string, { meta: Record<string, MetaAnalysisPeriod> }>;

export async function fetchMetaAnalysis(supabase: SupabaseClient): Promise<MetaAnalysis> {
  const { data, error } = await supabase
    .from("meta_analysis")
    .select(
      "client_slug,period_key,range_label,discovery_key_takeaways,retargeting_key_takeaways,performance_insights,performance_overview"
    );
  if (error || !data) return {};

  const result: MetaAnalysis = {};
  for (const row of data) {
    if (!result[row.client_slug]) result[row.client_slug] = { meta: {} };
    result[row.client_slug].meta[row.period_key] = {
      range_label: row.range_label,
      discovery_key_takeaways: row.discovery_key_takeaways || [],
      retargeting_key_takeaways: row.retargeting_key_takeaways || [],
      performance_insights: row.performance_insights || [],
      performance_overview: row.performance_overview || [],
    };
  }
  return result;
}

/**
 * Static JSON dataset (not Supabase). Returns null if the file isn't present —
 * this checkout has no seed data for it yet; the Pricing Tool view (Phase 6)
 * handles the null case as an empty state, same as the original app does when
 * the fetch fails.
 */
export async function fetchPricingToolData(): Promise<unknown | null> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), "public", "pricing-tool-data.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
