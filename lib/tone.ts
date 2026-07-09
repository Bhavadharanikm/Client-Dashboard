// Ported verbatim from Main Page/Dashboard/dashboard.js — tone/status helpers.
// Thresholds intentionally hardcoded to match the original 1:1 (they are NOT
// the same numbers as DASHBOARD_CONFIG.benchmarks, which use different scales/units
// for the Meta view's benchmark comparisons — these are the ROI/meta card tone helpers).

import { numeric } from "./format";

export function roasTone(value: unknown): "good" | "neutral" | "warn" | "bad" {
  const score = numeric(value);
  if (score >= 10) {
    return "good";
  }
  if (score >= 5) {
    return "neutral";
  }
  if (score > 0) {
    return "warn";
  }
  return "bad";
}

export function costVisitTone(value: unknown): "neutral" | "good" | "bad" {
  const score = numeric(value);
  if (!score) {
    return "neutral";
  }
  if (score <= 0.2) {
    return "good";
  }
  if (score <= 0.3) {
    return "neutral";
  }
  return "bad";
}

export function leadFollowerTone(value: unknown): "neutral" | "good" | "warn" | "bad" {
  const score = numeric(value);
  if (!score) {
    return "neutral";
  }
  if (score <= 0.3) {
    return "good";
  }
  if (score <= 0.8) {
    return "warn";
  }
  return "bad";
}

export function bookingTone(value: unknown): "neutral" | "good" | "warn" | "bad" {
  const score = numeric(value);
  if (!score) {
    return "neutral";
  }
  if (score <= 100) {
    return "good";
  }
  if (score <= 200) {
    return "warn";
  }
  return "bad";
}

export function abvTone(value: unknown): "neutral" | "good" | "warn" | "bad" {
  const score = numeric(value);
  if (!score) {
    return "neutral";
  }
  if (score <= 0.15) {
    return "good";
  }
  if (score <= 0.4) {
    return "warn";
  }
  return "bad";
}

/**
 * Returns the trend-badge class + label (positive/negative/neutral),
 * mirroring setTrendBadge()'s classList + textContent side effects as a pure
 * value so React components can render it declaratively.
 */
export function trendBadge(value: unknown): { tone: "positive" | "negative" | "neutral"; text: string } {
  const rounded = Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0;
  if (rounded > 0) {
    return { tone: "positive", text: `▲ ${Math.abs(rounded)}%` };
  }
  if (rounded < 0) {
    return { tone: "negative", text: `▼ ${Math.abs(rounded)}%` };
  }
  return { tone: "neutral", text: "0%" };
}

/**
 * Mirrors setPeakBadge()'s classList + textContent side effects as a pure value.
 */
export function peakBadge(month: { shortLabel: string; key: string } | null): {
  tone: "positive" | "neutral";
  text: string;
} {
  if (!month) {
    return { tone: "neutral", text: "Peak -" };
  }
  return { tone: "positive", text: `Peak ${month.shortLabel} '${month.key.slice(2, 4)}` };
}
