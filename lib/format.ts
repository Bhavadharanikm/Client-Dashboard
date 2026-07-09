// Ported verbatim from Main Page/Dashboard/dashboard.js — expanded further in Phase 4/5.

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const shortMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

export function formatMonthKey(value: string): string {
  if (!value) return "";
  return monthFormatter.format(new Date(`${value}-01T00:00:00`));
}

export function formatShortMonthKey(value: string): string {
  if (!value) return "";
  return shortMonthFormatter.format(new Date(`${value}-01T00:00:00`));
}

export function formatShortMonthYearKey(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}-01T00:00:00`);
  return `${shortMonthFormatter.format(date)} ${date.getFullYear()}`;
}

// The original defines two identically-implemented functions
// (formatShortMonthYearKey / formatShortMonthYearKeyCompact) — preserved as
// separate exports for parity even though they behave the same.
export function formatShortMonthYearKeyCompact(value: string): string {
  return formatShortMonthYearKey(value);
}

export function numeric(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function isNA(value: unknown): boolean {
  return typeof value === "string" && value.toUpperCase() === "N/A";
}

export function formatNumber(value: unknown): string {
  return Math.round(numeric(value)).toLocaleString("en-US");
}

export function formatSignedNumber(value: unknown): string {
  const amount = numeric(value);
  if (amount > 0) {
    return `+${formatNumber(amount)}`;
  }
  if (amount < 0) {
    return `-${formatNumber(Math.abs(amount))}`;
  }
  return "0";
}

export function formatNullableNumber(value: unknown): string {
  return value === null || value === undefined ? "—" : formatNumber(value);
}

export function formatCurrency(value: unknown, digits?: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits === 0 ? 0 : 2,
    maximumFractionDigits: digits === 0 ? 0 : 2,
  }).format(numeric(value));
}

export function formatNullableCurrency(value: unknown): string {
  return value === null || value === undefined ? "—" : formatCurrency(value);
}

export function formatCurrencyCompact(value: unknown): string {
  const amount = numeric(value);
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${round2(amount)}`;
}

export function formatRoiCompactNumber(value: unknown): string {
  const amount = numeric(value);
  if (amount >= 1000000) {
    return `${trimCompactDecimal(amount / 1000000)}M`;
  }
  if (amount >= 1000) {
    return `${trimCompactDecimal(amount / 1000)}K`;
  }
  return String(Math.round(amount));
}

export function formatRoiCompactCurrency(value: unknown): string {
  const amount = numeric(value);
  if (amount >= 1000000) {
    return `$${trimCompactDecimal(amount / 1000000)}M`;
  }
  if (amount >= 1000) {
    return `$${trimCompactDecimal(amount / 1000)}K`;
  }
  return `$${round2(amount)}`;
}

export function trimCompactDecimal(value: unknown): string {
  const amount = numeric(value);
  const truncated = amount >= 0 ? Math.floor(amount * 10) / 10 : Math.ceil(amount * 10) / 10;
  return truncated.toFixed(1).replace(/\.0$/, ".0");
}

export function formatPercent(value: unknown, digits?: number): string {
  return `${(numeric(value) * 100).toFixed(digits === undefined ? 0 : digits)}%`;
}

export function formatPercentPoints(value: unknown): string {
  const amount = Math.round(numeric(value) * 10) / 10;
  return `${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(1)}%`;
}

export function formatNullablePercent(value: unknown): string {
  return value === null || value === undefined ? "—" : formatPercent(value, 0);
}

export function formatSignedPercent(value: unknown, digits?: number): string {
  const rounded = numeric(value).toFixed(digits === undefined ? 0 : digits);
  return `${numeric(value) > 0 ? "+" : ""}${rounded}%`;
}

export function formatLargeNumber(value: unknown): string {
  const number = numeric(value);
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return String(Math.round(number));
}

export function formatCompactNumber(value: unknown): string {
  const number = numeric(value);
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(0)}K`;
  }
  return String(Math.round(number));
}

export function formatMultiple(value: unknown): string {
  return `${round2(value)}x`;
}

export function round2(value: unknown): number {
  return Math.round(numeric(value) * 100) / 100;
}

export function share(part: unknown, whole: unknown): number {
  return whole ? numeric(part) / numeric(whole) : 0;
}

export function percentDelta(start: unknown, end: unknown): number {
  const initial = numeric(start);
  const final = numeric(end);
  if (!initial) {
    return final ? 100 : 0;
  }
  return ((final - initial) / initial) * 100;
}

export function highestMonth<T extends Record<string, unknown>>(rows: T[], field: keyof T): T | null {
  if (!rows.length) {
    return null;
  }
  return rows.reduce<T | null>((highest, row) => {
    return !highest || numeric(row[field]) > numeric(highest[field]) ? row : highest;
  }, null);
}

export function lowestPositiveRow<T extends Record<string, unknown>>(rows: T[], field: keyof T): T | null {
  const filtered = rows.filter((row) => numeric(row[field]) > 0);
  if (!filtered.length) {
    return null;
  }
  return filtered.reduce<T | null>((lowest, row) => {
    return !lowest || numeric(row[field]) < numeric(lowest[field]) ? row : lowest;
  }, null);
}

export function sumMetric<T extends Record<string, unknown>>(rows: T[], field: keyof T): number {
  return rows.reduce((sum, row) => sum + numeric(row[field]), 0);
}

export function averageMetric<T extends Record<string, unknown>>(rows: T[], field: keyof T): number {
  const values = rows.map((row) => numeric(row[field])).filter((value) => value > 0);
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const META_COLORS = ["#2663EB", "#F7AD43", "#12B981"];

export function monthColor(index: number): string {
  return META_COLORS[index % META_COLORS.length];
}

export function monthLightColor(index: number): string {
  return ["#DBEAFE", "#FEF3C7", "#D1FAE5"][index % 3];
}

export function estimatePreviousTotal(current: unknown, growthDecimal: unknown): number {
  const growth = numeric(growthDecimal);
  const currentNum = numeric(current);
  return growth > -1 && growth !== 0 ? currentNum / (1 + growth) : currentNum;
}

export function parsePercentText(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (!value) {
    return 0;
  }
  return numeric(String(value).replace("%", ""));
}

export function getFollowerStartValue(months: Array<{ totalFollowers: number }>): number {
  if (!months.length || months.length === 1) {
    return 0;
  }
  const firstValue = numeric(months[0].totalFollowers);
  if (firstValue > 0) {
    return firstValue;
  }
  return numeric(months[1]?.totalFollowers || 0);
}

export function getPlatformStartValue<T extends Record<string, unknown>>(months: T[], key: keyof T): number {
  if (!months.length || months.length === 1) {
    return 0;
  }
  const firstValue = numeric(months[0][key]);
  if (firstValue > 0) {
    return firstValue;
  }
  return numeric(months[1]?.[key] ?? 0);
}

export function getLeadStartValue(months: Array<{ newLeads: number }>): number {
  if (!months.length || months.length === 1) {
    return 0;
  }
  const candidate = months.slice(0, Math.min(months.length, 4)).find((month) => numeric(month.newLeads) > 0);
  return candidate ? numeric(candidate.newLeads) : 0;
}
