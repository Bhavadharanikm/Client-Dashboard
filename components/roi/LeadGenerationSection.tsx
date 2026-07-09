"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import type { RoiViewModel } from "@/lib/roi-metrics";
import { ApexChart } from "@/components/charts/ApexChart";
import { buildResponsiveXAxisLabelOptions, roiSharedAxis, sharedChart } from "@/lib/chart-utils";
import { formatNumber } from "@/lib/format";

const LEADS_COLOR = "#F59E0B";
const PIPELINE_COLOR = "#10B981";

export function LeadGenerationSection({ model }: { model: RoiViewModel }) {
  const { leadGeneration: lg } = model;

  const newLeadsOptions: ApexOptions = useMemo(
    () => ({
      ...sharedChart(190, "bar"),
      ...roiSharedAxis(lg.newLeadsChart.shortLabels, (value: number) => formatNumber(value), {
        showLegend: false,
        tooltipFormatter: (value: number) => `${formatNumber(value)} leads`,
      }),
      colors: [LEADS_COLOR],
      plotOptions: { bar: { columnWidth: "42%", borderRadius: 8, borderRadiusApplication: "end" } },
    }),
    [lg.newLeadsChart.shortLabels]
  );

  const totalLeadsOptions: ApexOptions = useMemo(
    () => ({
      ...sharedChart(190, "area"),
      ...roiSharedAxis(lg.totalLeadsChart.shortLabels, (value: number) => formatNumber(value), {
        showLegend: false,
        tooltipFormatter: (value: number) => `${formatNumber(value)} leads`,
        min: lg.totalLeadsChart.axis.min,
      }),
      colors: [PIPELINE_COLOR],
      stroke: { curve: "smooth", width: 3.5 },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.04, stops: [0, 90, 100] } },
      markers: { size: 5, colors: [PIPELINE_COLOR], strokeColors: "#ffffff", strokeWidth: 2, hover: { size: 6 } },
    }),
    [lg.totalLeadsChart.shortLabels, lg.totalLeadsChart.axis.min]
  );

  // buildResponsiveXAxisLabelOptions is re-used by roiSharedAxis internally;
  // imported here only to keep parity with the source's explicit call sites
  // if a future section needs standalone label options.
  void buildResponsiveXAxisLabelOptions;

  return (
    <section id="lead-generation" className="section reveal">
      <div className="pp-stage">
        <span className="pp-stage-num">04</span>
        <span className="pp-stage-title">Lead Generation</span>
        <div className="pp-stage-line" />
        <div className="pp-stage-accent" style={{ background: "var(--pp-green)" }} />
      </div>
      <div className="pp-grid pp-grid-3">
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            New Leads
            <span className="pp-s-label-month" id="leadNewLeadsMonthLabel">
              {lg.leadNewLeadsMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="leadNewLeadsValue">
            {lg.leadNewLeadsValue}
          </div>
          <div className="pp-s-meta">
            <span className="pp-foot-note" id="leadNewLeadsNote">
              {lg.leadNewLeadsNote}
            </span>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Total Pipeline
            <span className="pp-s-label-month" id="leadPipelineMonthLabel">
              {lg.leadPipelineMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="leadTotalPipeline">
            {lg.leadTotalPipeline}
          </div>
          <div className="pp-s-meta">
            <span className="pp-foot-note" id="leadPipelineNote">
              {lg.leadPipelineNote}
            </span>
          </div>
        </div>
        <div className="pp-glass pp-stat">
          <div className="pp-s-label">
            Growth %
            <span className="pp-s-label-month" id="leadGrowthMonthLabel">
              {lg.leadGrowthMonthLabel}
            </span>
          </div>
          <div className="pp-s-value pp-s-value-xl" id="leadAvgCostPerLead">
            {lg.leadAvgCostPerLead}
          </div>
          <div className="pp-s-meta">
            <span className="pp-foot-note" id="leadGrowthNote">
              {lg.leadGrowthNote}
            </span>
          </div>
        </div>
      </div>
      <div className="pp-grid pp-grid-2 pp-block-gap">
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">New Leads per Month</div>
            <div className="pp-chart-sub" id="newLeadsChartSub">
              {lg.newLeadsChartSub}
            </div>
          </div>
          <div className="pp-chart-body">
            <div id="newLeadsChart" role="img" aria-label="New leads per month chart">
              <ApexChart
                options={newLeadsOptions}
                series={[{ name: "New Leads", data: lg.newLeadsChart.series }]}
                type="bar"
                height={190}
              />
            </div>
          </div>
        </div>
        <div className="pp-glass pp-chart-tile">
          <div className="pp-chart-head">
            <div className="pp-chart-title">Pipeline Growth</div>
            <div className="pp-chart-sub" id="totalLeadsChartSub">
              {lg.totalLeadsChartSub}
            </div>
          </div>
          <div className="pp-chart-body">
            <div id="totalLeadsChart" role="img" aria-label="Pipeline growth chart">
              <ApexChart
                options={totalLeadsOptions}
                series={[{ name: "Total Pipeline", data: lg.totalLeadsChart.series }]}
                type="area"
                height={190}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
