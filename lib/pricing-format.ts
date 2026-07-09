// Small pricing-tool-specific formatting helpers. Money reuses lib/format.ts's
// formatCurrency (digits=0 matches the source's Intl.NumberFormat with
// maximumFractionDigits: 0). Percent is NOT reused from lib/format.ts's
// formatPercent because that helper expects a 0-1 decimal fraction — the
// pricing tool's occupancyRate values are already expressed as 0-100.

import { formatCurrency } from "@/lib/format";

export function formatMoney(value: unknown): string {
  return formatCurrency(value, 0);
}

export function formatPercent(value: unknown): string {
  return `${Math.round(Number(value) || 0)}%`;
}
