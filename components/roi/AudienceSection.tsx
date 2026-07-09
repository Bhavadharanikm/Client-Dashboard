"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { RoiViewModel } from "@/lib/roi-metrics";
import { ApexChart } from "@/components/charts/ApexChart";
import { buildResponsiveXAxisLabelOptions } from "@/lib/chart-utils";
import { formatNumber, formatPercent, numeric, share } from "@/lib/format";

const INSTAGRAM_COLOR = "#2663EB";
const FACEBOOK_COLOR = "#F7AD43";
const TIKTOK_COLOR = "#12B981";
const AXIS_TEXT = "#64748B";
const MUTED_TEXT = "#94A3B8";
const GRID_COLOR = "#E6EEF8";

export function AudienceSection({ model }: { model: RoiViewModel }) {
  const { audience: aud } = model;

  const followersChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        height: 240,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false },
      },
      plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 6, borderRadiusApplication: "end" } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: {
        categories: aud.followersChart.shortLabels,
        labels: buildResponsiveXAxisLabelOptions(aud.followersChart.shortLabels),
        axisBorder: { show: false },
        axisTicks: { color: GRID_COLOR },
      },
      yaxis: {
        labels: { style: { colors: MUTED_TEXT, fontSize: "12px", fontWeight: 600 }, formatter: (value: number) => formatNumber(value) },
      },
      fill: { opacity: 1 },
      tooltip: {
        shared: false,
        intersect: true,
        theme: "light",
        y: { formatter: (value: number) => `${formatNumber(value)} followers` },
      },
      colors: [INSTAGRAM_COLOR, FACEBOOK_COLOR, TIKTOK_COLOR],
      grid: { borderColor: GRID_COLOR, strokeDashArray: 0, xaxis: { lines: { show: false } } },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: AXIS_TEXT },
        markers: { size: 4 },
      },
    }),
    [aud.followersChart.shortLabels]
  );

  const followersSeries = useMemo(
    () => [
      { name: "Instagram", data: aud.followersChart.igSeries },
      { name: "Facebook", data: aud.followersChart.fbSeries },
      { name: "TikTok", data: aud.followersChart.tiktokSeries },
    ],
    [aud.followersChart.igSeries, aud.followersChart.fbSeries, aud.followersChart.tiktokSeries]
  );

  const donutTotal = aud.donutChart.series.reduce((sum, value) => sum + numeric(value), 0);

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        height: 240,
        fontFamily: "Inter, sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, easing: "easeinout", speed: 520 },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: GRID_COLOR, strokeDashArray: 0, xaxis: { lines: { show: false } } },
      labels: ["Instagram", "Facebook", "TikTok"],
      colors: [INSTAGRAM_COLOR, FACEBOOK_COLOR, TIKTOK_COLOR],
      stroke: { colors: ["#ffffff"], width: 4 },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              value: {
                show: true,
                fontSize: "18px",
                fontWeight: 700,
                color: AXIS_TEXT,
                offsetY: 18,
                formatter: (value: string) => formatPercent(share(numeric(value), donutTotal), 0),
              },
              total: {
                show: true,
                label: aud.donutChart.totalLabel,
                fontSize: "14px",
                fontWeight: 600,
                color: AXIS_TEXT,
                formatter: () => aud.donutChart.totalValue,
              },
            },
          },
        },
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "13px",
        fontWeight: 600,
        labels: { colors: AXIS_TEXT },
        markers: { size: 4 },
      },
      tooltip: {
        y: { formatter: (value: number) => `${formatNumber(value)} followers` },
      },
    }),
    [donutTotal, aud.donutChart.totalLabel, aud.donutChart.totalValue]
  );

  return (
    <section id="social-followers" className="section reveal">
      <div className="pp-stage">
        <span className="pp-stage-num">03</span>
        <span className="pp-stage-title">Audience</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "var(--pp-blue)" }} />
      </div>
      <div className="pp-grid pp-grid-4">
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Total Followers
            <span className="pp-s-label-month" id="audienceTotalMonthLabel">
              {aud.audienceTotalMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="audienceTotalFollowers">
            {aud.audienceTotalFollowers}
          </div>
          <div className="pp-s-meta">
            <span className={`pp-tag pp-tag-up ${aud.audienceGrowthBadge.tone}`} id="audienceGrowthBadge">
              {aud.audienceGrowthBadge.text}
            </span>
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label" id="audienceStartedFollowersLabel">
                {aud.audienceStartedFollowersLabel}
              </div>
              <div className="pp-yoy-value" id="audienceStartedFollowers">
                {aud.audienceStartedFollowers}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="audienceNetNewFollowersLabel">
                {aud.audienceNetNewFollowersLabel}
              </div>
              <div className="pp-yoy-value pp-yoy-positive" id="audienceNetNewFollowers">
                {aud.audienceNetNewFollowers}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Instagram
            <span className="pp-s-label-month" id="audienceInstagramMonthLabel">
              {aud.audienceInstagramMonthLabel}
            </span>
          </div>
          <div className="pp-s-value" id="audienceInstagramFollowers">
            {aud.audienceInstagramFollowers}
          </div>
          <div className="pp-s-meta">
            <span className={`pp-tag pp-tag-blue ${aud.audienceInstagramNote.tone}`} id="audienceInstagramNote">
              {aud.audienceInstagramNote.text}
            </span>
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label" id="audienceInstagramStartLabel">
                {aud.audienceInstagramStartLabel}
              </div>
              <div className="pp-yoy-value" id="audienceInstagramStart">
                {aud.audienceInstagramStart}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="audienceInstagramNetNewLabel">
                {aud.audienceInstagramNetNewLabel}
              </div>
              <div className="pp-yoy-value pp-yoy-positive" id="audienceInstagramShare">
                {aud.audienceInstagramShare}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Facebook
            <span className="pp-s-label-month" id="audienceFacebookMonthLabel">
              {aud.audienceFacebookMonthLabel}
            </span>
          </div>
          <div className="pp-s-value" id="audienceFacebookFollowers">
            {aud.audienceFacebookFollowers}
          </div>
          <div className="pp-s-meta">
            <span className={`pp-tag pp-tag-orange ${aud.audienceFacebookNote.tone}`} id="audienceFacebookNote">
              {aud.audienceFacebookNote.text}
            </span>
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label" id="audienceFacebookStartLabel">
                {aud.audienceFacebookStartLabel}
              </div>
              <div className="pp-yoy-value" id="audienceFacebookStart">
                {aud.audienceFacebookStart}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="audienceFacebookNetNewLabel">
                {aud.audienceFacebookNetNewLabel}
              </div>
              <div className="pp-yoy-value pp-yoy-positive" id="audienceFacebookShare">
                {aud.audienceFacebookShare}
              </div>
            </div>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            TikTok
            <span className="pp-s-label-month" id="audienceTiktokMonthLabel">
              {aud.audienceTiktokMonthLabel}
            </span>
          </div>
          <div className="pp-s-value" id="audienceCostPerFollower">
            {aud.audienceCostPerFollower}
          </div>
          <div className="pp-s-meta">
            <span className={`pp-tag pp-tag-up ${aud.audienceCostPerFollowerNote.tone}`} id="audienceCostPerFollowerNote">
              {aud.audienceCostPerFollowerNote.text}
            </span>
          </div>
          <div className="pp-card-div" />
          <div className="pp-yoy">
            <div className="pp-yoy-item">
              <div className="pp-yoy-label" id="audienceTiktokStartLabel">
                {aud.audienceTiktokStartLabel}
              </div>
              <div className="pp-yoy-value" id="audienceTiktokFollowers">
                {aud.audienceTiktokFollowers}
              </div>
            </div>
            <div className="pp-yoy-item pp-yoy-right">
              <div className="pp-yoy-label" id="audienceTiktokNetNewLabel">
                {aud.audienceTiktokNetNewLabel}
              </div>
              <div className="pp-yoy-value pp-yoy-positive" id="audienceTiktokGrowth">
                {aud.audienceTiktokGrowth}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="pp-grid pp-grid-2 pp-block-gap">
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Follower Growth</div>
            <div className="pp-chart-sub">Monthly cumulative · all platforms</div>
          </div>
          <div className="pp-chart-body">
            <div id="followersChart" role="img" aria-label="Follower growth chart">
              <ApexChart options={followersChartOptions} series={followersSeries} type="bar" height={240} />
            </div>
          </div>
        </div>
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Platform Distribution</div>
            <div className="pp-chart-sub" id="audienceDistributionSub">
              {aud.audienceDistributionSub}
            </div>
          </div>
          <div className="pp-chart-body">
            <div id="followersDonutChart" role="img" aria-label="Follower distribution chart">
              <ApexChart options={donutOptions} series={aud.donutChart.series} type="donut" height={240} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
