// Ported verbatim from Main Page/Dashboard/dashboard.js — shared ApexCharts
// option builders. These are pure functions returning plain option fragments
// (no DOM access), so they're reusable from both the ROI and Meta views.
//
// NOTE: the original file defines `sharedChart`/`sharedXAxis`/etc TWICE with
// different signatures/behavior:
//   1. Inside buildRoiCharts() (ROI-view-local closures) — `sharedChart(height, type)`,
//      simpler xaxis label logic inlined per-call via buildResponsiveXAxisLabelOptions.
//   2. Top-level module functions used by renderMetaCharts() — `sharedChart(type, height)`
///     (note the ARGUMENT ORDER IS SWAPPED vs #1), plus sharedXAxis/sharedYAxis/sharedGrid/
//      sharedLegend/buildResponsiveSharedXAxisLabels.
// Both variants are preserved below under distinct names so callers can't
// accidentally swap the (type, height) argument order.

import { numeric } from "./format";

const AXIS_TEXT = "#64748B";
const MUTED_TEXT = "#94A3B8";
const GRID_COLOR = "#E6EEF8";

/**
 * The apexcharts package ships `.d.ts` types that are stricter than its actual
 * runtime option surface (e.g. `legend.markers.radius`, `chart.accessibility`,
 * and xaxis `labels.formatter`'s 3rd callback arg are all real, working
 * ApexCharts options that the shipped types don't declare). Rather than fight
 * the upstream types file-by-file, option fragments below are typed as
 * `Record<string, unknown>` and cast at the single point where they're handed
 * to <ApexChart>. This keeps call sites (which mirror the original's plain JS
 * option objects closely, for auditability) free of scattered `as any`.
 */
export type LooseApexOptions = Record<string, unknown>;

export type ChartLabelBreakpoint = "xs" | "sm" | "md" | "lg";

/** Ported from getChartLabelBreakpoint() — reads window width, falls back to 1440 on the server. */
export function getChartLabelBreakpoint(): ChartLabelBreakpoint {
  const width = typeof window !== "undefined" ? window.innerWidth : 1440;
  if (width < 720) return "xs";
  if (width < 980) return "sm";
  if (width < 1280) return "md";
  return "lg";
}

/** ROI-view variant: sharedChart(height, type) — matches buildRoiCharts()'s local closure. */
export function sharedChart(height: number, type: string): LooseApexOptions {
  return {
    chart: {
      type,
      height,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      accessibility: { enabled: false },
      animations: { enabled: true, easing: "easeinout", speed: 520 },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: GRID_COLOR,
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
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
      shared: false,
      intersect: true,
      theme: "light",
    },
  };
}

/** Meta-view variant: metaSharedChart(type, height) — matches the top-level sharedChart(). */
export function metaSharedChart(type: string, height: number): LooseApexOptions {
  return {
    type,
    height,
    fontFamily: "Inter",
    toolbar: { show: false },
    accessibility: { enabled: false },
    animations: { enabled: true, easing: "easeout", speed: 360 },
    zoom: { enabled: false },
  };
}

type ResponsiveLabelOptions = {
  rotate?: number;
  offsetY?: number;
  colors?: string;
  fontWeight?: number;
};

/** ROI-view variant used inline inside buildRoiCharts(). */
export function buildResponsiveXAxisLabelOptions(
  categories: string[],
  options: ResponsiveLabelOptions = {}
): LooseApexOptions {
  const breakpoint = getChartLabelBreakpoint();
  const count = Array.isArray(categories) ? categories.length : 0;
  let step = 1;

  if (breakpoint === "xs") {
    step = count > 8 ? 3 : count > 4 ? 2 : 1;
  } else if (breakpoint === "sm") {
    step = count > 10 ? 3 : count > 5 ? 2 : 1;
  } else if (breakpoint === "md") {
    step = count > 12 ? 2 : 1;
  }

  const rotate = typeof options.rotate === "number" ? options.rotate : breakpoint === "xs" ? -55 : breakpoint === "sm" ? -40 : 0;
  const fontSize = breakpoint === "xs" ? "10px" : breakpoint === "sm" ? "11px" : "12px";
  const minHeight = rotate ? (breakpoint === "xs" ? 62 : 52) : 36;
  const maxHeight = rotate ? (breakpoint === "xs" ? 62 : 52) : 40;

  return {
    hideOverlappingLabels: false,
    trim: false,
    rotate,
    rotateAlways: rotate !== 0,
    minHeight,
    maxHeight,
    offsetY: options.offsetY || 0,
    style: {
      colors: options.colors || AXIS_TEXT,
      fontSize,
      fontWeight: options.fontWeight || 600,
    },
    formatter: (value: string, _timestamp?: number, opts?: { i?: number }) => {
      const index = opts && typeof opts.i === "number" ? opts.i : categories.indexOf(value);
      if (step > 1 && index >= 0 && index % step !== 0 && index !== count - 1) {
        return "";
      }
      return value;
    },
  };
}

/** Meta-view variant: buildResponsiveSharedXAxisLabels() — top-level module function. */
export function buildResponsiveSharedXAxisLabels(
  categories: string[],
  options: ResponsiveLabelOptions = {}
): LooseApexOptions {
  const breakpoint = getChartLabelBreakpoint();
  const count = Array.isArray(categories) ? categories.length : 0;
  let step = 1;

  if (breakpoint === "xs") {
    step = count > 8 ? 3 : count > 4 ? 2 : 1;
  } else if (breakpoint === "sm") {
    step = count > 10 ? 3 : count > 5 ? 2 : 1;
  } else if (breakpoint === "md") {
    step = count > 12 ? 2 : 1;
  }

  const rotate = typeof options.rotate === "number" ? options.rotate : breakpoint === "xs" ? -55 : breakpoint === "sm" ? -40 : 0;

  return {
    style: {
      colors: "#8FA1BF",
      fontSize: breakpoint === "xs" ? "10px" : "11px",
      fontWeight: 500,
    },
    offsetY: options.offsetY || 0,
    hideOverlappingLabels: false,
    trim: false,
    rotate,
    rotateAlways: rotate !== 0,
    minHeight: rotate ? (breakpoint === "xs" ? 62 : 52) : 36,
    maxHeight: rotate ? (breakpoint === "xs" ? 62 : 52) : 36,
    formatter: (value: string, _timestamp?: number, opts?: { i?: number }) => {
      const index = opts && typeof opts.i === "number" ? opts.i : categories.indexOf(value);
      if (step > 1 && index >= 0 && index % step !== 0 && index !== count - 1) {
        return "";
      }
      return value;
    },
  };
}

/** Meta-view variant: sharedXAxis(categories, options). */
export function sharedXAxis(categories: string[], options: ResponsiveLabelOptions = {}): LooseApexOptions {
  return {
    categories,
    axisBorder: { show: false },
    axisTicks: { show: false },
    crosshairs: { show: false },
    labels: buildResponsiveSharedXAxisLabels(categories, options),
  };
}

export type SharedYAxisOptions = {
  min?: number;
  max?: number;
  tickAmount?: number;
  offsetX?: number;
  minWidth?: number;
};

/** Meta-view variant: sharedYAxis(formatter, options). */
export function sharedYAxis(formatter: (value: number) => string, options: SharedYAxisOptions = {}): LooseApexOptions {
  return {
    min: options.min,
    max: options.max,
    tickAmount: options.tickAmount,
    labels: {
      style: { colors: "#8FA1BF", fontSize: "11px", fontWeight: 500 },
      formatter,
      offsetX: options.offsetX || 0,
      minWidth: options.minWidth || undefined,
    },
    forceNiceScale: true,
  };
}

/** Meta-view variant: sharedGrid(options). */
export function sharedGrid(options: { padding?: Record<string, number> } = {}): LooseApexOptions {
  return {
    borderColor: "#E7EDF6",
    strokeDashArray: 3,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: options.padding || undefined,
  };
}

/** Meta-view variant: sharedLegend(show). */
export function sharedLegend(show?: boolean): LooseApexOptions {
  if (show === false) {
    return { show: false };
  }
  return {
    position: "bottom",
    horizontalAlign: "center",
    fontSize: "11px",
    fontWeight: 500,
    markers: { width: 8, height: 8, radius: 999 },
    itemMargin: { horizontal: 12 },
    labels: { colors: "#64748B" },
  };
}

/** ROI-view sharedAxis() helper — used inline inside buildRoiCharts(). */
export function roiSharedAxis(
  shortLabels: string[],
  yFormatter: (value: number) => string,
  extra: { min?: number; tooltipFormatter?: (value: number) => string; showLegend?: boolean } = {}
): LooseApexOptions {
  return {
    xaxis: {
      categories: shortLabels,
      labels: buildResponsiveXAxisLabelOptions(shortLabels),
      axisBorder: { show: false },
      axisTicks: { color: GRID_COLOR },
    },
    yaxis: {
      min: typeof extra.min === "number" ? extra.min : undefined,
      labels: {
        style: { colors: MUTED_TEXT, fontSize: "12px", fontWeight: 600 },
        formatter: yFormatter,
      },
    },
    tooltip: {
      y: {
        formatter: extra.tooltipFormatter || yFormatter,
      },
    },
    legend: extra.showLegend === false ? { show: false } : undefined,
  };
}

/** ROI-view paddedAxisBounds() helper. */
export function paddedAxisBounds(values: unknown[]): { min: number; max: number | undefined } {
  const cleaned = (Array.isArray(values) ? values : []).map(numeric).filter((value) => Number.isFinite(value));
  if (!cleaned.length) {
    return { min: 0, max: undefined };
  }
  const min = Math.min(...cleaned);
  const max = Math.max(...cleaned);
  const span = Math.max(max - min, 1);
  const padding = Math.max(Math.round(span * 0.2), Math.round(max * 0.05), 25);
  return { min: Math.max(0, min - padding), max: max + padding };
}

export function roundUpAxis(value: number): number {
  if (!value || value <= 10) return 10;
  if (value <= 20) return 20;
  if (value <= 50) return 50;
  return Math.ceil(value / 20) * 20;
}

export function roundUpValue(value: number): number {
  if (!value || value <= 10) return 10;
  if (value <= 100) return Math.ceil(value / 10) * 10;
  if (value <= 1000) return Math.ceil(value / 100) * 100;
  if (value <= 10000) return Math.ceil(value / 1000) * 1000;
  return Math.ceil(value / 5000) * 5000;
}

function roundDownToStep(value: number, step: number): number {
  if (!step) return Math.max(0, value);
  return Math.max(0, Math.floor(value / step) * step);
}

function roundUpToStep(value: number, step: number): number {
  if (!step) return Math.max(0, value);
  return Math.max(step, Math.ceil(value / step) * step);
}

export function chooseAxisStep(maxValue: number): number {
  const safeMax = Math.max(0, numeric(maxValue));
  if (safeMax <= 10) return 1;
  if (safeMax <= 50) return 5;
  if (safeMax <= 100) return 10;
  if (safeMax <= 500) return 50;
  if (safeMax <= 1000) return 100;
  if (safeMax <= 10000) return 1000;
  if (safeMax <= 100000) return 5000;
  return 25000;
}

export type TrendAxisBoundsOptions = {
  lowerPaddingRatio?: number;
  upperPaddingRatio?: number;
  forceZero?: boolean;
  preferDataMin?: boolean;
  tightRangeThreshold?: number;
  step?: number;
  tickAmount?: number;
};

export function buildTrendAxisBounds(
  values: unknown[],
  options: TrendAxisBoundsOptions = {}
): { min: number; max: number; tickAmount: number } {
  const numericValues = (values || []).map(numeric).filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return { min: 0, max: 10, tickAmount: 4 };
  }

  const minValue = Math.min(...numericValues);
  const maxValue = Math.max(...numericValues);
  const spread = maxValue - minValue;
  const effectiveSpread = spread || Math.max(1, maxValue * 0.12);
  const lowerPadding = effectiveSpread * (options.lowerPaddingRatio ?? 0.18);
  const upperPadding = effectiveSpread * (options.upperPaddingRatio ?? 0.14);
  const shouldStartAtZero =
    options.forceZero === true ||
    minValue <= 0 ||
    (options.preferDataMin !== true && minValue / Math.max(maxValue, 1) < (options.tightRangeThreshold ?? 0.45));
  const step = options.step || chooseAxisStep(maxValue + upperPadding);
  const axisMin = shouldStartAtZero ? 0 : roundDownToStep(minValue - lowerPadding, step);
  const axisMax = roundUpToStep(maxValue + upperPadding, step);

  return {
    min: axisMin,
    max: Math.max(axisMin + step, axisMax),
    tickAmount: options.tickAmount || 4,
  };
}

export function buildCurrencyAxisBounds(
  minValue: number,
  maxValue: number,
  step?: number
): { min: number; max: number; tickAmount: number } {
  const safeStep = step || 250;
  const safeMax = Math.max(0, numeric(maxValue));
  const safeMin = Math.max(0, numeric(minValue));
  const axisMin = safeMin > 0 ? Math.floor(safeMin / safeStep) * safeStep : 0;
  const axisMax = Math.max(axisMin + safeStep, Math.ceil(safeMax / safeStep) * safeStep);
  return {
    min: axisMin,
    max: axisMax,
    tickAmount: Math.max(1, Math.round((axisMax - axisMin) / safeStep)),
  };
}
