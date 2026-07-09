// Column-to-field mapping ported from build_roi_row() (Performance data) and
// the meta CampaignAccumulator.as_payload() (Ads ROI data) in
// Main Page/Dashboard/scripts/{fetch_sheet_data,export_performance_workbook}.py.

import { cleanNumber, numOrNa, pctOrNa, textOrNa, type SheetRowMap, type AdsRoiClientRow } from "@/lib/server/sheets/parsing";

function getValue(rowMap: SheetRowMap, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (key in rowMap && rowMap[key] !== "") return rowMap[key];
  }
  return undefined;
}

export type MappedPerformanceRow = {
  year: number;
  month: number;
  total_views: number | "N/A" | null;
  total_view_growth: string | "N/A" | null;
  ig_views: number | "N/A" | null;
  fb_views: number | "N/A" | null;
  tiktok_views: number | "N/A" | null;
  ig_followers: number | "N/A" | null;
  fb_followers: number | "N/A" | null;
  tiktok_followers: number | "N/A" | null;
  ttl_followers: number | "N/A" | null;
  follower_growth_pct: number | "N/A" | null;
  website_traffic: number | "N/A" | null;
  ad_spend: number | "N/A" | null;
  cost_per_follower: number | "N/A" | null;
  cost_per_lead: number | "N/A" | null;
  cost_per_booking: number | "N/A" | null;
  new_leads: number | "N/A" | null;
  ttl_leads: number | "N/A" | null;
  lead_growth_pct: number | "N/A" | null;
  total_booking_revenue: number | "N/A" | null;
  direct_booking_revenue: number | "N/A" | null;
  direct_booking_split_pct: number | "N/A" | null;
  ly_total_booking_revenue: number | "N/A" | null;
  ly_direct_booking_revenue: number | "N/A" | null;
  ly_direct_booking_split_pct: number | "N/A" | null;
  notes: string;
};

export function mapPerformanceRow(rowMap: SheetRowMap, year: number, month: number): MappedPerformanceRow {
  return {
    year,
    month,
    total_views: numOrNa(getValue(rowMap, "total_views")),
    total_view_growth: textOrNa(getValue(rowMap, "total_view_growth")),
    ig_views: numOrNa(getValue(rowMap, "ig_views")),
    fb_views: numOrNa(getValue(rowMap, "fb_views")),
    tiktok_views: numOrNa(getValue(rowMap, "tiktok_views")),
    ig_followers: numOrNa(getValue(rowMap, "ig_followers")),
    fb_followers: numOrNa(getValue(rowMap, "fb_followers")),
    tiktok_followers: numOrNa(getValue(rowMap, "tiktok_followers")),
    ttl_followers: numOrNa(getValue(rowMap, "ttl_followers")),
    follower_growth_pct: numOrNa(getValue(rowMap, "follower_growth")),
    website_traffic: numOrNa(getValue(rowMap, "website_traffic")),
    ad_spend: numOrNa(getValue(rowMap, "ad_spend")),
    cost_per_follower: numOrNa(getValue(rowMap, "cost_per_follower")),
    cost_per_lead: numOrNa(getValue(rowMap, "cost_per_lead")),
    cost_per_booking: numOrNa(getValue(rowMap, "cost_per_booking")),
    new_leads: numOrNa(getValue(rowMap, "new_leads")),
    ttl_leads: numOrNa(getValue(rowMap, "ttl_leads")),
    lead_growth_pct: numOrNa(getValue(rowMap, "lead_growth")),
    total_booking_revenue: numOrNa(getValue(rowMap, "total_booking_revenue")),
    direct_booking_revenue: numOrNa(getValue(rowMap, "direct_booking_revenue")),
    direct_booking_split_pct: pctOrNa(getValue(rowMap, "direct_booking_split")),
    ly_total_booking_revenue: numOrNa(getValue(rowMap, "ly_total_booking_revenue")),
    ly_direct_booking_revenue: numOrNa(getValue(rowMap, "ly_direct_booking_revenue")),
    ly_direct_booking_split_pct: pctOrNa(getValue(rowMap, "ly_direct_booking_split")),
    notes: String(getValue(rowMap, "notes_insights") || "").trim(),
  };
}

export type MappedAdsRoiRow = {
  year: number;
  month: number;
  campaign_type: string;
  spend: number | null;
  impressions: number | null;
  profile_visits: number | null;
  cost_per_visit: number | null;
  leads_followers: number | null;
  cost_per_lead_follower: number | null;
  bookings_email_matched: number | null;
  bookings_fb_events: number | null;
  cost_per_booking: number | null;
  avg_booking_value: number | null;
  pct_avg_booking_value: number | null;
  revenue: number | null;
  roas: number | null;
  blended_roas: number | null;
  comments: string;
};

const META_COMMENT_KEYS = ["comments", "comment", "notes", "recommended_action", "todos", "todo"];

function collectComments(rowMap: SheetRowMap): string {
  const values: string[] = [];
  for (const key of META_COMMENT_KEYS) {
    const value = rowMap[key];
    if (value) values.push(value.trim());
  }
  return Array.from(new Set(values)).join(" | ");
}

/**
 * Ported from CampaignAccumulator.as_payload()'s single-row case — the
 * common shape for one client/month/campaign_type. If more than one row in
 * the sheet matches the same client+campaign_type (rare), sums the additive
 * fields and keeps the first non-null value for the rest, matching the
 * accumulator's multi-row aggregation.
 */
export function mapAdsRoiRows(rows: AdsRoiClientRow[], year: number, month: number): MappedAdsRoiRow[] {
  const byCampaignType = new Map<string, SheetRowMap[]>();
  for (const { campaignType, rowMap } of rows) {
    const list = byCampaignType.get(campaignType) || [];
    list.push(rowMap);
    byCampaignType.set(campaignType, list);
  }

  const results: MappedAdsRoiRow[] = [];
  for (const [campaignType, rowMaps] of byCampaignType) {
    if (rowMaps.length === 1) {
      const rowMap = rowMaps[0];
      results.push({
        year,
        month,
        campaign_type: campaignType,
        spend: cleanNumber(getValue(rowMap, "spend", "campaign_spend", "ad_spend")),
        impressions: cleanNumber(getValue(rowMap, "impressions")),
        profile_visits: cleanNumber(getValue(rowMap, "profile_visits")),
        cost_per_visit: cleanNumber(getValue(rowMap, "cost_per_visit")),
        leads_followers: cleanNumber(getValue(rowMap, "leads_followers")),
        cost_per_lead_follower: cleanNumber(getValue(rowMap, "cost_per_lead_follower")),
        bookings_email_matched: cleanNumber(getValue(rowMap, "bookings_email")),
        bookings_fb_events: cleanNumber(getValue(rowMap, "bookings_fb")),
        cost_per_booking: cleanNumber(getValue(rowMap, "cost_per_booking")),
        avg_booking_value: cleanNumber(getValue(rowMap, "avg_booking_value")),
        pct_avg_booking_value: cleanNumber(getValue(rowMap, "pct_avg_booking_value")),
        revenue: cleanNumber(getValue(rowMap, "revenue")),
        roas: cleanNumber(getValue(rowMap, "roas")),
        blended_roas: cleanNumber(getValue(rowMap, "blended_roas")),
        comments: collectComments(rowMap),
      });
      continue;
    }

    const sum = (key: string) => rowMaps.reduce((total, rowMap) => total + (cleanNumber(rowMap[key]) || 0), 0);
    const firstNonNull = (...keys: string[]) => {
      for (const rowMap of rowMaps) {
        const value = cleanNumber(getValue(rowMap, ...keys));
        if (value !== null) return value;
      }
      return null;
    };
    results.push({
      year,
      month,
      campaign_type: campaignType,
      spend: sum("spend"),
      impressions: sum("impressions"),
      profile_visits: sum("profile_visits"),
      cost_per_visit: firstNonNull("cost_per_visit"),
      leads_followers: sum("leads_followers"),
      cost_per_lead_follower: firstNonNull("cost_per_lead_follower"),
      bookings_email_matched: sum("bookings_email"),
      bookings_fb_events: sum("bookings_fb"),
      cost_per_booking: firstNonNull("cost_per_booking"),
      avg_booking_value: firstNonNull("avg_booking_value"),
      pct_avg_booking_value: firstNonNull("pct_avg_booking_value"),
      revenue: sum("revenue"),
      roas: firstNonNull("roas"),
      blended_roas: firstNonNull("blended_roas"),
      comments: rowMaps.map(collectComments).filter(Boolean).join(" | "),
    });
  }
  return results;
}
