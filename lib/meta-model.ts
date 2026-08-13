// Ported from Main Page/Dashboard/dashboard.js — Meta Ads view derivation logic
// (filterMetaRows, buildMetaModel, buildMetaSummary, renderMetaView's computed
// fields, and renderMetaCharts' series/axis prep), reshaped into a pure
// buildMetaViewModel() function that returns everything the Meta Ads view needs.

import type { PerformanceRow, PerformanceWorkbook } from "./roi-model";
import { canonicalizeClientSlug, getMetaRows, getPerformanceRoiRows, toMonthKey } from "./roi-model";
import { getHistoricalMonthKeys, getAllRoiMonthKeys, buildRoiMetrics } from "./roi-metrics";
import type { MetaAnalysis, MetaAnalysisPeriod } from "./server/data";
import {
  formatMonthKey,
  formatShortMonthKey,
  formatShortMonthYearKey,
  formatShortMonthYearKeyCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatCompactNumber,
  formatMultiple,
  formatNullableNumber,
  formatNullableCurrency,
  formatNullablePercent,
  formatPercent,
  numeric,
  sumMetric,
  averageMetric,
  highestMonth,
  lowestPositiveRow,
  monthColor,
  monthLightColor,
  round2,
} from "./format";
import {
  buildCurrencyAxisBounds,
  buildTrendAxisBounds,
  chooseAxisStep,
  roundUpAxis,
  roundUpValue,
} from "./chart-utils";
import { slugify } from "./client-slug";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export type MetaRow = {
  key: string;
  label: string;
  shortLabel: string;
  shortYearLabel: string;
  monthIndex: number;
  campaignType: string;
  spend: number;
  impressions: number;
  profileVisits: number;
  costPerVisit: number | null;
  leadsFollowers: number | null;
  costPerLeadFollower: number | null;
  igBioLeads: number | null;
  bookingsEmail: number | null;
  bookingsFb: number | null;
  costPerBooking: number | null;
  avgBookingValue: number;
  revenue: number;
  roas: number;
  blendedRoas: number;
  pctAvgBookingValue: number | null;
  comments: string;
};

export type MetaMonth = {
  key: string;
  label: string;
  shortLabel: string;
  shortYearLabel: string;
  monthIndex: number;
  totalSpend: number;
  attributedRevenue: number;
  blendedRoas: number;
  avgBookingValue: number;
  maxEmailBookings: number;
  maxFbBookings: number;
  totalBookings: number;
};

export type MetaModel = {
  rows: MetaRow[];
  months: MetaMonth[];
  rowsByCampaign: Record<string, MetaRow[]>;
  campaignTypes: string[];
};

/** Ported verbatim from isIncludedMetaCampaign(). */
export function isIncludedMetaCampaign(campaignType: unknown): boolean {
  const normalized = String(campaignType || "").trim().toLowerCase();
  return normalized.indexOf("discovery") !== -1 || normalized.indexOf("retarget") !== -1;
}

/**
 * Bookings attribution is channel-specific, not additive: Discovery bookings
 * are tracked via email match, Retargeting bookings via FB pixel events. A
 * row can carry a non-zero value in both fields (e.g. a Retargeting row with
 * bookingsEmail === bookingsFb) because that's the *same* set of bookings
 * attributed two ways, not two distinct sets — summing them double-counts.
 */
export function attributedBookings(campaignType: string, bookingsEmail: unknown, bookingsFb: unknown): number {
  const isRetargeting = campaignType.toLowerCase().indexOf("retarget") !== -1;
  return isRetargeting ? numeric(bookingsFb) : numeric(bookingsEmail);
}

function nullableNumericOrRaw(raw: unknown): number | null {
  return raw === null || raw === undefined ? null : numeric(raw);
}

/** Ported verbatim from filterMetaRows() (row shaping + month-key filter + campaign merge). */
export function filterMetaRows(monthKeys: string[], rows: PerformanceRow[]): MetaRow[] {
  const allowed = new Set(monthKeys);
  const filteredRows: MetaRow[] = rows
    .filter((row) => allowed.has(toMonthKey(row.year, row.month)) && isIncludedMetaCampaign(row.campaign_type))
    .map((row) => {
      const key = toMonthKey(row.year, row.month);
      return {
        key,
        label: formatMonthKey(key),
        shortLabel: formatShortMonthKey(key),
        shortYearLabel: formatShortMonthYearKey(key),
        monthIndex: monthKeys.indexOf(key),
        campaignType: (row.campaign_type as string) || "Campaign",
        spend: numeric(row.spend),
        impressions: numeric(row.impressions),
        profileVisits: numeric(row.profile_visits),
        costPerVisit: nullableNumericOrRaw(row.cost_per_visit),
        leadsFollowers: nullableNumericOrRaw(row.leads_followers),
        costPerLeadFollower: nullableNumericOrRaw(row.cost_per_lead_follower),
        igBioLeads: nullableNumericOrRaw(row.ig_bio_leads),
        bookingsEmail: nullableNumericOrRaw(row.bookings_email_matched),
        bookingsFb: nullableNumericOrRaw(row.bookings_fb_events),
        costPerBooking: nullableNumericOrRaw(row.cost_per_booking),
        avgBookingValue: numeric(row.avg_booking_value),
        revenue: numeric(row.revenue),
        roas: numeric(row.roas),
        blendedRoas: numeric(row.blended_roas),
        pctAvgBookingValue: nullableNumericOrRaw(row.pct_avg_booking_value),
        comments: (row.comments as string) || "",
      };
    });

  // Merge rows with same month + campaign_type (multiple ad sets in same campaign).
  const mergeMap: Record<string, MetaRow> = {};
  filteredRows.forEach((row) => {
    const mergeKey = `${row.key}||${row.campaignType.toLowerCase()}`;
    if (!mergeMap[mergeKey]) {
      mergeMap[mergeKey] = { ...row };
    } else {
      const base = mergeMap[mergeKey];
      base.spend += numeric(row.spend);
      base.impressions += numeric(row.impressions);
      base.profileVisits += numeric(row.profileVisits);
      base.leadsFollowers = numeric(base.leadsFollowers) + numeric(row.leadsFollowers) || base.leadsFollowers;
      base.igBioLeads = numeric(base.igBioLeads) + numeric(row.igBioLeads) || base.igBioLeads;
      base.bookingsEmail = numeric(base.bookingsEmail) + numeric(row.bookingsEmail) || base.bookingsEmail;
      base.bookingsFb = numeric(base.bookingsFb) + numeric(row.bookingsFb) || base.bookingsFb;
      base.revenue = numeric(base.revenue) + numeric(row.revenue);
      const totalBookings = attributedBookings(base.campaignType, base.bookingsEmail, base.bookingsFb);
      base.roas = base.spend > 0 ? base.revenue / base.spend : 0;
      base.costPerBooking = totalBookings > 0 ? base.spend / totalBookings : null;
      base.avgBookingValue = base.avgBookingValue || row.avgBookingValue;
      base.blendedRoas = base.blendedRoas || row.blendedRoas;
      base.comments = [base.comments, row.comments].filter(Boolean).join(" ");
    }
  });

  return Object.values(mergeMap);
}

/** Ported verbatim from buildMetaModel(). */
export function buildMetaModel(rows: MetaRow[]): MetaModel {
  const monthMap: Record<string, MetaMonth> = {};
  const rowsByCampaign: Record<string, MetaRow[]> = {};
  const campaignOrder: string[] = [];

  rows.forEach((row) => {
    if (!monthMap[row.key]) {
      monthMap[row.key] = {
        key: row.key,
        label: row.label,
        shortLabel: row.shortLabel,
        shortYearLabel: row.shortYearLabel,
        monthIndex: row.monthIndex,
        totalSpend: 0,
        attributedRevenue: 0,
        blendedRoas: 0,
        avgBookingValue: 0,
        maxEmailBookings: 0,
        maxFbBookings: 0,
        totalBookings: 0,
      };
    }

    const month = monthMap[row.key];
    month.totalSpend += numeric(row.spend);
    month.attributedRevenue += numeric(row.revenue);
    month.blendedRoas = Math.max(month.blendedRoas, numeric(row.blendedRoas) || numeric(row.roas));
    month.avgBookingValue = Math.max(month.avgBookingValue, numeric(row.avgBookingValue));
    month.maxEmailBookings += numeric(row.bookingsEmail);
    month.maxFbBookings += numeric(row.bookingsFb);
    month.totalBookings += attributedBookings(row.campaignType, row.bookingsEmail, row.bookingsFb);

    if (!rowsByCampaign[row.campaignType]) {
      rowsByCampaign[row.campaignType] = [];
      campaignOrder.push(row.campaignType);
    }
    rowsByCampaign[row.campaignType].push(row);
  });

  const months = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));

  campaignOrder.forEach((campaignType) => {
    rowsByCampaign[campaignType].sort((a, b) => a.key.localeCompare(b.key));
  });

  return { rows, months, rowsByCampaign, campaignTypes: campaignOrder };
}

/** Ported verbatim from normalizeMetaSpendBoundaryMonths() — client-specific data correction. */
export function normalizeMetaSpendBoundaryMonths(meta: MetaModel, clientSlug: string): MetaModel {
  if (!meta.months.length) return meta;
  if (clientSlug === "reflections-resorts") {
    meta.months.forEach((month) => {
      if (month.key === "2025-12") {
        month.totalSpend = 698.42;
      }
    });
  }
  return meta;
}

// ---------------------------------------------------------------------------
// Small pure helpers ported verbatim
// ---------------------------------------------------------------------------

export function primaryRoas(row: MetaRow): number {
  return numeric(row.roas) || numeric(row.blendedRoas);
}

export function performanceStatus(row: MetaRow): { label: string; className: string } {
  const roas = primaryRoas(row);
  if (roas >= 10) return { label: "Great", className: "great" };
  if (roas >= 5) return { label: "Solid", className: "solid" };
  if (roas >= 1) return { label: "Decent", className: "decent" };
  if (row.revenue > 0) return { label: "Building", className: "building" };
  return { label: "Weak", className: "weak" };
}

export function metaComment(row: MetaRow): string {
  if (row.comments) return row.comments;
  if (primaryRoas(row) >= 10) return "Strong month with efficient revenue capture and healthy traffic quality.";
  if (numeric(row.leadsFollowers) > 0) {
    return "Lead and audience generation stayed active, but conversion efficiency has room to improve.";
  }
  return "This campaign is still building toward stronger conversion signals.";
}

export function chooseVolumeMetric(rows: MetaRow[]): { key: keyof MetaRow; label: string } {
  if (rows.some((row) => numeric(row.leadsFollowers) > 0)) return { key: "leadsFollowers", label: "Leads / Followers" };
  if (rows.some((row) => numeric(row.bookingsFb) > 0)) return { key: "bookingsFb", label: "FB Bookings" };
  if (rows.some((row) => numeric(row.bookingsEmail) > 0)) return { key: "bookingsEmail", label: "Email Bookings" };
  return { key: "profileVisits", label: "Profile Visits" };
}

export function chooseEfficiencyMetric(rows: MetaRow[]): { key: keyof MetaRow; label: string } {
  if (rows.some((row) => numeric(row.costPerLeadFollower) > 0)) {
    return { key: "costPerLeadFollower", label: "Cost / Lead-Follower" };
  }
  if (rows.some((row) => numeric(row.costPerBooking) > 0)) return { key: "costPerBooking", label: "Cost / Booking" };
  return { key: "costPerVisit", label: "Cost / Visit" };
}

export function totalCampaignBookings(row: MetaRow): number {
  return attributedBookings(row.campaignType, row.bookingsEmail, row.bookingsFb);
}

/** Ported verbatim from metaCampaignToggleKey() — key convention used by useDashboardState's metaExpandedCampaigns. */
export function metaCampaignToggleKey(campaignType: string): string {
  return slugify(campaignType);
}

/** Ported verbatim from visibleMetaCampaignTypes(). */
export function visibleMetaCampaignTypes(meta: MetaModel): string[] {
  return (meta.campaignTypes || []).filter((campaignType) => {
    const rows = meta.rowsByCampaign[campaignType] || [];
    return rows.some((row) => numeric(row.spend) > 0 || numeric(row.revenue) > 0 || numeric(row.impressions) > 0);
  });
}

function highestRow<T extends Record<string, unknown>>(rows: T[], field: keyof T): T | null {
  if (!rows.length) return null;
  return rows.reduce<T | null>((highest, row) => (!highest || numeric(row[field]) > numeric(highest[field]) ? row : highest), null);
}

/** Ported verbatim from summarizeCampaignHighlight(). */
export function summarizeCampaignHighlight(rows: MetaRow[]) {
  const peakMonth = highestRow(rows, "revenue");
  return {
    monthCount: rows.length,
    totalSpend: sumMetric(rows, "spend"),
    totalRevenue: sumMetric(rows, "revenue"),
    peakMonthLabel: peakMonth ? peakMonth.label : "—",
    peakMonthNote: peakMonth ? "Highest revenue month" : "No data available",
  };
}

function averageOfRows(rows: MetaRow[], getter: (row: MetaRow) => unknown): number {
  const values = rows.map((row) => numeric(getter(row))).filter((value) => value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Ported verbatim from summarizeRetargetingRows(). */
export function summarizeRetargetingRows(rows: MetaRow[]) {
  const avgMonths = rows.filter((row) => numeric(row.spend) > 0 || numeric(row.revenue) > 0 || primaryRoas(row) > 0).length || rows.length || 0;
  return {
    avgCostPerBooking: averageOfRows(rows, (row) => row.costPerBooking),
    avgBookingValue: averageOfRows(rows, (row) => row.avgBookingValue),
    avgRoas: averageOfRows(rows, (row) => primaryRoas(row)),
    avgPeriodLabel: avgMonths ? `${avgMonths}-month avg` : "No data yet",
  };
}

/** Ported verbatim from summarizeDiscoveryRows(). */
export function summarizeDiscoveryRows(rows: MetaRow[]) {
  const firstRow = rows[0] || null;
  const lastRow = rows[rows.length - 1] || null;
  const firstImpressions = firstRow ? numeric(firstRow.impressions) : 0;
  const lastImpressions = lastRow ? numeric(lastRow.impressions) : 0;
  const impressionsDelta = firstImpressions > 0 ? (lastImpressions - firstImpressions) / firstImpressions : 0;
  const totalLeadsFollowers = sumMetric(rows, "leadsFollowers");

  return {
    totalImpressions: sumMetric(rows, "impressions"),
    totalFollowers: totalLeadsFollowers,
    totalLeadsFollowers,
    totalBookings: rows.reduce((sum, row) => sum + totalCampaignBookings(row), 0),
    totalPageVisits: sumMetric(rows, "profileVisits"),
    impressionsDelta,
  };
}

/** Ported verbatim from formatMetaMonthRange(). Accepts anything keyed like a Meta row or month. */
export function formatMetaMonthRange(rows: { key: string }[]): string {
  if (!rows.length) return "Selected range";
  const firstKey = rows[0].key;
  const lastKey = rows[rows.length - 1].key;
  if (firstKey === lastKey) return formatShortMonthYearKey(firstKey);
  return `${formatShortMonthYearKey(firstKey)} - ${formatShortMonthYearKey(lastKey)}`;
}

/** Ported verbatim from formatSignedPercentLabel(). */
export function formatSignedPercentLabel(value: unknown): string {
  const percent = Math.round(numeric(value) * 100);
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return "0%";
}

/** Ported verbatim from buildRetargetingRoasTakeaway(). */
export function buildRetargetingRoasTakeaway(rows: MetaRow[]): string {
  if (!rows.length) return "ROAS data is not available for this period.";
  const peakRoasRow = highestRow(rows, "roas");
  const lowRoasRow = lowestPositiveRow(rows, "roas");
  const latestRow = rows[rows.length - 1];
  if (!peakRoasRow) return "ROAS data is not available for this period.";
  if (latestRow && latestRow === peakRoasRow) {
    return `${latestRow.label} posted the strongest ROAS at ${formatMultiple(latestRow.roas)}, showing retargeting efficiency improved into the latest month.`;
  }
  if (lowRoasRow && peakRoasRow !== lowRoasRow) {
    return `${peakRoasRow.label} posted the strongest ROAS at ${formatMultiple(peakRoasRow.roas)}, up from ${formatMultiple(lowRoasRow.roas)} in ${lowRoasRow.label}.`;
  }
  return `${peakRoasRow.label} posted the strongest ROAS at ${formatMultiple(peakRoasRow.roas)}.`;
}

/** Ported verbatim from buildDiscoveryTrafficTakeaway(). */
export function buildDiscoveryTrafficTakeaway(rows: MetaRow[]): string {
  if (!rows.length) return "Traffic data is not available for this period.";
  const peakImpressionsRow = highestRow(rows, "impressions");
  const peakVisitsRow = highestRow(rows, "profileVisits");
  const latestRow = rows[rows.length - 1];
  const latestVisitShare = latestRow && latestRow.impressions > 0 ? latestRow.profileVisits / latestRow.impressions : 0;

  if (peakImpressionsRow && peakVisitsRow && peakImpressionsRow.key === peakVisitsRow.key) {
    return `${peakImpressionsRow.label} led both reach and traffic, with ${formatNumber(peakImpressionsRow.impressions)} impressions and ${formatNumber(peakImpressionsRow.profileVisits)} page visits.`;
  }
  if (latestRow && latestVisitShare > 0) {
    return `${latestRow.label} converted reach into ${formatNumber(latestRow.profileVisits)} page visits from ${formatNumber(latestRow.impressions)} impressions.`;
  }
  if (peakImpressionsRow) {
    return `${peakImpressionsRow.label} delivered the strongest reach at ${formatNumber(peakImpressionsRow.impressions)} impressions.`;
  }
  return "Traffic data is not available for this period.";
}

// ---------------------------------------------------------------------------
// meta_analysis entry matching — mirrors findBestAnalysisEntry / getMetaAnalysisEntry
// ---------------------------------------------------------------------------

function findBestAnalysisEntry<T>(store: Record<string, T> | undefined, selectedMonth: string): T | null {
  if (!store) return null;
  if (store[selectedMonth]) return store[selectedMonth];
  const keys = Object.keys(store)
    .filter((k) => k <= selectedMonth)
    .sort();
  if (keys.length) return store[keys[keys.length - 1]];
  return null;
}

export function getMetaAnalysisEntry(
  metaAnalysis: MetaAnalysis,
  clientSlug: string,
  selectedMonth: string
): MetaAnalysisPeriod | null {
  const clientData = metaAnalysis[clientSlug];
  if (!clientData || !clientData.meta) return null;
  return findBestAnalysisEntry(clientData.meta, selectedMonth);
}

// ---------------------------------------------------------------------------
// View model
// ---------------------------------------------------------------------------

export type MetaChannelAccent = { bg: string; color: string; icon: string; subtitle: string };

export function campaignAccent(campaignType: string): MetaChannelAccent {
  const isRetargeting = campaignType.toLowerCase().indexOf("retarget") >= 0;
  return isRetargeting
    ? { bg: "#e0f2fe", color: "#0891b2", icon: "↺", subtitle: "High-intent conversion campaign" }
    : { bg: "#f3e8ff", color: "#7c3aed", icon: "◎", subtitle: "Top-of-funnel discovery campaign" };
}

export type MetaCampaignSectionModel = {
  campaignType: string;
  chartKey: string;
  toggleKey: string;
  isRetargeting: boolean;
  isDiscovery: boolean;
  isOpen: boolean;
  rows: MetaRow[];
  rangeLabel: string;
  retargetingSummary: ReturnType<typeof summarizeRetargetingRows> | null;
  discoverySummary: ReturnType<typeof summarizeDiscoveryRows> | null;
  retargetingTakeaways: string[];
  discoveryTakeaways: string[];
  volumeMetric: { key: keyof MetaRow; label: string };
  efficiencyMetric: { key: keyof MetaRow; label: string };
};

export type MetaHighlightCardModel = {
  campaignType: string;
  toggleKey: string;
  isOpen: boolean;
  accent: MetaChannelAccent;
  summary: ReturnType<typeof summarizeCampaignHighlight>;
};

export type MetaChartSeries = { name: string; data: number[]; color?: string };

export type MetaViewModel = {
  hasData: boolean;
  isComingSoon: boolean;
  clientName: string;
  selectedMonthLabel: string;
  meta: MetaModel;
  legendMonths: { label: string; color: string }[];

  summaryStrip: {
    adSpend: string;
    adSpendNote: string;
    adRev: string;
    adRevNote: string;
    roas: string;
    roasNote: string;
    costPerBooking: string;
    costPerBookingNote: string;
    leads: string;
    leadsNote: string;
    followers: string;
    followersNote: string;
    views: string;
    viewsNote: string;
  };

  portfolio: {
    revSpendChart: { series: { name: string; data: number[] }[]; shortYearLabels: string[] };
    bookingValueChart: { series: number[]; monthLabels: string[]; axis: { min: number; max: number; tickAmount: number } };
    campaignRevenueChart: { series: MetaChartSeries[]; shortYearLabels: string[] };
    totalAdSpendKpi: { label: string; value: string }[];
    avgBookingValueKpi: { label: string; value: string }[];
  };

  highlightCards: MetaHighlightCardModel[];
  campaignSections: MetaCampaignSectionModel[];

  insights: {
    takeaways: string[];
    periodLabel: string;
    efficiencyRows: {
      key: string;
      shortLabel: string;
      campaignType: string;
      monthIndex: number;
      hasRoas: boolean;
      roas: number;
      barWidth: number;
      barColor: string;
      monthBg: string;
      monthColor: string;
    }[];
  };

  comparisonRows: {
    key: string;
    monthIndex: number;
    shortLabel: string;
    campaignType: string;
    spend: number;
    revenue: number;
    directRevenue: number | null;
    roas: number;
    impressions: number;
    profileVisits: number;
    leadsFollowers: number | null;
    igBioLeads: number | null;
    bookingsEmail: number | null;
    bookingsFb: number | null;
    costPerBooking: number | null;
    pctAvgBookingValue: number | null;
  }[];
  showDirectRevenueColumn: boolean;
};

function buildEmptyMetaViewModel(clientName: string, selectedMonth: string, isComingSoon: boolean): MetaViewModel {
  return {
    hasData: false,
    isComingSoon,
    clientName,
    selectedMonthLabel: formatMonthKey(selectedMonth),
    meta: { rows: [], months: [], rowsByCampaign: {}, campaignTypes: [] },
    legendMonths: [],
    summaryStrip: {
      adSpend: "$0",
      adSpendNote: "",
      adRev: "$0",
      adRevNote: "",
      roas: "0x",
      roasNote: "",
      costPerBooking: "—",
      costPerBookingNote: "",
      leads: "0",
      leadsNote: "",
      followers: "0",
      followersNote: "",
      views: "0",
      viewsNote: "",
    },
    portfolio: {
      revSpendChart: { series: [], shortYearLabels: [] },
      bookingValueChart: { series: [], monthLabels: [], axis: { min: 0, max: 10, tickAmount: 4 } },
      campaignRevenueChart: { series: [], shortYearLabels: [] },
      totalAdSpendKpi: [],
      avgBookingValueKpi: [],
    },
    highlightCards: [],
    campaignSections: [],
    insights: { takeaways: [], periodLabel: "", efficiencyRows: [] },
    comparisonRows: [],
    showDirectRevenueColumn: false,
  };
}

/**
 * Builds the entire Meta Ads view model in one shot, mirroring renderMetaView() +
 * renderMetaCharts() from the original. selectedMonth is the COMMITTED month from
 * useDashboardState (not a pending value). expandedCampaigns comes from
 * useDashboardState().metaExpandedCampaigns (already keyed by metaCampaignToggleKey).
 */
export function buildMetaViewModel(
  workbook: PerformanceWorkbook,
  metaAnalysis: MetaAnalysis,
  clientName: string,
  clientSlug: string,
  selectedMonth: string,
  expandedCampaigns: Record<string, boolean>
): MetaViewModel {
  const canonicalSlug = canonicalizeClientSlug(clientSlug);
  const roiRows = getPerformanceRoiRows(workbook, canonicalSlug);
  const rawMetaRows = getMetaRows(workbook, canonicalSlug);

  // The 3-month window is meant to reflect whatever data actually exists, not
  // just Performance rows — a client can have dashboard_meta_ads rows for a
  // month before dashboard_performance has been synced for it (the two are
  // synced independently from the Super Admin sheet-sync panel). Union both
  // sources' month keys so Meta data isn't silently dropped while it waits on
  // a matching Performance row; direct-revenue overlay below already
  // tolerates a month with no ROI row by falling back to 0.
  const roiMonthKeys = getHistoricalMonthKeys(roiRows, selectedMonth, 3);
  const metaMonthKeys = Array.from(
    rawMetaRows.reduce<Set<string>>((set, row) => {
      const key = toMonthKey(row.year, row.month);
      if (key <= selectedMonth) set.add(key);
      return set;
    }, new Set<string>())
  );
  const monthKeys = Array.from(new Set([...roiMonthKeys, ...metaMonthKeys])).sort().slice(-3);
  const filteredRows = filterMetaRows(monthKeys, rawMetaRows);
  const meta = normalizeMetaSpendBoundaryMonths(buildMetaModel(filteredRows), canonicalSlug);

  // hasRenderableMetaMonthData() — checks if the *selected* month itself has any
  // non-zero Meta metric, independent of the 3-month window used for `meta`.
  const selectedMonthRows = rawMetaRows.filter((row) => toMonthKey(row.year, row.month) === selectedMonth);
  const selectedMonthHasData = selectedMonthRows.some(
    (row) =>
      numeric(row.spend) > 0 ||
      numeric(row.impressions) > 0 ||
      numeric(row.profile_visits) > 0 ||
      numeric(row.leads_followers) > 0 ||
      numeric(row.bookings_email_matched) > 0 ||
      numeric(row.bookings_fb_events) > 0
  );

  if (!meta.months.length) {
    return buildEmptyMetaViewModel(clientName, selectedMonth, false);
  }
  if (!selectedMonthHasData) {
    return buildEmptyMetaViewModel(clientName, selectedMonth, true);
  }

  const legendMonths = meta.months.map((month, index) => ({ label: month.label, color: monthColor(index) }));

  // --- Summary strip (renderMetaSummaryStrip) ---
  const allRoiMonths = buildRoiMetrics(getAllRoiMonthKeys(roiRows), roiRows);
  const currentMonth = meta.months[meta.months.length - 1] || null;
  const currentRows = currentMonth ? meta.rows.filter((row) => row.key === currentMonth.key) : [];
  const currentMonthLabel = currentMonth ? currentMonth.label : "Selected month";
  const currentBookings = currentMonth ? numeric(currentMonth.totalBookings) : 0;
  const currentCostPerBooking = currentBookings ? numeric(currentMonth.totalSpend) / currentBookings : 0;
  const currentViews = sumMetric(currentRows, "impressions");
  const currentPctAvgBookingValue = averageMetric(currentRows, "pctAvgBookingValue");

  // "Leads" and "Followers" on this strip intentionally come from Performance
  // data (dashboard_performance), not the Meta campaign rows above — per
  // request, Leads = that month's new_leads (organic/GHL lead count, not the
  // Meta campaign's own leads_followers figure) and Followers = that month's
  // net-new Instagram followers specifically (current ig_followers minus the
  // prior month's), not total-followers-across-platforms or a Meta count.
  // Only the current month's own figures are used — no 3-month comparison.
  const currentRoiMonthIndex = allRoiMonths.findIndex((month) => month.key === (currentMonth ? currentMonth.key : selectedMonth));
  const currentRoiMonth = currentRoiMonthIndex >= 0 ? allRoiMonths[currentRoiMonthIndex] : null;
  const previousRoiMonth = currentRoiMonthIndex > 0 ? allRoiMonths[currentRoiMonthIndex - 1] : null;
  const currentNewLeads = currentRoiMonth ? numeric(currentRoiMonth.newLeads) : 0;
  const currentInstagramNetNew = currentRoiMonth
    ? numeric(currentRoiMonth.igFollowers) - (previousRoiMonth ? numeric(previousRoiMonth.igFollowers) : 0)
    : 0;

  const summaryStrip = {
    adSpend: formatCurrency(currentMonth ? currentMonth.totalSpend : 0, 0),
    adSpendNote: currentMonthLabel,
    adRev: formatCurrency(currentMonth ? currentMonth.attributedRevenue : 0, 0),
    adRevNote: currentMonthLabel,
    roas: formatMultiple(currentMonth ? currentMonth.blendedRoas : 0),
    roasNote: currentMonthLabel,
    costPerBooking: currentCostPerBooking ? formatCurrency(currentCostPerBooking, 0) : "—",
    costPerBookingNote: currentPctAvgBookingValue ? `${formatPercent(currentPctAvgBookingValue, 0)} avg BV` : currentMonthLabel,
    leads: formatNumber(currentNewLeads),
    leadsNote: currentMonthLabel,
    followers: formatNumber(currentInstagramNetNew),
    followersNote: currentMonthLabel,
    views: formatNumber(currentViews),
    viewsNote: currentMonthLabel,
  };

  // --- Portfolio charts (renderMetaCharts's #meta-rev-spend / booking-value-trend / bookings) ---
  const directRevenueByMonthKey: Record<string, number> = {};
  buildRoiMetrics(monthKeys, roiRows).forEach((month) => {
    directRevenueByMonthKey[month.key] = numeric(month.directRevenue);
  });

  const shortYearLabels = meta.months.map((month) => month.shortYearLabel || formatShortMonthYearKeyCompact(month.key));
  const monthLabels = meta.months.map((month) => month.label);
  const bookingValueSeries = meta.months.map((month) => month.avgBookingValue);
  const bookingValueMax = Math.max(...bookingValueSeries, 0);
  const bookingValueMin = Math.min(...bookingValueSeries.filter((value) => numeric(value) > 0), 0);
  const bookingValueAxis = buildCurrencyAxisBounds(bookingValueMin, bookingValueMax, 250);

  const campaignRevenueChart: MetaChartSeries[] = meta.campaignTypes.map((campaignType, index) => {
    const campaignRows = meta.rowsByCampaign[campaignType] || [];
    const monthlyRevenue = meta.months.map(() => 0);
    campaignRows.forEach((row) => {
      const monthIndex = Math.max(0, numeric(row.monthIndex));
      if (monthIndex >= 0 && monthIndex < monthlyRevenue.length) {
        monthlyRevenue[monthIndex] += numeric(row.revenue);
      }
    });
    return { name: campaignType, data: monthlyRevenue, color: monthColor(index) };
  });

  const portfolio = {
    revSpendChart: {
      series: [
        { name: "Spend", data: meta.months.map((month) => month.totalSpend) },
        { name: "Revenue", data: meta.months.map((month) => directRevenueByMonthKey[month.key] || 0) },
      ],
      shortYearLabels,
    },
    bookingValueChart: { series: bookingValueSeries, monthLabels, axis: bookingValueAxis },
    campaignRevenueChart: { series: campaignRevenueChart, shortYearLabels },
    totalAdSpendKpi: meta.months
      .slice()
      .reverse()
      .map((month) => ({ label: month.shortLabel, value: formatCurrency(month.totalSpend, 0) })),
    avgBookingValueKpi: meta.months
      .slice()
      .reverse()
      .map((month) => ({ label: month.shortLabel, value: formatCurrency(month.avgBookingValue, 0) })),
  };

  // --- Highlight cards + campaign sections ---
  const visibleCampaignTypes = visibleMetaCampaignTypes(meta);
  const analysisEntry = getMetaAnalysisEntry(metaAnalysis, canonicalSlug, selectedMonth);

  const highlightCards: MetaHighlightCardModel[] = visibleCampaignTypes.map((campaignType) => {
    const rows = meta.rowsByCampaign[campaignType] || [];
    const toggleKey = metaCampaignToggleKey(campaignType);
    return {
      campaignType,
      toggleKey,
      isOpen: !!expandedCampaigns[toggleKey],
      accent: campaignAccent(campaignType),
      summary: summarizeCampaignHighlight(rows),
    };
  });

  const campaignSections: MetaCampaignSectionModel[] = visibleCampaignTypes
    .filter((campaignType) => expandedCampaigns[metaCampaignToggleKey(campaignType)])
    .map((campaignType) => {
      const rows = meta.rowsByCampaign[campaignType] || [];
      const isRetargeting = campaignType.toLowerCase().indexOf("retarget") !== -1;
      const isDiscovery = campaignType.toLowerCase().indexOf("discovery") !== -1;
      const rangeLabel = formatMetaMonthRange(rows);
      const retargetingTakeaways =
        analysisEntry && Array.isArray(analysisEntry.retargeting_key_takeaways) && analysisEntry.retargeting_key_takeaways.length
          ? analysisEntry.retargeting_key_takeaways
          : [buildRetargetingRoasTakeaway(rows)];
      const discoveryTakeaways =
        analysisEntry && Array.isArray(analysisEntry.discovery_key_takeaways) && analysisEntry.discovery_key_takeaways.length
          ? analysisEntry.discovery_key_takeaways
          : [buildDiscoveryTrafficTakeaway(rows)];

      return {
        campaignType,
        chartKey: slugify(campaignType),
        toggleKey: metaCampaignToggleKey(campaignType),
        isRetargeting,
        isDiscovery,
        isOpen: true,
        rows,
        rangeLabel,
        retargetingSummary: isRetargeting ? summarizeRetargetingRows(rows) : null,
        discoverySummary: isDiscovery ? summarizeDiscoveryRows(rows) : null,
        retargetingTakeaways,
        discoveryTakeaways,
        volumeMetric: chooseVolumeMetric(rows),
        efficiencyMetric: chooseEfficiencyMetric(rows),
      };
    });

  // --- Insights section (renderMetaInsights + renderMetaEfficiencyCard) ---
  const bestRoas = highestMonth(meta.months, "blendedRoas");
  const insightTakeaways =
    analysisEntry && Array.isArray(analysisEntry.performance_insights) && analysisEntry.performance_insights.length
      ? analysisEntry.performance_insights
      : [bestRoas ? `${bestRoas.label} posted the strongest blended ROAS at ${formatMultiple(bestRoas.blendedRoas)}.` : "ROAS data is limited for the selected months."];

  const efficiencySorted = meta.rows.slice().sort((a, b) => {
    const aRoas = primaryRoas(a);
    const bRoas = primaryRoas(b);
    const aMissing = !(aRoas > 0);
    const bMissing = !(bRoas > 0);
    if (aMissing && bMissing) return a.monthIndex - b.monthIndex || a.campaignType.localeCompare(b.campaignType);
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (aRoas !== bRoas) return bRoas - aRoas;
    return a.monthIndex - b.monthIndex || a.campaignType.localeCompare(b.campaignType);
  });
  const validRoasValues = efficiencySorted.map((row) => primaryRoas(row)).filter((value) => value > 0);
  const bestRoasValue = validRoasValues.length ? Math.max(...validRoasValues) : 0;

  const efficiencyRows = efficiencySorted.map((row) => {
    const roas = primaryRoas(row);
    const hasRoas = roas > 0;
    const score = hasRoas && bestRoasValue > 0 ? roas / bestRoasValue : 0;
    const barWidth = hasRoas ? Math.max(14, Math.min(100, 16 + score * 84)) : 12;
    const barColor = hasRoas ? monthColor(row.monthIndex) : "#cbd5e1";
    return {
      key: `${row.key}-${row.campaignType}`,
      shortLabel: row.shortLabel,
      campaignType: row.campaignType,
      monthIndex: row.monthIndex,
      hasRoas,
      roas,
      barWidth,
      barColor,
      monthBg: monthLightColor(row.monthIndex),
      monthColor: monthColor(row.monthIndex),
    };
  });

  // --- Comparison table (renderMetaComparisonTable) ---
  const showDirectRevenueColumn = canonicalSlug === "reflections-resorts";
  const directRevenueByMonth: Record<string, number> = {};
  if (showDirectRevenueColumn) {
    allRoiMonths.forEach((m) => {
      directRevenueByMonth[m.key] = m.directRevenue;
    });
  }
  const comparisonRows = meta.rows
    .slice()
    .sort((a, b) => (a.key !== b.key ? b.key.localeCompare(a.key) : a.campaignType.localeCompare(b.campaignType)))
    .map((row) => ({
      key: row.key,
      monthIndex: row.monthIndex,
      shortLabel: row.shortLabel,
      campaignType: row.campaignType,
      spend: row.spend,
      revenue: row.revenue,
      directRevenue: showDirectRevenueColumn ? directRevenueByMonth[row.key] || 0 : null,
      roas: primaryRoas(row),
      impressions: row.impressions,
      profileVisits: row.profileVisits,
      leadsFollowers: row.leadsFollowers,
      igBioLeads: row.igBioLeads,
      bookingsEmail: row.bookingsEmail,
      bookingsFb: row.bookingsFb,
      costPerBooking: row.costPerBooking,
      pctAvgBookingValue: row.pctAvgBookingValue,
    }));

  return {
    hasData: true,
    isComingSoon: false,
    clientName,
    selectedMonthLabel: formatMonthKey(selectedMonth),
    meta,
    legendMonths,
    summaryStrip,
    portfolio,
    highlightCards,
    campaignSections,
    insights: { takeaways: insightTakeaways, periodLabel: meta.months.length ? formatMetaMonthRange(meta.months) : "", efficiencyRows },
    comparisonRows,
    showDirectRevenueColumn,
  };
}

// Re-exported formatting helpers used verbatim across Meta components so they
// don't each need to import from ./format directly for every single helper.
export {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatCompactNumber,
  formatMultiple,
  formatNullableNumber,
  formatNullableCurrency,
  formatNullablePercent,
  formatPercent,
  monthColor,
  monthLightColor,
  round2,
  roundUpAxis,
  roundUpValue,
  chooseAxisStep,
  buildTrendAxisBounds,
};
