"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { MetaCampaignSectionModel, MetaRow } from "@/lib/meta-model";
import {
  primaryRoas,
  totalCampaignBookings,
  formatSignedPercentLabel,
  roundUpAxis,
  roundUpValue,
  chooseAxisStep,
  buildTrendAxisBounds,
} from "@/lib/meta-model";
import { ApexChart } from "@/components/charts/ApexChart";
import {
  metaSharedChart,
  sharedXAxis,
  sharedYAxis,
  sharedGrid,
  sharedLegend,
  buildResponsiveSharedXAxisLabels,
} from "@/lib/chart-utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCompactNumber,
  formatNumber,
  formatMultiple,
  formatNullableNumber,
  formatNullableCurrency,
  formatNullablePercent,
  round2,
  numeric,
  monthColor,
} from "@/lib/format";

function MetaAverageStatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="meta-chart-card meta-retarget-stat-card">
      <div className="meta-retarget-stat-label">{label}</div>
      <div className="meta-retarget-stat-value">{value}</div>
      <div className="meta-retarget-stat-note">{note}</div>
    </div>
  );
}

function MetaCompactSummaryCard({
  label,
  value,
  pillText,
  tone,
}: {
  label: string;
  value: string;
  pillText: string;
  tone: "good" | "warn" | "neutral";
}) {
  return (
    <div className="meta-chart-card meta-compact-summary-card">
      <div className="meta-retarget-stat-label">{label}</div>
      <div className="meta-compact-summary-value">{value}</div>
      {pillText && <span className={`meta-pill metric-${tone}`}>{pillText}</span>}
    </div>
  );
}

function MetaTakeawayCard({ items, periodLabel }: { items: string[]; periodLabel: string }) {
  return (
    <div className="meta-takeaway-card">
      <div className="meta-takeaway-title">
        Key Takeaways
        {periodLabel && (
          <span style={{ fontSize: "0.6em", fontWeight: 500, opacity: 0.5, whiteSpace: "nowrap" }}> ({periodLabel})</span>
        )}
      </div>
      <ul className="meta-takeaway-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetaChartCard({ title, subtitle, id, children }: { title: string; subtitle: string; id: string; children: React.ReactNode }) {
  return (
    <div className="meta-chart-card">
      <div className="meta-chart-title">{title}</div>
      <div className="meta-chart-sub">{subtitle}</div>
      <div id={id}>{children}</div>
    </div>
  );
}

function RetargetingTableRows({ rows }: { rows: MetaRow[] }) {
  return (
    <>
      {rows
        .slice()
        .reverse()
        .map((row, index) => (
          <tr key={`${row.key}-${index}`}>
            <td>
              <span className={`meta-pill month-${row.monthIndex}`}>{row.shortLabel}</span>
            </td>
            <td className="meta-strong">{formatCurrency(row.spend, 2)}</td>
            <td className="meta-strong">{formatCurrency(row.revenue, 0)}</td>
            <td className="meta-strong">{formatMultiple(primaryRoas(row))}</td>
            <td className="meta-strong">{formatNumber(row.impressions)}</td>
            <td className="meta-strong">{formatNumber(row.profileVisits)}</td>
            <td className="meta-strong">{formatNullableNumber(totalCampaignBookings(row))}</td>
            <td className="meta-strong">{formatNullableCurrency(row.costPerBooking)}</td>
            <td className="meta-strong">{formatNullablePercent(row.pctAvgBookingValue)}</td>
          </tr>
        ))}
    </>
  );
}

function DiscoveryTableRows({ rows }: { rows: MetaRow[] }) {
  return (
    <>
      {rows
        .slice()
        .reverse()
        .map((row, index) => (
          <tr key={`${row.key}-${index}`}>
            <td>
              <span className={`meta-pill month-${row.monthIndex}`}>{row.shortLabel}</span>
            </td>
            <td className="meta-strong">{formatCurrency(row.spend, 2)}</td>
            <td className="meta-strong">{formatCurrency(row.revenue, 0)}</td>
            <td className="meta-strong">{formatMultiple(primaryRoas(row))}</td>
            <td className="meta-strong">{formatNumber(row.impressions)}</td>
            <td className="meta-strong">{formatNullableNumber(row.leadsFollowers)}</td>
            <td className="meta-strong">{formatNumber(row.profileVisits)}</td>
            <td className="meta-strong">{formatNullableNumber(totalCampaignBookings(row))}</td>
            <td className="meta-strong">{formatNullableCurrency(row.costPerBooking)}</td>
            <td className="meta-strong">{formatNullablePercent(row.pctAvgBookingValue)}</td>
          </tr>
        ))}
    </>
  );
}

/** Ported from renderMetaCampaignSection() — retargeting / discovery / generic variants. */
export function MetaCampaignSection({ section }: { section: MetaCampaignSectionModel }) {
  const { campaignType, chartKey, isRetargeting, isDiscovery, rows, rangeLabel, retargetingSummary, discoverySummary, retargetingTakeaways, discoveryTakeaways, volumeMetric, efficiencyMetric } = section;

  const campaignMonthLabels = useMemo(() => rows.map((row) => row.shortYearLabel), [rows]);
  const performanceValues = useMemo(() => rows.map((row) => primaryRoas(row)), [rows]);
  const efficiencyValues = useMemo(() => rows.map((row) => numeric(row[efficiencyMetric.key])), [rows, efficiencyMetric.key]);
  const volumeValues = useMemo(() => rows.map((row) => numeric(row[volumeMetric.key])), [rows, volumeMetric.key]);
  const spendValues = useMemo(() => rows.map((row) => numeric(row.spend)), [rows]);
  const revenueValues = useMemo(() => rows.map((row) => numeric(row.revenue)), [rows]);
  const impressionValues = useMemo(() => rows.map((row) => numeric(row.impressions)), [rows]);
  const visitValues = useMemo(() => rows.map((row) => numeric(row.profileVisits)), [rows]);

  const performanceAxis = useMemo(
    () =>
      buildTrendAxisBounds(performanceValues, {
        step: performanceValues.length && Math.max(...performanceValues, 0) <= 20 ? 1 : 5,
        tightRangeThreshold: 0.4,
      }),
    [performanceValues]
  );
  const efficiencyAxis = useMemo(
    () =>
      buildTrendAxisBounds(efficiencyValues, {
        step: chooseAxisStep(Math.max(...efficiencyValues, 0)),
        tightRangeThreshold: 0.4,
      }),
    [efficiencyValues]
  );
  const volumeMax = useMemo(() => roundUpValue(Math.max(...volumeValues, 0)), [volumeValues]);

  const spendRevenueOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: { ...metaSharedChart("bar", isRetargeting ? 240 : 235), offsetX: 0 },
        xaxis: {
          ...sharedXAxis(campaignMonthLabels, { offsetY: 8 }),
          tickPlacement: "between",
          labels: buildResponsiveSharedXAxisLabels(campaignMonthLabels, { offsetY: 8 }),
        },
        yaxis: sharedYAxis((value: number) => formatCurrencyCompact(value), { minWidth: 54, offsetX: 4 }),
        colors: ["#2663EB", "#F7AD43"],
        plotOptions: { bar: { borderRadius: 10, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "54%" } },
        legend: sharedLegend(),
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false, y: { formatter: (value: number) => formatCurrency(value, 0) } },
        grid: sharedGrid({ padding: { left: 18, right: 0, top: 4, bottom: 18 } }),
      }) as unknown as ApexOptions,
    [campaignMonthLabels, isRetargeting]
  );

  const roasMonthMax = useMemo(() => roundUpAxis(Math.max(...performanceValues, 2)), [performanceValues]);
  const roasMonthAxis = useMemo(
    () => buildTrendAxisBounds(performanceValues, { step: roasMonthMax <= 20 ? 1 : 5, tightRangeThreshold: 0.4 }),
    [performanceValues, roasMonthMax]
  );

  const roasLineOptions = (height: number, color: string, max: number, axis: { min: number; max: number; tickAmount: number }): ApexOptions =>
    ({
      chart: metaSharedChart("line", height),
      xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
      yaxis: sharedYAxis((value: number) => `${round2(value)}x`, {
        offsetX: 4,
        minWidth: 52,
        min: axis.min,
        max: Math.max(axis.max, max),
        tickAmount: axis.tickAmount,
      }),
      colors: [color],
      stroke: { width: 3, curve: "smooth", lineCap: "round" },
      markers: { size: 7, hover: { sizeOffset: 1 }, colors: [color], strokeColors: "#ffffff", strokeWidth: 3 },
      grid: sharedGrid({ padding: { left: 16, right: 10, top: 10, bottom: 18 } }),
      legend: { show: false },
      tooltip: { shared: false, intersect: true, y: { formatter: (value: number) => formatMultiple(value) } },
      dataLabels: { enabled: false },
    }) as unknown as ApexOptions;

  // --- Discovery-only: impressions vs visits log-ish scale chart ---
  const impressionsVisitsMax = useMemo(() => roundUpValue(Math.max(...impressionValues, ...visitValues, 0)), [impressionValues, visitValues]);
  const impressionsVisitScaleStops = useMemo(() => {
    const stops = [0, 2000, 10000, 38000, 78000, 112000];
    if (impressionsVisitsMax > stops[stops.length - 1]) stops.push(impressionsVisitsMax);
    return stops;
  }, [impressionsVisitsMax]);

  const transformImpressionsVisitValue = useMemo(() => {
    return (value: number): number => {
      const numericValue = Math.max(0, numeric(value));
      for (let index = 0; index < impressionsVisitScaleStops.length - 1; index += 1) {
        const start = impressionsVisitScaleStops[index];
        const end = impressionsVisitScaleStops[index + 1];
        if (numericValue <= end) {
          const span = Math.max(1, end - start);
          return index + (numericValue - start) / span;
        }
      }
      return impressionsVisitScaleStops.length - 1;
    };
  }, [impressionsVisitScaleStops]);

  const transformedImpressionValues = useMemo(
    () => impressionValues.map(transformImpressionsVisitValue),
    [impressionValues, transformImpressionsVisitValue]
  );
  const transformedVisitValues = useMemo(
    () => visitValues.map(transformImpressionsVisitValue),
    [visitValues, transformImpressionsVisitValue]
  );

  const roasMax = useMemo(() => roundUpAxis(Math.max(...performanceValues, 2)), [performanceValues]);
  const roasAxis = useMemo(() => buildTrendAxisBounds(performanceValues, { step: roasMax <= 20 ? 1 : 5, tightRangeThreshold: 0.4 }), [performanceValues, roasMax]);

  const impressionsVisitsOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: metaSharedChart("line", 290),
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 2 }),
        yaxis: sharedYAxis(
          (value: number) => {
            const roundedIndex = Math.round(value);
            if (Math.abs(value - roundedIndex) > 0.001 || roundedIndex < 0 || roundedIndex >= impressionsVisitScaleStops.length) {
              return "";
            }
            return formatCompactNumber(impressionsVisitScaleStops[roundedIndex]);
          },
          { offsetX: 4, minWidth: 52, min: 0, max: impressionsVisitScaleStops.length - 1, tickAmount: impressionsVisitScaleStops.length - 1 }
        ),
        colors: ["#2663EB", "#12B981"],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: { size: 6, hover: { sizeOffset: 1 }, strokeColors: "#ffffff", strokeWidth: 3 },
        grid: sharedGrid({ padding: { left: 16, right: 10, top: 6, bottom: 4 } }),
        legend: { ...sharedLegend(), offsetY: 10, itemMargin: { horizontal: 12, vertical: 0 } },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (_value: number, context: { seriesIndex?: number; dataPointIndex?: number } | undefined) => {
              if (!context) return "";
              const sourceValues = context.seriesIndex === 0 ? impressionValues : visitValues;
              return formatNumber(sourceValues[context.dataPointIndex ?? 0]);
            },
          },
        },
        dataLabels: { enabled: false },
      }) as unknown as ApexOptions,
    [campaignMonthLabels, impressionsVisitScaleStops, impressionValues, visitValues]
  );

  // --- Generic (non-discovery/retargeting) campaign: performance / volume / efficiency ---
  const performanceOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: metaSharedChart("line", 250),
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis((value: number) => `${round2(value)}x`, {
          offsetX: -8,
          minWidth: 52,
          min: performanceAxis.min,
          max: performanceAxis.max,
          tickAmount: performanceAxis.tickAmount,
        }),
        colors: [monthColor(1)],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: { size: 7, hover: { sizeOffset: 1 }, colors: [monthColor(1)], strokeColors: "#ffffff", strokeWidth: 3 },
        grid: sharedGrid({ padding: { left: 12, right: 10, top: 10, bottom: 18 } }),
        legend: { show: false },
        tooltip: { shared: false, intersect: true, y: { formatter: (value: number) => formatMultiple(value) } },
        dataLabels: { enabled: false },
      }) as unknown as ApexOptions,
    [campaignMonthLabels, performanceAxis]
  );

  const volumeOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: metaSharedChart("bar", 250),
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis((value: number) => formatNumber(value), { minWidth: 42, offsetX: -8, min: 0, max: volumeMax, tickAmount: 4 }),
        colors: rows.map((row) => monthColor(row.monthIndex)),
        plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: "52%" } },
        tooltip: { y: { formatter: (value: number) => formatNumber(value) } },
        legend: { show: false },
        dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 600 } },
        grid: sharedGrid({ padding: { left: 0, right: 8, top: 6, bottom: 18 } }),
      }) as unknown as ApexOptions,
    [campaignMonthLabels, volumeMax, rows]
  );

  const efficiencyOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: metaSharedChart("line", 250),
        xaxis: sharedXAxis(campaignMonthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis((value: number) => `$${round2(value)}`, {
          offsetX: -8,
          minWidth: 52,
          min: efficiencyAxis.min,
          max: efficiencyAxis.max,
          tickAmount: efficiencyAxis.tickAmount,
        }),
        colors: [monthColor(0)],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: { size: 7, hover: { sizeOffset: 1 }, colors: [monthColor(0)], strokeColors: "#ffffff", strokeWidth: 3 },
        grid: sharedGrid({ padding: { left: 12, right: 10, top: 10, bottom: 18 } }),
        legend: { show: false },
        tooltip: { shared: false, intersect: true, y: { formatter: (value: number) => (value ? formatCurrency(value) : "—") } },
        dataLabels: { enabled: false },
      }) as unknown as ApexOptions,
    [campaignMonthLabels, efficiencyAxis]
  );

  return (
    <div className="meta-section" data-meta-campaign-section={chartKey} style={{ margin: "26px 0 20px" }}>
      <div className="meta-stage">
        <div className="meta-stage-copy">
          <span className="meta-stage-num">—</span>
          <span className="meta-stage-title">{campaignType} Campaign</span>
          <div className="meta-stage-line" />
        </div>
        <div className="meta-stage-anchor" />
      </div>

      <div className="meta-campaign-table-card">
        <div className="meta-campaign-table-wrap">
          <table className="meta-campaign-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Spend</th>
                <th>Revenue</th>
                <th>ROAS</th>
                <th>Impressions</th>
                {!isRetargeting && <th>Followers</th>}
                <th>Page Visits</th>
                <th>Bookings</th>
                <th>Cost/Booking</th>
                <th>Cost/Booking %</th>
              </tr>
            </thead>
            <tbody>{isRetargeting ? <RetargetingTableRows rows={rows} /> : <DiscoveryTableRows rows={rows} />}</tbody>
          </table>
        </div>
      </div>

      {isRetargeting && retargetingSummary && (
        <div className="meta-retarget-feature-grid" style={{ marginTop: 22 }}>
          <div className="meta-retarget-kpi-stack">
            <MetaAverageStatCard label="Cost/booking average" value={formatCurrency(retargetingSummary.avgCostPerBooking)} note={retargetingSummary.avgPeriodLabel} />
            <MetaAverageStatCard label="Avg booking value" value={formatCurrency(retargetingSummary.avgBookingValue)} note={retargetingSummary.avgPeriodLabel} />
            <MetaAverageStatCard label="Avg ROAS" value={formatMultiple(retargetingSummary.avgRoas)} note={retargetingSummary.avgPeriodLabel} />
          </div>
          <MetaChartCard title="Spend vs attributed revenue" subtitle="Total monthly ad spend vs total revenue generated" id={`meta-${chartKey}-spend-revenue`}>
            <ApexChart
              options={spendRevenueOptions}
              series={[
                { name: "Spend", data: spendValues },
                { name: "Attributed revenue", data: revenueValues },
              ]}
              type="bar"
              height={240}
            />
          </MetaChartCard>
        </div>
      )}

      {isRetargeting && (
        <div className="meta-chart-grid meta-chart-grid-2" style={{ marginTop: 22 }}>
          <MetaChartCard title="ROAS by month" subtitle="Shows how efficiently retargeting turned spend into revenue each month" id={`meta-${chartKey}-roas-month`}>
            <ApexChart
              options={roasLineOptions(215, "#2663EB", roasMonthMax, roasMonthAxis)}
              series={[{ name: "ROAS", type: "line", data: performanceValues }]}
              type="line"
              height={215}
            />
          </MetaChartCard>
          <MetaTakeawayCard items={retargetingTakeaways} periodLabel={rangeLabel} />
        </div>
      )}

      {isDiscovery && discoverySummary && (
        <div className="meta-discovery-summary-grid" style={{ marginTop: 18 }}>
          <MetaCompactSummaryCard
            label="Total impressions"
            value={formatCompactNumber(discoverySummary.totalImpressions)}
            pillText={formatSignedPercentLabel(discoverySummary.impressionsDelta)}
            tone={discoverySummary.impressionsDelta >= 0 ? "good" : "warn"}
          />
          <MetaCompactSummaryCard label="Total followers" value={formatNumber(discoverySummary.totalFollowers)} pillText={rangeLabel} tone="neutral" />
          <MetaCompactSummaryCard label="Total page visits" value={formatCompactNumber(discoverySummary.totalPageVisits)} pillText={rangeLabel} tone="neutral" />
        </div>
      )}

      {isDiscovery && (
        <>
          <div className="meta-chart-grid meta-chart-grid-2" style={{ marginTop: 22 }}>
            <MetaChartCard title="Spend vs attributed revenue" subtitle="Monthly spend alongside total revenue generated" id={`meta-${chartKey}-spend-revenue`}>
              <ApexChart
                options={spendRevenueOptions}
                series={[
                  { name: "Spend", data: spendValues },
                  { name: "Attributed revenue", data: revenueValues },
                ]}
                type="bar"
                height={235}
              />
            </MetaChartCard>
            <MetaChartCard title="ROAS" subtitle="How efficiently spend turned into revenue each month" id={`meta-${chartKey}-roas`}>
              <ApexChart
                options={roasLineOptions(235, "#F7AD43", roasMax, roasAxis)}
                series={[{ name: "ROAS", type: "line", data: performanceValues }]}
                type="line"
                height={235}
              />
            </MetaChartCard>
          </div>
          <div className="meta-chart-grid meta-chart-grid-2" style={{ marginTop: 18 }}>
            <MetaChartCard title="Impressions vs page visits" subtitle="Reach compared with the visits driven from that traffic" id={`meta-${chartKey}-impressions-visits`}>
              <ApexChart
                options={impressionsVisitsOptions}
                series={[
                  { name: "Impressions", type: "line", data: transformedImpressionValues },
                  { name: "Page visits", type: "line", data: transformedVisitValues },
                ]}
                type="line"
                height={290}
              />
            </MetaChartCard>
            <MetaTakeawayCard items={discoveryTakeaways} periodLabel={rangeLabel} />
          </div>
        </>
      )}

      {!isRetargeting && !isDiscovery && (
        <div className="meta-chart-grid meta-chart-grid-3" style={{ marginTop: 22 }}>
          <MetaChartCard title={`${campaignType} performance`} subtitle="ROAS or blended ROAS by month" id={`meta-${chartKey}-performance`}>
            <ApexChart options={performanceOptions} series={[{ name: "ROAS", type: "line", data: performanceValues }]} type="line" height={250} />
          </MetaChartCard>
          <MetaChartCard title={`${campaignType} volume`} subtitle="Leads, followers, or bookings by month" id={`meta-${chartKey}-volume`}>
            <ApexChart options={volumeOptions} series={[{ name: volumeMetric.label, data: volumeValues }]} type="bar" height={250} />
          </MetaChartCard>
          <MetaChartCard title={`${campaignType} efficiency`} subtitle="Cost trend for the key conversion event" id={`meta-${chartKey}-efficiency`}>
            <ApexChart options={efficiencyOptions} series={[{ name: efficiencyMetric.label, type: "line", data: efficiencyValues }]} type="line" height={250} />
          </MetaChartCard>
        </div>
      )}
    </div>
  );
}
