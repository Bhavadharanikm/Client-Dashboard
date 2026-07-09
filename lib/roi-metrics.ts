// Ported from Main Page/Dashboard/dashboard.js — ROI view derivation logic
// (buildRoiMetrics, getHistoricalMonthKeys, summarizeRoi, renderRoiDashboard's
// computed fields, and buildRoiCharts' series/axis prep), reshaped into a pure
// buildRoiViewModel() function that returns everything the 7 ROI sections need.

import type { PerformanceRow, PerformanceWorkbook } from "./roi-model";
import { canonicalizeClientSlug, getMetaRows, getPerformanceRoiRows, toMonthKey } from "./roi-model";
import type { RoiAnalysis } from "./server/data";
import {
  estimatePreviousTotal,
  formatCurrency,
  formatMonthKey,
  formatNumber,
  formatPercent,
  formatPercentPoints,
  formatRoiCompactCurrency,
  formatRoiCompactNumber,
  formatShortMonthKey,
  formatShortMonthYearKey,
  formatShortMonthYearKeyCompact,
  formatSignedNumber,
  highestMonth,
  numeric,
  parsePercentText,
  percentDelta,
  round2,
  share,
  sumMetric,
  averageMetric,
} from "./format";
import { buildCurrencyAxisBounds, buildTrendAxisBounds, paddedAxisBounds, roiSharedAxis } from "./chart-utils";
import { peakBadge, trendBadge } from "./tone";

export type RoiMonth = {
  key: string;
  label: string;
  shortLabel: string;
  totalViews: number;
  totalViewGrowthText: string;
  totalViewGrowthValue: number;
  igViews: number;
  fbViews: number;
  tiktokViews: number;
  igFollowers: number;
  fbFollowers: number;
  tiktokFollowers: number;
  totalFollowers: number;
  netNewFollowers: number;
  followerGrowth: number;
  followerCost: number;
  newLeads: number;
  totalLeads: number;
  leadGrowth: number;
  leadCost: number;
  websiteTraffic: number;
  adSpend: number;
  totalRevenue: number;
  totalRevenueLy: number;
  directRevenue: number;
  directRevenueLy: number;
  directSplit: number;
  // Raw values preserved for N/A / missing display logic
  igViewsRaw: unknown;
  fbViewsRaw: unknown;
  tiktokViewsRaw: unknown;
  igFollowersRaw: unknown;
  fbFollowersRaw: unknown;
  tiktokFollowersRaw: unknown;
  newLeadsRaw: unknown;
  totalLeadsRaw: unknown;
  websiteTrafficRaw: unknown;
  adSpendRaw: unknown;
  totalRevenueRaw: unknown;
  directRevenueRaw: unknown;
  directSplitRaw: unknown;
  followerGrowthRaw: unknown;
  leadGrowthRaw: unknown;
};

/** Ported verbatim from getHistoricalMonthKeys(). */
export function getHistoricalMonthKeys(rows: PerformanceRow[], selectedMonth: string, limit: number): string[] {
  const monthSet = rows.reduce<Set<string>>((set, row) => {
    const key = toMonthKey(row.year, row.month);
    if (key <= selectedMonth) {
      set.add(key);
    }
    return set;
  }, new Set());

  return Array.from(monthSet).sort().slice(-limit);
}

/** Ported verbatim from getAllMonthKeys() (roi-rows variant used by dashboard.js's own helper of the same name). */
export function getAllRoiMonthKeys(rows: PerformanceRow[]): string[] {
  return Array.from(
    rows.reduce<Set<string>>((set, row) => {
      set.add(toMonthKey(row.year, row.month));
      return set;
    }, new Set())
  ).sort();
}

/** Ported verbatim from buildRoiMetrics(). */
export function buildRoiMetrics(monthKeys: string[], roiRows: PerformanceRow[]): RoiMonth[] {
  const roiMap = roiRows.reduce<Record<string, PerformanceRow>>((accumulator, row) => {
    accumulator[toMonthKey(row.year, row.month)] = row;
    return accumulator;
  }, {});

  return monthKeys
    .map((key, index) => {
      const roi = roiMap[key];
      if (!roi) {
        return null;
      }

      const previous = index > 0 ? roiMap[monthKeys[index - 1]] || null : null;
      const igFollowers = numeric(roi.ig_followers);
      const fbFollowers = numeric(roi.fb_followers);
      const tiktokFollowers = numeric(roi.tiktok_followers);
      const totalFollowers = igFollowers + fbFollowers + tiktokFollowers;
      const previousFollowers = previous
        ? numeric(previous.ig_followers) + numeric(previous.fb_followers) + numeric(previous.tiktok_followers)
        : estimatePreviousTotal(totalFollowers, roi.follower_growth_pct);
      const igViews = numeric(roi.ig_views);
      const fbViews = numeric(roi.fb_views);
      const tiktokViews = numeric(roi.tiktok_views);
      const totalViews = igViews + fbViews + tiktokViews;

      const month: RoiMonth = {
        key,
        label: formatMonthKey(key),
        shortLabel: formatShortMonthKey(key),
        totalViews,
        totalViewGrowthText: (roi.total_view_growth as string) || "",
        totalViewGrowthValue: parsePercentText(roi.total_view_growth),
        igViews,
        fbViews,
        tiktokViews,
        igFollowers,
        fbFollowers,
        tiktokFollowers,
        totalFollowers,
        netNewFollowers: Math.max(0, totalFollowers - previousFollowers),
        followerGrowth: numeric(roi.follower_growth_pct),
        followerCost: numeric(roi.cost_per_follower),
        newLeads: numeric(roi.new_leads),
        totalLeads: numeric(roi.ttl_leads),
        leadGrowth: numeric(roi.lead_growth_pct),
        leadCost: numeric(roi.cost_per_lead),
        websiteTraffic: numeric(roi.website_traffic),
        adSpend: numeric(roi.ad_spend),
        totalRevenue: numeric(roi.total_booking_revenue),
        totalRevenueLy: numeric(roi.ly_total_booking_revenue),
        directRevenue: numeric(roi.direct_booking_revenue),
        directRevenueLy: numeric(roi.ly_direct_booking_revenue),
        directSplit: numeric(roi.direct_booking_split_pct),
        igViewsRaw: roi.ig_views,
        fbViewsRaw: roi.fb_views,
        tiktokViewsRaw: roi.tiktok_views,
        igFollowersRaw: roi.ig_followers,
        fbFollowersRaw: roi.fb_followers,
        tiktokFollowersRaw: roi.tiktok_followers,
        newLeadsRaw: roi.new_leads,
        totalLeadsRaw: roi.ttl_leads,
        websiteTrafficRaw: roi.website_traffic,
        adSpendRaw: roi.ad_spend,
        totalRevenueRaw: roi.total_booking_revenue,
        directRevenueRaw: roi.direct_booking_revenue,
        directSplitRaw: roi.direct_booking_split_pct,
        followerGrowthRaw: roi.follower_growth_pct,
        leadGrowthRaw: roi.lead_growth_pct,
      };
      return month;
    })
    .filter((month): month is RoiMonth => month !== null);
}

/** Ported verbatim from summarizeRoi(). */
export function summarizeRoi(months: RoiMonth[]) {
  const totalRevenue = sumMetric(months, "totalRevenue");
  const directRevenue = sumMetric(months, "directRevenue");
  const newLeads = sumMetric(months, "newLeads");

  return {
    totalViews: sumMetric(months, "totalViews"),
    igViews: sumMetric(months, "igViews"),
    fbViews: sumMetric(months, "fbViews"),
    tiktokViews: sumMetric(months, "tiktokViews"),
    totalFollowers: sumMetric(months, "totalFollowers"),
    igFollowers: sumMetric(months, "igFollowers"),
    fbFollowers: sumMetric(months, "fbFollowers"),
    tiktokFollowers: sumMetric(months, "tiktokFollowers"),
    netNewFollowers: months.length ? Math.max(0, months[months.length - 1].totalFollowers - months[0].totalFollowers) : 0,
    newLeads,
    totalRevenue,
    directRevenue,
    directSplitShare: totalRevenue ? directRevenue / totalRevenue : 0,
    avgDirectSplit: averageMetric(months, "directSplit"),
    websiteTraffic: sumMetric(months, "websiteTraffic"),
    adSpend: sumMetric(months, "adSpend"),
    avgCostPerLead: averageMetric(months, "leadCost"),
    avgCostPerFollower: averageMetric(months, "followerCost"),
  };
}

export type MetaSpendRow = {
  key: string;
  spend: number;
};

/**
 * Meta Ads rows are only used by the ROI view for total ad spend (metaSpendTotal)
 * and the "currentMetaMonth" lookup for websiteTotalAdSpend. Full Meta-row
 * modeling (buildMetaModel) lands in Phase 5 — this is a minimal local shape.
 */
function buildMinimalMetaSpendRows(metaRows: PerformanceRow[], monthKeys: string[]): MetaSpendRow[] {
  const allowed = new Set(monthKeys);
  return metaRows
    .filter((row) => allowed.has(toMonthKey(row.year, row.month)))
    .map((row) => ({ key: toMonthKey(row.year, row.month), spend: numeric(row.spend) }));
}

export type FunnelStage = {
  fillRatio: number;
  value: string;
};

export type RoiViewModel = {
  hasData: boolean;
  clientName: string;
  dateRangeLabel: string;
  takeawayPeriodLabel: string;
  roiMonths: RoiMonth[];
  allRoiMonths: RoiMonth[];
  latestMonth: RoiMonth | null;
  firstMonth: RoiMonth | null;
  previousMonth: RoiMonth | null;

  executiveSummary: {
    summaryNewFollowers: string;
    summaryTotalImpressions: string;
    summaryTotalRevenue: string;
    summaryAvgCostPerLead: string;
    summaryNewLeads: string;
    summaryDirectSplitAvg: string;
    summaryNote1: string;
    summaryNote2: string;
    summaryNote3: string;
    summaryAvgCostPerLeadNote: string;
    summaryNote5: string;
    summaryNote6: string;
    overviewItems: string[];
  };

  funnel: {
    views: FunnelStage;
    followers: FunnelStage;
    sessions: FunnelStage;
    leads: FunnelStage;
    revenue: FunnelStage;
    followersConv: string;
    trafficConv: string;
    leadsConv: string;
    revenueConv: string;
    costFollower: string;
    costLead: string;
    revenuePerSpend: string;
    revenuePerSpendNote: string;
  };

  awareness: {
    contentInstagramViews: string;
    contentMetaViews: string;
    contentTiktokViews: string;
    contentTiktokPeakText: string;
    contentTotalViewsDisplay: string;
    contentTotalViewsSubcopy: string;
    contentMetaShareText: string;
    contentInstagramShareText: string;
    contentTiktokShareText: string;
    contentMetaNote: string;
    contentInstagramNote: string;
    contentMetaShareRatio: number;
    contentInstagramShareRatio: number;
    contentTiktokShareRatio: number;
    contentPeakPill: string;
    contentViewsChartSub: string;
    chart: {
      shortLabels: string[];
      igSeries: number[];
      fbSeries: number[];
      tiktokSeries: number[];
    };
  };

  audience: {
    audienceTotalFollowers: string;
    audienceTotalMonthLabel: string;
    audienceGrowthBadge: { tone: "positive" | "negative" | "neutral"; text: string };
    audienceStartedFollowersLabel: string;
    audienceStartedFollowers: string;
    audienceNetNewFollowersLabel: string;
    audienceNetNewFollowers: string;
    audienceInstagramFollowers: string;
    audienceInstagramMonthLabel: string;
    audienceInstagramNote: { tone: "positive" | "negative" | "neutral"; text: string };
    audienceInstagramStartLabel: string;
    audienceInstagramStart: string;
    audienceInstagramNetNewLabel: string;
    audienceInstagramShare: string;
    audienceFacebookFollowers: string;
    audienceFacebookMonthLabel: string;
    audienceFacebookNote: { tone: "positive" | "negative" | "neutral"; text: string };
    audienceFacebookStartLabel: string;
    audienceFacebookStart: string;
    audienceFacebookNetNewLabel: string;
    audienceFacebookShare: string;
    audienceCostPerFollower: string;
    audienceTiktokMonthLabel: string;
    audienceCostPerFollowerNote: { tone: "positive" | "negative" | "neutral"; text: string };
    audienceTiktokStartLabel: string;
    audienceTiktokFollowers: string;
    audienceTiktokNetNewLabel: string;
    audienceTiktokGrowth: string;
    audienceDistributionSub: string;
    followersChart: {
      shortLabels: string[];
      igSeries: number[];
      fbSeries: number[];
      tiktokSeries: number[];
    };
    donutChart: {
      series: number[];
      totalLabel: string;
      totalValue: string;
    };
  };

  leadGeneration: {
    leadNewLeadsValue: string;
    leadNewLeadsMonthLabel: string;
    leadNewLeadsNote: string;
    leadPipelineGrowth: string;
    leadTotalPipeline: string;
    leadPipelineMonthLabel: string;
    leadPipelineNote: string;
    leadAvgCostPerLead: string;
    leadGrowthMonthLabel: string;
    leadGrowthNote: string;
    newLeadsChartSub: string;
    totalLeadsChartSub: string;
    newLeadsChart: { shortLabels: string[]; series: number[] };
    totalLeadsChart: { shortLabels: string[]; series: number[]; axis: { min: number; max: number | undefined } };
  };

  websiteTraffic: {
    websiteTotalSessions: string;
    websiteSessionsMonthLabel: string;
    websiteTotalSessionsNote: string;
    websitePeakLabel: string;
    websitePeakValue: string;
    websiteTotalAdSpend: string;
    websiteTotalAdSpendNote: string;
    websiteTrafficChartSub: string;
    chart: { shortLabels: string[]; series: number[] };
  };

  revenueBookings: {
    revenueTotalValue: string;
    revenueTotalMonthLabel: string;
    revenuePastMonthLabel: string;
    revenueDirectValue: string;
    revenueDirectMonthLabel: string;
    revenueDirectShareValue: string;
    revenueDirectPastMonthLabel: string;
    revenueDirectPeakMonth: string;
    revenueDirectSplitAvg: string;
    revenueSplitMonthLabel: string;
    revenueVsLastYear: string;
    revenuePeakMonth: string;
    revenueSplitDirectValue: string;
    revenueSplitPastMonthLabel: string;
    revenueSplitPeakMonth: string;
    revenueChartSub: string;
    bookingSplitChartSub: string;
    revenueChart: { compactLabels: string[]; totalSeries: number[]; directSeries: number[] };
    bookingSplitChart: { shortLabels: string[]; series: number[] };
    revenueLyChart: {
      labels: string[];
      totalSeries: number[];
      directSeries: number[];
      lySeries: number[] | null;
      axis: { min: number; max: number; tickAmount: number };
    };
  };
};

function buildEmptyViewModel(clientName: string, selectedMonth: string): RoiViewModel {
  const emptyTrend = { tone: "neutral" as const, text: "0%" };
  const emptyFunnelStage = { fillRatio: 0, value: "0" };
  return {
    hasData: false,
    clientName,
    dateRangeLabel: `Social · ${formatMonthKey(selectedMonth)}`,
    takeawayPeriodLabel: "",
    roiMonths: [],
    allRoiMonths: [],
    latestMonth: null,
    firstMonth: null,
    previousMonth: null,
    executiveSummary: {
      summaryNewFollowers: "0",
      summaryTotalImpressions: "0",
      summaryTotalRevenue: "$0",
      summaryAvgCostPerLead: "0",
      summaryNewLeads: "0",
      summaryDirectSplitAvg: "0%",
      summaryNote1: "",
      summaryNote2: "",
      summaryNote3: "",
      summaryAvgCostPerLeadNote: "As of selected month",
      summaryNote5: "",
      summaryNote6: "",
      overviewItems: [
        "No workbook performance data was found for the selected client and month range.",
        "Try another month or load a client with available historical reporting.",
      ],
    },
    funnel: {
      views: emptyFunnelStage,
      followers: emptyFunnelStage,
      sessions: emptyFunnelStage,
      leads: emptyFunnelStage,
      revenue: { fillRatio: 0, value: "$0" },
      followersConv: "↓ to followers ↓",
      trafficConv: "↓ to sessions ↓",
      leadsConv: "↓ to leads ↓",
      revenueConv: "↓ to revenue ↓",
      costFollower: "$0.00",
      costLead: "$0.00",
      revenuePerSpend: "$0",
      revenuePerSpendNote: "$0 spend → $0 revenue",
    },
    awareness: {
      contentInstagramViews: "0",
      contentMetaViews: "0",
      contentTiktokViews: "0",
      contentTiktokPeakText: "Growing",
      contentTotalViewsDisplay: "0",
      contentTotalViewsSubcopy: "Across all platforms",
      contentMetaShareText: "0%",
      contentInstagramShareText: "0%",
      contentTiktokShareText: "0%",
      contentMetaNote: "0% of total",
      contentInstagramNote: "0% of total",
      contentMetaShareRatio: 0,
      contentInstagramShareRatio: 0,
      contentTiktokShareRatio: 0,
      contentPeakPill: "Peak -",
      contentViewsChartSub: "Platform breakdown",
      chart: { shortLabels: [], igSeries: [], fbSeries: [], tiktokSeries: [] },
    },
    audience: {
      audienceTotalFollowers: "0",
      audienceTotalMonthLabel: "(Selected month)",
      audienceGrowthBadge: emptyTrend,
      audienceStartedFollowersLabel: "(Previous month)",
      audienceStartedFollowers: "0",
      audienceNetNewFollowersLabel: "Net New (Selected month)",
      audienceNetNewFollowers: "0",
      audienceInstagramFollowers: "0",
      audienceInstagramMonthLabel: "(Selected month)",
      audienceInstagramNote: emptyTrend,
      audienceInstagramStartLabel: "(Previous month)",
      audienceInstagramStart: "0",
      audienceInstagramNetNewLabel: "Net New (Selected month)",
      audienceInstagramShare: "0",
      audienceFacebookFollowers: "0",
      audienceFacebookMonthLabel: "(Selected month)",
      audienceFacebookNote: emptyTrend,
      audienceFacebookStartLabel: "(Previous month)",
      audienceFacebookStart: "0",
      audienceFacebookNetNewLabel: "Net New (Selected month)",
      audienceFacebookShare: "0%",
      audienceCostPerFollower: "0",
      audienceTiktokMonthLabel: "(Selected month)",
      audienceCostPerFollowerNote: { tone: "neutral", text: "3-month total" },
      audienceTiktokStartLabel: "(Previous month)",
      audienceTiktokFollowers: "0",
      audienceTiktokNetNewLabel: "Net New (Selected month)",
      audienceTiktokGrowth: "0%",
      audienceDistributionSub: "Latest month snapshot",
      followersChart: { shortLabels: [], igSeries: [], fbSeries: [], tiktokSeries: [] },
      donutChart: { series: [], totalLabel: "Followers", totalValue: "0" },
    },
    leadGeneration: {
      leadNewLeadsValue: "0",
      leadNewLeadsMonthLabel: "(Selected month)",
      leadNewLeadsNote: "Selected month",
      leadPipelineGrowth: "0",
      leadTotalPipeline: "0",
      leadPipelineMonthLabel: "(Selected month)",
      leadPipelineNote: "Current - previous month",
      leadAvgCostPerLead: "0",
      leadGrowthMonthLabel: "(Selected month)",
      leadGrowthNote: "Growth from previous month to current month",
      newLeadsChartSub: "Monthly lead acquisition",
      totalLeadsChartSub: "Cumulative leads",
      newLeadsChart: { shortLabels: [], series: [] },
      totalLeadsChart: { shortLabels: [], series: [], axis: { min: 0, max: undefined } },
    },
    websiteTraffic: {
      websiteTotalSessions: "0",
      websiteSessionsMonthLabel: "(Selected month)",
      websiteTotalSessionsNote: "Selected month",
      websitePeakLabel: "Peak Month",
      websitePeakValue: "0",
      websiteTotalAdSpend: "$0",
      websiteTotalAdSpendNote: "Selected month",
      websiteTrafficChartSub: "Monthly sessions",
      chart: { shortLabels: [], series: [] },
    },
    revenueBookings: {
      revenueTotalValue: "$0",
      revenueTotalMonthLabel: "(Selected month)",
      revenuePastMonthLabel: "Past Month",
      revenueDirectValue: "$0",
      revenueDirectMonthLabel: "(Selected month)",
      revenueDirectShareValue: "0%",
      revenueDirectPastMonthLabel: "Past Month",
      revenueDirectPeakMonth: "-",
      revenueDirectSplitAvg: "0%",
      revenueSplitMonthLabel: "(Selected month)",
      revenueVsLastYear: "$0",
      revenuePeakMonth: "-",
      revenueSplitDirectValue: "0%",
      revenueSplitPastMonthLabel: "Past Month",
      revenueSplitPeakMonth: "-",
      revenueChartSub: "Monthly revenue comparison",
      bookingSplitChartSub: "Monthly direct percentage",
      revenueChart: { compactLabels: [], totalSeries: [], directSeries: [] },
      bookingSplitChart: { shortLabels: [], series: [] },
      revenueLyChart: { labels: [], totalSeries: [], directSeries: [], lySeries: [], axis: { min: 0, max: 10, tickAmount: 4 } },
    },
  };
}

/**
 * Builds the entire ROI view model in one shot, mirroring renderRoiDashboard() +
 * buildRoiCharts() from the original. selectedMonth is the COMMITTED month from
 * useDashboardState (not a pending value).
 */
export function buildRoiViewModel(
  workbook: PerformanceWorkbook,
  roiAnalysis: RoiAnalysis,
  clientName: string,
  clientSlug: string,
  selectedMonth: string
): RoiViewModel {
  const canonicalSlug = canonicalizeClientSlug(clientSlug);
  const roiRows = getPerformanceRoiRows(workbook, canonicalSlug);
  const metaRows = getMetaRows(workbook, canonicalSlug);

  const roiMonths = buildRoiMetrics(getHistoricalMonthKeys(roiRows, selectedMonth, 3), roiRows);
  const allRoiMonths = buildRoiMetrics(getAllRoiMonthKeys(roiRows), roiRows);

  if (!roiMonths.length) {
    return buildEmptyViewModel(clientName, selectedMonth);
  }

  const metaSpendRows = buildMinimalMetaSpendRows(metaRows, roiMonths.map((m) => m.key));
  const totals = summarizeRoi(roiMonths);
  const metaSpendTotal = sumMetric(metaSpendRows, "spend");
  const effectiveAdSpend = metaSpendTotal > 0 ? metaSpendTotal : totals.adSpend;
  const peakViewsMonth = highestMonth(roiMonths, "totalViews");
  const peakTrafficMonth = highestMonth(roiMonths, "websiteTraffic");
  const peakLeadsMonth = highestMonth(roiMonths, "newLeads");
  const peakRevenueMonth = highestMonth(roiMonths, "totalRevenue");

  const latestMonth = roiMonths[roiMonths.length - 1];
  const firstMonth = roiMonths[0];
  const previousMonth = roiMonths.length > 1 ? roiMonths[roiMonths.length - 2] : null;
  const latestFollowers = numeric(latestMonth.totalFollowers);
  const startedFollowers = previousMonth ? numeric(previousMonth.totalFollowers) : 0;
  const netNewFollowers = latestFollowers - startedFollowers;

  const latestMonthLabel = latestMonth.label;

  // --- Executive Summary ---
  const defaultOverviewItems = [
    peakViewsMonth
      ? `${peakViewsMonth.label} delivered the strongest visibility with ${formatNumber(peakViewsMonth.totalViews)} total views.`
      : "View data is available from the workbook for the selected months.",
    `Social following grew from ${formatNumber(startedFollowers)} to ${formatNumber(latestFollowers)}, adding ${formatNumber(netNewFollowers)} net new followers.`,
    `The selected range generated ${formatNumber(totals.newLeads)} new leads with an average cost per lead of ${formatCurrency(totals.avgCostPerLead)}.`,
    `Website traffic totaled ${formatNumber(totals.websiteTraffic)} sessions while ad spend reached ${formatCurrency(effectiveAdSpend, 0)}.`,
    `Direct booking revenue totaled ${formatCurrency(totals.directRevenue, 0)}, representing a ${formatPercent(totals.directSplitShare, 0)} direct split.`,
    peakRevenueMonth
      ? `${peakRevenueMonth.label} was the top revenue month at ${formatCurrency(peakRevenueMonth.totalRevenue, 0)}.`
      : "Revenue data is loaded from the workbook.",
  ];

  const analysisEntry = getRoiAnalysisEntry(roiAnalysis, canonicalSlug, selectedMonth);
  const overviewItems =
    analysisEntry && Array.isArray(analysisEntry.key_takeaways) && analysisEntry.key_takeaways.length
      ? analysisEntry.key_takeaways
      : defaultOverviewItems;

  // --- Awareness / Content Views ---
  const currentViewsTotal = numeric(latestMonth.totalViews);
  const currentFbViews = numeric(latestMonth.fbViews);
  const currentInstagramViews = numeric(latestMonth.igViews);
  const currentTiktokViews = numeric(latestMonth.tiktokViews);
  const metaShare = share(currentFbViews, currentViewsTotal);
  const instagramShare = share(currentInstagramViews, currentViewsTotal);
  const tiktokShare = share(currentTiktokViews, currentViewsTotal);

  // --- Audience ---
  const instagramStart = previousMonth ? numeric(previousMonth.igFollowers) : 0;
  const instagramCurrent = numeric(latestMonth.igFollowers);
  const instagramNetNew = instagramCurrent - instagramStart;
  const facebookStart = previousMonth ? numeric(previousMonth.fbFollowers) : 0;
  const facebookCurrent = numeric(latestMonth.fbFollowers);
  const facebookNetNew = facebookCurrent - facebookStart;
  const tiktokStart = previousMonth ? numeric(previousMonth.tiktokFollowers) : 0;
  const tiktokCurrent = numeric(latestMonth.tiktokFollowers);
  const tiktokNetNew = tiktokCurrent - tiktokStart;
  const totalPlatformNetNew = instagramNetNew + facebookNetNew + tiktokNetNew;
  const audienceMonthLabel = `(${latestMonth.label})`;
  const previousMonthLabel = previousMonth ? previousMonth.label : "Previous month";
  const currentMonthLabel = latestMonth.label;
  const currentMonthBracketLabel = `(${latestMonth.label})`;

  // --- Website Traffic ---
  const currentMetaMonth = metaSpendRows.length ? metaSpendRows[metaSpendRows.length - 1] : null;

  // --- Lead Generation ---
  const previousPipeline = previousMonth ? numeric(previousMonth.totalLeads) : 0;
  const totalPipeline = numeric(latestMonth.totalLeads);
  const pipelineGrowth = totalPipeline - previousPipeline;
  const currentLeadGrowth = numeric(latestMonth.leadGrowth);
  const previousMonthRevenueLabel = previousMonth ? `Past Month (${previousMonth.label})` : "Past Month";

  // --- Revenue & Bookings ---
  const hideLyRevenue = canonicalSlug === "the-cohost-company";

  // --- Full Funnel Summary ---
  const currentFunnelViews = numeric(latestMonth.totalViews);
  const currentFunnelFollowers = numeric(latestMonth.totalFollowers);
  const currentFunnelSessions = numeric(latestMonth.websiteTraffic);
  const currentFunnelLeads = numeric(latestMonth.newLeads);
  const currentFunnelRevenue = numeric(latestMonth.directRevenue);
  // The original hardcodes these funnel bar widths as a fixed decorative
  // "showcase" shape rather than deriving them from actual conversion ratios —
  // preserved as-is (funnelShowcaseWidths in renderRoiDashboard()).
  const funnelShowcaseWidths = { views: 1, followers: 0.78, sessions: 0.55, leads: 0.34, revenue: 0.14 };

  const shortLabels = roiMonths.map((month) => `${month.shortLabel} '${month.key.slice(2, 4)}`);
  const compactMonthYearLabels = roiMonths.map((month) => formatShortMonthYearKeyCompact(month.key));

  // --- Total Leads chart axis (paddedAxisBounds) ---
  const totalLeadsAxis = paddedAxisBounds(roiMonths.map((m) => m.totalLeads));

  // --- Revenue LY chart axis (buildTrendAxisBounds across allRoiMonths) ---
  const revenueLyAxis = buildTrendAxisBounds(
    allRoiMonths.reduce<number[]>((values, month) => {
      values.push(month.totalRevenue, month.directRevenue);
      if (!hideLyRevenue) values.push(month.totalRevenueLy);
      return values;
    }, []),
    { step: 25000, tightRangeThreshold: 0.3 }
  );

  return {
    hasData: true,
    clientName,
    dateRangeLabel: `Social · ${firstMonth.label} – ${latestMonth.label}`,
    takeawayPeriodLabel: `(${firstMonth.label} – ${latestMonth.label})`,
    roiMonths,
    allRoiMonths,
    latestMonth,
    firstMonth,
    previousMonth,

    executiveSummary: {
      // Field-name-to-content mapping intentionally mirrors the original's
      // quirky wiring (e.g. #summaryNewFollowers actually shows totalRevenueRaw) —
      // ported byte-for-byte from renderRoiDashboard(), not "fixed".
      summaryNewFollowers: formatRoiCompactCurrency(latestMonth.totalRevenueRaw),
      summaryTotalImpressions: formatRoiCompactCurrency(latestMonth.directRevenueRaw),
      summaryTotalRevenue: formatPercent(numeric(latestMonth.directSplitRaw), 0),
      summaryAvgCostPerLead: formatRoiCompactNumber(latestMonth.newLeadsRaw),
      summaryNewLeads: formatRoiCompactNumber(numeric(latestMonth.netNewFollowers)),
      summaryDirectSplitAvg: formatRoiCompactNumber(currentViewsTotal),
      summaryNote1: latestMonthLabel,
      summaryNote2: latestMonthLabel,
      summaryNote3: latestMonthLabel,
      summaryAvgCostPerLeadNote: `As of ${latestMonthLabel}`,
      summaryNote5: latestMonthLabel,
      summaryNote6: latestMonthLabel,
      overviewItems,
    },

    funnel: {
      views: { fillRatio: funnelShowcaseWidths.views, value: formatRoiCompactNumber(currentFunnelViews) },
      followers: { fillRatio: funnelShowcaseWidths.followers, value: formatRoiCompactNumber(currentFunnelFollowers) },
      sessions: { fillRatio: funnelShowcaseWidths.sessions, value: formatRoiCompactNumber(currentFunnelSessions) },
      leads: { fillRatio: funnelShowcaseWidths.leads, value: formatRoiCompactNumber(currentFunnelLeads) },
      revenue: { fillRatio: funnelShowcaseWidths.revenue, value: formatRoiCompactCurrency(currentFunnelRevenue) },
      followersConv: `↓ ${formatPercent(share(currentFunnelFollowers, currentFunnelViews), 1)} to followers ↓`,
      trafficConv: `↓ ${formatPercent(share(currentFunnelSessions, currentFunnelFollowers), 1)} to website sessions ↓`,
      leadsConv: `↓ ${formatPercent(share(currentFunnelLeads, currentFunnelSessions), 1)} to leads ↓`,
      revenueConv: "↓ revenue ↓",
      costFollower: formatCurrency(currentFunnelFollowers ? numeric(latestMonth.adSpend) / currentFunnelFollowers : 0),
      costLead: formatCurrency(currentFunnelLeads ? numeric(latestMonth.adSpend) / currentFunnelLeads : 0),
      revenuePerSpend: `$${round2(
        currentFunnelViews && numeric(latestMonth.adSpend) ? currentFunnelRevenue / numeric(latestMonth.adSpend) : 0
      )}`,
      revenuePerSpendNote: `${formatCurrency(numeric(latestMonth.adSpend), 0)} spend → ${formatCurrency(currentFunnelRevenue, 0)} direct revenue`,
    },

    awareness: {
      contentInstagramViews: formatNumber(latestMonth.igViewsRaw),
      contentMetaViews: formatNumber(latestMonth.fbViewsRaw),
      contentTiktokViews: formatNumber(latestMonth.tiktokViewsRaw),
      contentTiktokPeakText: `${latestMonth.label} current`,
      contentTotalViewsDisplay: formatRoiCompactNumber(currentViewsTotal),
      contentTotalViewsSubcopy: `Across all platforms, ${latestMonth.label}`,
      contentMetaShareText: formatPercent(metaShare, 0),
      contentInstagramShareText: formatPercent(instagramShare, 0),
      contentTiktokShareText: tiktokShare > 0 && tiktokShare < 0.01 ? "<1%" : formatPercent(tiktokShare, 0),
      contentMetaNote: `${formatPercent(metaShare, 0)} of total`,
      contentInstagramNote: `${formatPercent(instagramShare, 0)} of total`,
      contentMetaShareRatio: metaShare,
      contentInstagramShareRatio: instagramShare,
      contentTiktokShareRatio: tiktokShare,
      contentPeakPill: `${latestMonth.shortLabel} current ${formatRoiCompactNumber(currentViewsTotal)}`,
      contentViewsChartSub: `Platform breakdown · ${formatShortMonthYearKey(latestMonth.key)}`,
      chart: {
        shortLabels,
        igSeries: roiMonths.map((m) => m.igViews),
        fbSeries: roiMonths.map((m) => m.fbViews),
        tiktokSeries: roiMonths.map((m) => m.tiktokViews),
      },
    },

    audience: {
      audienceTotalFollowers: formatNumber(latestFollowers),
      audienceTotalMonthLabel: audienceMonthLabel,
      audienceGrowthBadge: trendBadge(percentDelta(startedFollowers, latestFollowers)),
      audienceStartedFollowersLabel: `(${previousMonthLabel})`,
      audienceStartedFollowers: formatNumber(startedFollowers),
      audienceNetNewFollowersLabel: `Net New (${currentMonthLabel})`,
      audienceNetNewFollowers: formatSignedNumber(totalPlatformNetNew),

      audienceInstagramFollowers: formatNumber(latestMonth.igFollowersRaw),
      audienceInstagramMonthLabel: audienceMonthLabel,
      audienceInstagramNote: trendBadge(percentDelta(instagramStart, instagramCurrent)),
      audienceInstagramStartLabel: `(${previousMonthLabel})`,
      audienceInstagramStart: formatNumber(instagramStart),
      audienceInstagramNetNewLabel: `Net New (${currentMonthLabel})`,
      audienceInstagramShare: formatSignedNumber(instagramNetNew),

      audienceFacebookFollowers: formatNumber(latestMonth.fbFollowersRaw),
      audienceFacebookMonthLabel: audienceMonthLabel,
      audienceFacebookNote: trendBadge(percentDelta(facebookStart, facebookCurrent)),
      audienceFacebookStartLabel: `(${previousMonthLabel})`,
      audienceFacebookStart: formatNumber(facebookStart),
      audienceFacebookNetNewLabel: `Net New (${currentMonthLabel})`,
      audienceFacebookShare: formatSignedNumber(facebookNetNew),

      // Ported verbatim: the TikTok card's headline value actually displays
      // tiktokFollowersRaw under the id "audienceCostPerFollower" (a naming
      // leftover in the original — the DOM id doesn't match its content).
      audienceCostPerFollower: formatNumber(latestMonth.tiktokFollowersRaw),
      audienceTiktokMonthLabel: audienceMonthLabel,
      audienceCostPerFollowerNote: trendBadge(percentDelta(tiktokStart, tiktokCurrent)),
      audienceTiktokStartLabel: `(${previousMonthLabel})`,
      audienceTiktokFollowers: formatNumber(tiktokStart),
      audienceTiktokNetNewLabel: `Net New (${currentMonthLabel})`,
      audienceTiktokGrowth: formatSignedNumber(tiktokNetNew),
      audienceDistributionSub: `${latestMonth.label} snapshot`,
      followersChart: {
        shortLabels,
        igSeries: roiMonths.map((m) => m.igFollowers),
        fbSeries: roiMonths.map((m) => m.fbFollowers),
        tiktokSeries: roiMonths.map((m) => m.tiktokFollowers),
      },
      donutChart: {
        series: [latestMonth.igFollowers, latestMonth.fbFollowers, latestMonth.tiktokFollowers],
        totalLabel: `${latestMonth.shortLabel} Followers`,
        totalValue: formatNumber(latestMonth.totalFollowers),
      },
    },

    leadGeneration: {
      leadNewLeadsValue: formatRoiCompactNumber(latestMonth.newLeadsRaw),
      leadNewLeadsMonthLabel: currentMonthBracketLabel,
      leadNewLeadsNote: latestMonth.label,
      leadPipelineGrowth: formatSignedNumber(pipelineGrowth),
      leadTotalPipeline: formatRoiCompactNumber(totalPipeline),
      leadPipelineMonthLabel: currentMonthBracketLabel,
      leadPipelineNote: `Total leads as of ${latestMonth.label}`,
      // Static label reads "Growth %" — this field is indeed a percentage-point
      // growth rate (leadGrowth), not a cost figure, matching the label.
      leadAvgCostPerLead: formatPercentPoints(currentLeadGrowth * 100),
      leadGrowthMonthLabel: currentMonthBracketLabel,
      leadGrowthNote: previousMonth ? `Growth from ${previousMonth.label} to ${latestMonth.label}` : "Growth from previous month to current month",
      newLeadsChartSub: peakLeadsMonth ? `${peakLeadsMonth.label} peak · ${formatNumber(peakLeadsMonth.newLeads)} leads` : "Monthly lead acquisition",
      totalLeadsChartSub: `Cumulative leads · ${formatNumber(firstMonth.totalLeads)} → ${formatNumber(latestMonth.totalLeads)}`,
      newLeadsChart: { shortLabels, series: roiMonths.map((m) => m.newLeads) },
      totalLeadsChart: { shortLabels, series: roiMonths.map((m) => m.totalLeads), axis: totalLeadsAxis },
    },

    websiteTraffic: {
      websiteTotalSessions: formatRoiCompactNumber(latestMonth.websiteTrafficRaw),
      websiteSessionsMonthLabel: currentMonthBracketLabel,
      websiteTotalSessionsNote: latestMonth.label,
      websitePeakLabel: peakTrafficMonth ? `${peakTrafficMonth.shortLabel.toUpperCase()} ${peakTrafficMonth.key.slice(0, 4)} PEAK` : "Peak Month",
      websitePeakValue: peakTrafficMonth ? formatNumber(peakTrafficMonth.websiteTraffic) : "0",
      websiteTotalAdSpend: formatCurrency(currentMetaMonth ? currentMetaMonth.spend : 0, 0),
      websiteTotalAdSpendNote: latestMonth.label,
      websiteTrafficChartSub: peakTrafficMonth
        ? `Monthly sessions · bell curve peaking ${peakTrafficMonth.shortLabel} ${peakTrafficMonth.key.slice(0, 4)}`
        : "Monthly sessions",
      chart: { shortLabels, series: roiMonths.map((m) => m.websiteTraffic) },
    },

    revenueBookings: {
      revenueTotalValue: formatRoiCompactCurrency(latestMonth.totalRevenueRaw),
      revenueTotalMonthLabel: currentMonthBracketLabel,
      revenuePastMonthLabel: previousMonthRevenueLabel,
      revenueDirectValue: formatRoiCompactCurrency(latestMonth.directRevenueRaw),
      revenueDirectMonthLabel: currentMonthBracketLabel,
      revenueDirectShareValue: formatPercent(totals.directSplitShare, 0),
      revenueDirectPastMonthLabel: previousMonthRevenueLabel,
      revenueDirectPeakMonth: previousMonth ? formatRoiCompactCurrency(previousMonth.directRevenueRaw) : "—",
      revenueDirectSplitAvg: formatPercent(numeric(latestMonth.directSplitRaw), 0),
      revenueSplitMonthLabel: currentMonthBracketLabel,
      revenueVsLastYear: formatRoiCompactCurrency(totals.totalRevenue / Math.max(roiMonths.length, 1)),
      revenuePeakMonth: previousMonth ? formatRoiCompactCurrency(previousMonth.totalRevenueRaw) : "—",
      revenueSplitDirectValue: formatPercent(totals.avgDirectSplit, 0),
      revenueSplitPastMonthLabel: previousMonthRevenueLabel,
      revenueSplitPeakMonth: previousMonth ? formatPercent(numeric(previousMonth.directSplitRaw), 0) : "—",
      revenueChartSub: peakRevenueMonth
        ? `${peakRevenueMonth.label} peak · ${formatCurrency(peakRevenueMonth.totalRevenue, 0)}`
        : "Monthly revenue comparison",
      bookingSplitChartSub: "Monthly % · direct bookings",
      revenueChart: {
        compactLabels: compactMonthYearLabels,
        totalSeries: roiMonths.map((m) => m.totalRevenue),
        directSeries: roiMonths.map((m) => m.directRevenue),
      },
      bookingSplitChart: { shortLabels, series: roiMonths.map((m) => m.directSplit * 100) },
      revenueLyChart: {
        labels: allRoiMonths.map((m) => formatShortMonthYearKeyCompact(m.key)),
        totalSeries: allRoiMonths.map((m) => m.totalRevenue),
        directSeries: allRoiMonths.map((m) => m.directRevenue),
        lySeries: hideLyRevenue ? null : allRoiMonths.map((m) => m.totalRevenueLy),
        axis: revenueLyAxis,
      },
    },
  };
}

function findBestAnalysisEntry<T>(store: Record<string, T> | undefined, selectedMonth: string): T | null {
  if (!store) return null;
  if (store[selectedMonth]) return store[selectedMonth];
  const keys = Object.keys(store)
    .filter((k) => k <= selectedMonth)
    .sort();
  if (keys.length) return store[keys[keys.length - 1]];
  return null;
}

function getRoiAnalysisEntry(roiAnalysis: RoiAnalysis, clientSlug: string, selectedMonth: string) {
  const clientData = roiAnalysis[clientSlug];
  if (!clientData || !clientData.roi) return null;
  return findBestAnalysisEntry(clientData.roi, selectedMonth);
}

// Re-exported for convenience so section components can build ApexCharts
// options without importing chart-utils directly for every helper.
export { roiSharedAxis, buildCurrencyAxisBounds };
export { peakBadge };
