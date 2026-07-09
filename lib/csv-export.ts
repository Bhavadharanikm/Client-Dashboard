// Ported verbatim from exportClientDataCSV() / exportMetaDataCSV() in
// Main Page/Dashboard/dashboard.js.

import type { PerformanceRow, PerformanceWorkbook } from "./roi-model";
import { canonicalizeClientSlug } from "./client-slug";
import { toMonthKey } from "./roi-model";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pct(value: unknown): string {
  return value !== null && value !== undefined ? `${(parseFloat(String(value)) * 100).toFixed(1)}%` : "";
}

function num(value: unknown): string {
  return value !== null && value !== undefined ? String(parseFloat(String(value))) : "";
}

/**
 * Builds the CSV text for a client's performance workbook rows. Pure function
 * (no DOM access) so it's testable and reusable; the actual download side
 * effect (Blob + anchor click) is a thin wrapper below.
 */
export function buildClientDataCSV(rows: PerformanceRow[]): string {
  const headers = [
    "Period",
    "Total Booking Revenue",
    "Direct Booking Revenue",
    "Direct Booking Split %",
    "LY Total Booking Revenue",
    "LY Direct Booking Revenue",
    "LY Direct Booking Split %",
    "Total Views",
    "IG Views",
    "FB Views",
    "TikTok Views",
    "Total Followers",
    "IG Followers",
    "FB Followers",
    "TikTok Followers",
    "Website Traffic",
    "New Leads",
    "Total Leads",
    "Lead Growth %",
  ];

  const sorted = rows.slice().sort((a, b) => (Number(a.year) * 100 + Number(a.month)) - (Number(b.year) * 100 + Number(b.month)));
  const lines = [headers.join(",")];

  sorted.forEach((r) => {
    const period = `${MONTH_NAMES[(Number(r.month) || 1) - 1] || ""} ${r.year || ""}`;
    lines.push(
      [
        period,
        num(r.total_booking_revenue),
        num(r.direct_booking_revenue),
        pct(r.direct_booking_split_pct),
        num(r.ly_total_booking_revenue),
        num(r.ly_direct_booking_revenue),
        pct(r.ly_direct_booking_split_pct),
        num(r.total_views),
        num(r.ig_views),
        num(r.fb_views),
        num(r.tiktok_views),
        num(r.ttl_followers),
        num(r.ig_followers),
        num(r.fb_followers),
        num(r.tiktok_followers),
        num(r.website_traffic),
        num(r.new_leads),
        num(r.ttl_leads),
        pct(r.lead_growth_pct),
      ].join(",")
    );
  });

  return lines.join("\n");
}

/**
 * Ported from exportClientDataCSV(): triggers a browser download of the
 * client's performance data as CSV. No-ops (with a message callback) if
 * there's no client selected or no rows available, matching the original's
 * `showMessage(...)` calls.
 */
export function exportClientDataCSV(
  workbook: PerformanceWorkbook,
  client: { slug: string; name: string } | null,
  onMessage?: (message: string, tone: "error" | "info") => void
): void {
  if (!client) return;
  const slug = canonicalizeClientSlug(client.slug);
  const rows = workbook.rowsByClientSlug[slug] || [];
  if (!rows.length) {
    onMessage?.("No data available to export.", "error");
    return;
  }

  const csv = buildClientDataCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_Performance_Data.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvNum(value: unknown): string {
  return value !== null && value !== undefined && value !== "" ? String(parseFloat(parseFloat(String(value)).toFixed(2))) : "";
}

/**
 * Builds the CSV text for a client's Meta Ads rows, ported verbatim from
 * exportMetaDataCSV(). Column layout: Month, Campaign, Spend, Revenue, ROAS,
 * Impressions, Visits, Leads/Followers, IG Bio Leads, Bookings (Email),
 * Bookings (FB), Cost Per Booking, Direct Booking Revenue.
 */
export function buildMetaDataCSV(rows: PerformanceRow[], perfRows: PerformanceRow[]): string {
  const directRevenueByMonth: Record<string, unknown> = {};
  perfRows.forEach((r) => {
    const key = toMonthKey(r.year, r.month);
    directRevenueByMonth[key] = r.direct_booking_revenue;
  });

  const headers = [
    "Month",
    "Campaign",
    "Spend",
    "Revenue",
    "ROAS",
    "Impressions",
    "Visits",
    "Leads/Followers",
    "IG Bio Leads",
    "Bookings (Email)",
    "Bookings (FB)",
    "Cost Per Booking",
    "Direct Booking Revenue",
  ];

  const sorted = rows
    .slice()
    .sort(
      (a, b) =>
        Number(a.year) * 100 + Number(a.month) - (Number(b.year) * 100 + Number(b.month)) ||
        String(a.campaign_type || "").localeCompare(String(b.campaign_type || ""))
    );

  const lines = [headers.join(",")];
  sorted.forEach((r) => {
    const period = `${MONTH_NAMES[(Number(r.month) || 1) - 1] || ""} ${r.year || ""}`;
    const monthKey = toMonthKey(r.year, r.month);
    lines.push(
      [
        period,
        String(r.campaign_type || ""),
        csvNum(r.spend),
        csvNum(r.revenue),
        csvNum(r.roas),
        csvNum(r.impressions),
        csvNum(r.profile_visits),
        csvNum(r.leads_followers),
        csvNum(r.ig_bio_leads),
        csvNum(r.bookings_email_matched),
        csvNum(r.bookings_fb_events),
        csvNum(r.cost_per_booking),
        csvNum(directRevenueByMonth[monthKey]),
      ].join(",")
    );
  });

  return lines.join("\n");
}

/**
 * Ported from exportMetaDataCSV(): triggers a browser download of the
 * client's Meta Ads data as CSV.
 */
export function exportMetaDataCSV(
  workbook: PerformanceWorkbook,
  client: { slug: string; name: string } | null,
  onMessage?: (message: string, tone: "error" | "info") => void
): void {
  if (!client) return;
  const slug = canonicalizeClientSlug(client.slug);
  const rows = workbook.metaRowsByClientSlug[slug] || [];
  if (!rows.length) {
    onMessage?.("No Meta Ads data available to export.", "error");
    return;
  }
  const perfRows = workbook.rowsByClientSlug[slug] || [];

  const csv = buildMetaDataCSV(rows, perfRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_Meta_Ads_Data.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
