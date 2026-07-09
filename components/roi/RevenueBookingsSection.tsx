"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { RoiViewModel } from "@/lib/roi-metrics";
import { ApexChart } from "@/components/charts/ApexChart";
import { buildResponsiveXAxisLabelOptions, roiSharedAxis, sharedChart } from "@/lib/chart-utils";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

const TOTAL_REVENUE_COLOR = "#2563EB";
const DIRECT_REVENUE_COLOR = "#7C3AED";
const SPLIT_COLOR = "#2563EB";
const GRID_COLOR = "#E6EEF8";
const AXIS_TEXT = "#64748B";
const MUTED_TEXT = "#94A3B8";

export function RevenueBookingsSection({ model }: { model: RoiViewModel }) {
  const { revenueBookings: rb } = model;

  const revenueOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 190,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: [3.5, 3], dashArray: [0, 6] },
      xaxis: {
        categories: rb.revenueChart.compactLabels,
        tickPlacement: "on",
        labels: buildResponsiveXAxisLabelOptions(rb.revenueChart.compactLabels, { offsetY: 4 }),
        axisBorder: { show: false },
        axisTicks: { color: GRID_COLOR },
      },
      yaxis: {
        min: 0,
        labels: { minWidth: 64, style: { colors: MUTED_TEXT, fontSize: "12px", fontWeight: 600 }, formatter: (value: number) => formatCurrencyCompact(value) },
      },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.18, opacityTo: 0.03, stops: [0, 90, 100] } },
      colors: [TOTAL_REVENUE_COLOR, DIRECT_REVENUE_COLOR],
      grid: { borderColor: GRID_COLOR, strokeDashArray: 0, xaxis: { lines: { show: false } }, padding: { left: 8, right: 18, top: 6, bottom: 0 } },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: { formatter: (value: number) => formatCurrency(value, 0) },
      },
      markers: { size: 4, strokeColors: "#ffffff", strokeWidth: 2, hover: { size: 6 } },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        offsetY: 6,
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: AXIS_TEXT },
        markers: { size: 4 },
      },
    }),
    [rb.revenueChart.compactLabels]
  );

  const bookingSplitOptions: ApexOptions = useMemo(
    () => ({
      ...sharedChart(190, "bar"),
      ...roiSharedAxis(rb.bookingSplitChart.shortLabels, (value: number) => `${Math.round(value)}%`, {
        showLegend: false,
        tooltipFormatter: (value: number) => `${Math.round(value)}%`,
      }),
      colors: [SPLIT_COLOR],
      plotOptions: { bar: { columnWidth: "42%", borderRadius: 8, borderRadiusApplication: "end" } },
    }),
    [rb.bookingSplitChart.shortLabels]
  );

  const revenueLySeries = useMemo(() => {
    const series = [
      { name: "Total Revenue", data: rb.revenueLyChart.totalSeries },
      { name: "Direct Booking Revenue", data: rb.revenueLyChart.directSeries },
    ];
    if (rb.revenueLyChart.lySeries) {
      series.push({ name: "LY Revenue", data: rb.revenueLyChart.lySeries });
    }
    return series;
  }, [rb.revenueLyChart.totalSeries, rb.revenueLyChart.directSeries, rb.revenueLyChart.lySeries]);

  const hideLyRevenue = !rb.revenueLyChart.lySeries;

  const revenueLyOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "line",
        height: 210,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: hideLyRevenue ? [3.5, 3] : [3.5, 3, 3],
        dashArray: hideLyRevenue ? [0, 0] : [0, 0, 7],
      },
      xaxis: {
        categories: rb.revenueLyChart.labels,
        tickPlacement: "on",
        labels: buildResponsiveXAxisLabelOptions(rb.revenueLyChart.labels, { offsetY: 4 }),
        axisBorder: { show: false },
        axisTicks: { color: GRID_COLOR },
      },
      yaxis: {
        min: rb.revenueLyChart.axis.min,
        max: rb.revenueLyChart.axis.max,
        tickAmount: rb.revenueLyChart.axis.tickAmount,
        labels: { minWidth: 64, style: { colors: MUTED_TEXT, fontSize: "12px", fontWeight: 600 }, formatter: (value: number) => formatCurrencyCompact(value) },
      },
      colors: hideLyRevenue ? [TOTAL_REVENUE_COLOR, DIRECT_REVENUE_COLOR] : [TOTAL_REVENUE_COLOR, DIRECT_REVENUE_COLOR, "#94A3B8"],
      grid: { borderColor: GRID_COLOR, strokeDashArray: 0, xaxis: { lines: { show: false } }, padding: { left: 8, right: 18, top: 6, bottom: 0 } },
      tooltip: {
        shared: true,
        intersect: false,
        theme: "light",
        y: { formatter: (value: number) => formatCurrency(value, 0) },
      },
      markers: { size: 4, strokeColors: "#ffffff", strokeWidth: 2, hover: { size: 6 } },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        offsetY: 6,
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: AXIS_TEXT },
        markers: { size: 4 },
      },
    }),
    [rb.revenueLyChart.labels, rb.revenueLyChart.axis.min, rb.revenueLyChart.axis.max, rb.revenueLyChart.axis.tickAmount, hideLyRevenue]
  );

  return (
    <section id="revenue-bookings" className="section reveal">
      <div className="pp-stage">
        <span className="pp-stage-num">06</span>
        <span className="pp-stage-title">Revenue &amp; Bookings</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "var(--pp-purple)" }} />
      </div>
      <div className="pp-grid pp-grid-3">
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Total Booking Revenue
            <span className="pp-s-label-month" id="revenueTotalMonthLabel">
              {rb.revenueTotalMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="revenueTotalValue">
            {rb.revenueTotalValue}
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label">Period Avg</div>
              <div className="pp-yoy-value" id="revenueVsLastYear">
                {rb.revenueVsLastYear}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="revenuePastMonthLabel">
                {rb.revenuePastMonthLabel}
              </div>
              <div className="pp-yoy-value" id="revenuePeakMonth">
                {rb.revenuePeakMonth}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Direct Booking Revenue
            <span className="pp-s-label-month" id="revenueDirectMonthLabel">
              {rb.revenueDirectMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="revenueDirectValue">
            {rb.revenueDirectValue}
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label">Period Share</div>
              <div className="pp-yoy-value" id="revenueDirectShareValue">
                {rb.revenueDirectShareValue}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="revenueDirectPastMonthLabel">
                {rb.revenueDirectPastMonthLabel}
              </div>
              <div className="pp-yoy-value" id="revenueDirectPeakMonth">
                {rb.revenueDirectPeakMonth}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Direct Split Avg
            <span className="pp-s-label-month" id="revenueSplitMonthLabel">
              {rb.revenueSplitMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="revenueDirectSplitAvg">
            {rb.revenueDirectSplitAvg}
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label">3-Month Avg</div>
              <div className="pp-yoy-value" id="revenueSplitDirectValue">
                {rb.revenueSplitDirectValue}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="revenueSplitPastMonthLabel">
                {rb.revenueSplitPastMonthLabel}
              </div>
              <div className="pp-yoy-value" id="revenueSplitPeakMonth">
                {rb.revenueSplitPeakMonth}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pp-grid pp-grid-2 pp-block-gap">
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Total vs Direct Revenue</div>
            <div className="pp-chart-sub" id="revenueChartSub">
              {rb.revenueChartSub}
            </div>
          </div>
          <div className="pp-chart-body">
            <div id="revenueChart" role="img" aria-label="Revenue chart">
              <ApexChart
                options={revenueOptions}
                series={[
                  { name: "Total Revenue", data: rb.revenueChart.totalSeries },
                  { name: "Direct Revenue", data: rb.revenueChart.directSeries },
                ]}
                type="area"
                height={190}
              />
            </div>
          </div>
        </div>
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Direct Booking Split</div>
            <div className="pp-chart-sub" id="bookingSplitChartSub">
              {rb.bookingSplitChartSub}
            </div>
          </div>
          <div className="pp-chart-body">
            <div id="bookingSplitChart" role="img" aria-label="Direct booking split chart">
              <ApexChart
                options={bookingSplitOptions}
                series={[{ name: "Direct Split", data: rb.bookingSplitChart.series }]}
                type="bar"
                height={190}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pp-glass pp-chart-tile pp-block-gap">
        <div className="pp-chart-head">
          <div className="pp-chart-title">Monthly Revenue Performance</div>
          <div className="pp-chart-sub">
            Compares total revenue, direct booking revenue, and last year&apos;s total revenue across all available client
            months
          </div>
        </div>
        <div className="pp-chart-body pp-chart-body-lg">
          <div id="revenueLyChart" role="img" aria-label="Total revenue versus last year chart">
            <ApexChart options={revenueLyOptions} series={revenueLySeries} type="line" height={210} />
          </div>
        </div>
      </div>
    </section>
  );
}
