"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { RoiViewModel } from "@/lib/roi-metrics";
import { ApexChart } from "@/components/charts/ApexChart";
import { roiSharedAxis, sharedChart } from "@/lib/chart-utils";
import { formatLargeNumber, formatNumber } from "@/lib/format";

const TRAFFIC_COLOR = "#2563EB";

export function WebsiteTrafficSection({ model }: { model: RoiViewModel }) {
  const { websiteTraffic: wt } = model;

  const trafficOptions: ApexOptions = useMemo(
    () => ({
      ...sharedChart(220, "area"),
      ...roiSharedAxis(wt.chart.shortLabels, (value: number) => formatLargeNumber(value), {
        showLegend: false,
        tooltipFormatter: (value: number) => `${formatNumber(value)} sessions`,
      }),
      colors: [TRAFFIC_COLOR],
      stroke: { curve: "smooth", width: 3.5 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0.04, stops: [0, 90, 100] } },
      markers: { size: 5, colors: [TRAFFIC_COLOR], strokeColors: "#ffffff", strokeWidth: 2, hover: { size: 6 } },
    }),
    [wt.chart.shortLabels]
  );

  return (
    <section id="website-traffic" className="section reveal">
      <div className="pp-stage">
        <span className="pp-stage-num">05</span>
        <span className="pp-stage-title">Website Traffic</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "var(--pp-teal)" }} />
      </div>
      <div className="pp-grid pp-grid-12">
        <div className="pp-side-stack">
          <div className="pp-glass pp-stat">
            <div className="pp-s-label">
              Website Sessions
              <span className="pp-s-label-month" id="websiteSessionsMonthLabel">
                {wt.websiteSessionsMonthLabel}
              </span>
            </div>
            <div className="pp-s-value" id="websiteTotalSessions">
              {wt.websiteTotalSessions}
            </div>
            <div className="pp-s-meta">
              <span className="pp-foot-note" id="websiteTotalSessionsNote">
                {wt.websiteTotalSessionsNote}
              </span>
            </div>
          </div>
          <div className="pp-glass pp-stat">
            <div className="pp-s-label" id="websitePeakLabel">
              {wt.websitePeakLabel}
            </div>
            <div className="pp-s-value" id="websitePeakValue">
              {wt.websitePeakValue}
            </div>
            <div className="pp-s-meta">
              <span className="pp-tag pp-tag-up">Highest month</span>
            </div>
          </div>
          <div className="pp-glass pp-stat">
            <div className="pp-s-label">Total Ad Spend</div>
            <div className="pp-s-value" id="websiteTotalAdSpend">
              {wt.websiteTotalAdSpend}
            </div>
            <div className="pp-s-meta">
              <span className="pp-foot-note" id="websiteTotalAdSpendNote">
                {wt.websiteTotalAdSpendNote}
              </span>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Traffic Trend</div>
            <div className="pp-chart-sub" id="websiteTrafficChartSub">
              {wt.websiteTrafficChartSub}
            </div>
          </div>
          <div className="pp-chart-body pp-chart-body-lg">
            <div id="websiteTrafficChart" role="img" aria-label="Website traffic trend chart">
              <ApexChart
                options={trafficOptions}
                series={[{ name: "Website Traffic", data: wt.chart.series }]}
                type="area"
                height={220}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
