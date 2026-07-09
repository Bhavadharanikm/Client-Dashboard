"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { Props as ReactApexChartProps } from "react-apexcharts";

// ApexCharts touches `window` at import time, so it must never be evaluated
// during SSR — react-apexcharts's default export is loaded client-side only.
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ApexChartSeries = ApexOptions["series"];

export function ApexChart({
  options,
  series,
  type,
  height,
}: {
  options: ApexOptions;
  series: ApexChartSeries;
  // react-apexcharts's own Props["type"] union is narrower than
  // ApexOptions["chart"]["type"] (it omits e.g. "violin"), so callers must
  // pass one of the types react-apexcharts actually accepts.
  type: ReactApexChartProps["type"];
  height?: number | string;
}) {
  return <ReactApexChart options={options} series={series} type={type} height={height} />;
}
