"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { MetaViewModel } from "@/lib/meta-model";
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
  formatNumber,
  formatNullableNumber,
  formatNullableCurrency,
  formatNullablePercent,
  formatMultiple,
} from "@/lib/format";

function MetaSummaryStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="meta-summary-stat">
      <div className="meta-summary-label">{label}</div>
      <div className="meta-summary-value">{value}</div>
      <div className="meta-summary-note">{note}</div>
    </div>
  );
}

function MetaKpiNoSpark({ label, items }: { label: string; items: { label: string; value: string }[] }) {
  return (
    <div className="meta-kpi meta-kpi-no-spark">
      <div className="meta-kpi-label">{label}</div>
      <div className="meta-kpi-months">
        {items.map((item, index) => (
          <div key={item.label} style={{ display: "contents" }}>
            {index > 0 && <div className="meta-kpi-divider" />}
            <div className="meta-kpi-row">
              <span className="meta-kpi-month" style={{ background: "#DBEAFE", color: "#2663EB" }}>
                {item.label}
              </span>
              <span className="meta-kpi-val">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ported from renderMetaSummaryStrip() + renderMetaPortfolio() + renderMetaComparisonTable(). */
export function MetaPortfolioSummary({ model }: { model: MetaViewModel }) {
  const { summaryStrip, portfolio, comparisonRows, showDirectRevenueColumn } = model;

  const revSpendOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: { ...metaSharedChart("bar", 280), offsetX: 0 },
        xaxis: {
          ...sharedXAxis(portfolio.revSpendChart.shortYearLabels, { offsetY: 8 }),
          tickPlacement: "between",
          labels: buildResponsiveSharedXAxisLabels(portfolio.revSpendChart.shortYearLabels, { offsetY: 8 }),
        },
        yaxis: sharedYAxis((value: number) => formatCurrencyCompact(value), { minWidth: 52, offsetX: 4 }),
        colors: ["#4F7DF3", "#F59E0B"],
        plotOptions: { bar: { borderRadius: 10, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "58%" } },
        legend: sharedLegend(),
        dataLabels: { enabled: false },
        tooltip: { shared: true, intersect: false, y: { formatter: (value: number) => formatCurrency(value, 0) } },
        grid: sharedGrid({ padding: { left: 18, right: 0, top: 4, bottom: 18 } }),
      }) as unknown as ApexOptions,
    [portfolio.revSpendChart.shortYearLabels]
  );

  const bookingValueOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: { ...metaSharedChart("line", 280), offsetX: 0 },
        xaxis: sharedXAxis(portfolio.bookingValueChart.monthLabels, { offsetY: 6 }),
        yaxis: sharedYAxis((value: number) => formatCurrencyCompact(value), {
          offsetX: 4,
          minWidth: 40,
          min: portfolio.bookingValueChart.axis.min,
          max: portfolio.bookingValueChart.axis.max,
          tickAmount: portfolio.bookingValueChart.axis.tickAmount,
        }),
        colors: ["#12B981"],
        stroke: { width: 3, curve: "smooth", lineCap: "round" },
        markers: { size: 7, hover: { sizeOffset: 1 }, colors: ["#12B981"], strokeColors: "#ffffff", strokeWidth: 3 },
        grid: sharedGrid({ padding: { left: 14, right: 10, top: 12, bottom: 18 } }),
        legend: { show: false },
        tooltip: { shared: false, intersect: true, y: { formatter: (value: number) => formatCurrency(value, 0) } },
        dataLabels: { enabled: false },
      }) as unknown as ApexOptions,
    [portfolio.bookingValueChart]
  );

  const campaignRevenueOptions: ApexOptions = useMemo(
    () =>
      ({
        chart: { ...metaSharedChart("bar", 280), stacked: true },
        xaxis: sharedXAxis(portfolio.campaignRevenueChart.shortYearLabels, { offsetY: 4 }),
        yaxis: sharedYAxis((value: number) => formatCurrencyCompact(value), { minWidth: 52, offsetX: 4 }),
        colors: portfolio.campaignRevenueChart.series.map((entry) => entry.color),
        plotOptions: { bar: { borderRadius: 10, borderRadiusApplication: "end", borderRadiusWhenStacked: "last", columnWidth: "54%" } },
        tooltip: { shared: true, intersect: false, y: { formatter: (value: number) => formatCurrency(value, 0) } },
        legend: sharedLegend(),
        dataLabels: { enabled: false },
        grid: sharedGrid({ padding: { left: 18, right: 0, top: 8, bottom: 18 } }),
      }) as unknown as ApexOptions,
    [portfolio.campaignRevenueChart]
  );

  return (
    <>
      <section className="meta-summary-strip">
        <MetaSummaryStat label="Ad Spend" value={summaryStrip.adSpend} note={summaryStrip.adSpendNote} />
        <MetaSummaryStat label="Ad Rev" value={summaryStrip.adRev} note={summaryStrip.adRevNote} />
        <MetaSummaryStat label="Blended ROAS" value={summaryStrip.roas} note={summaryStrip.roasNote} />
        <MetaSummaryStat label="Cost Per Booking (%)" value={summaryStrip.costPerBooking} note={summaryStrip.costPerBookingNote} />
        <MetaSummaryStat label="Leads" value={summaryStrip.leads} note={summaryStrip.leadsNote} />
        <MetaSummaryStat label="Followers" value={summaryStrip.followers} note={summaryStrip.followersNote} />
        <MetaSummaryStat label="Views" value={summaryStrip.views} note={summaryStrip.viewsNote} />
      </section>

      <section className="meta-section" id="meta-portfolio">
        <div className="meta-stage">
          <div className="meta-stage-copy">
            <span className="meta-stage-num">01</span>
            <span className="meta-stage-title">Portfolio Snapshot</span>
            <div className="meta-stage-line" />
          </div>
          <div className="meta-stage-anchor" />
        </div>

        <div className="meta-table-card meta-portfolio-table">
          <div className="meta-table-wrap">
            <table className="meta-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Campaign</th>
                  <th>Spend</th>
                  <th>Revenue</th>
                  {showDirectRevenueColumn && <th>Direct Booking Revenue</th>}
                  <th>ROAS</th>
                  <th>Impressions</th>
                  <th>Visits</th>
                  <th>Leads/Followers</th>
                  <th>IG Bio Leads</th>
                  <th>Bookings (Email)</th>
                  <th>Bookings (FB)</th>
                  <th>Cost/Booking</th>
                  <th>% Avg BV</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={`${row.key}-${row.campaignType}-${index}`}>
                    <td>
                      <span className={`meta-month-pill meta-month-${row.monthIndex}`}>{row.shortLabel}</span>
                    </td>
                    <td>{row.campaignType}</td>
                    <td>{formatCurrency(row.spend, 0)}</td>
                    <td>{formatCurrency(row.revenue, 0)}</td>
                    {showDirectRevenueColumn && <td>{row.directRevenue && row.directRevenue > 0 ? formatCurrency(row.directRevenue, 0) : "—"}</td>}
                    <td>{formatMultiple(row.roas)}</td>
                    <td>{formatNumber(row.impressions)}</td>
                    <td>{formatNumber(row.profileVisits)}</td>
                    <td>{formatNullableNumber(row.leadsFollowers)}</td>
                    <td>{formatNullableNumber(row.igBioLeads)}</td>
                    <td>{formatNullableNumber(row.bookingsEmail)}</td>
                    <td>{formatNullableNumber(row.bookingsFb)}</td>
                    <td>{formatNullableCurrency(row.costPerBooking)}</td>
                    <td>{formatNullablePercent(row.pctAvgBookingValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="meta-feature-grid">
          <div className="meta-chart-card">
            <div className="meta-chart-title">Revenue vs. Spend Trend</div>
            <div className="meta-chart-sub">Monthly direct revenue and total spend</div>
            <div id="meta-rev-spend">
              <ApexChart options={revSpendOptions} series={portfolio.revSpendChart.series} type="bar" height={280} />
            </div>
          </div>
          <div className="meta-feature-stack">
            <MetaKpiNoSpark label="Total ad spend" items={portfolio.totalAdSpendKpi} />
            <MetaKpiNoSpark label="Avg booking value" items={portfolio.avgBookingValueKpi} />
          </div>
        </div>

        <div className="meta-chart-grid meta-chart-grid-2">
          <div className="meta-chart-card">
            <div className="meta-chart-title">Avg booking value trend</div>
            <div className="meta-chart-sub">Month-over-month booking value lines shown</div>
            <div id="meta-booking-value-trend">
              <ApexChart
                options={bookingValueOptions}
                series={[{ name: "Avg booking value", type: "line", data: portfolio.bookingValueChart.series }]}
                type="line"
                height={280}
              />
            </div>
          </div>
          <div className="meta-chart-card">
            <div className="meta-chart-title">Monthly Revenue by Campaign Type</div>
            <div className="meta-chart-sub">How each campaign type contributed each month</div>
            <div id="meta-bookings">
              <ApexChart options={campaignRevenueOptions} series={portfolio.campaignRevenueChart.series} type="bar" height={280} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
