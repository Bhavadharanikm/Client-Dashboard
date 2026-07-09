// Ported verbatim (behavior-for-behavior) from Main Page/Dashboard/dashboard.js

import { DASHBOARD_CONFIG } from "./config";

export const CLIENT_ALIASES: Record<string, string[]> = {
  "apple-mountain": ["apple-mountain", "apple-mountain-resort"],
  "casa-oso": ["casa-oso", "casa-oso-ad-account"],
  "bison-ridge-retreat": ["bison-ridge", "bison-ridge-retreat"],
  "three-suns-cabins": ["three-suns", "three-suns-cabins"],
};

export const EXCLUDED_CLIENT_SLUGS = ["new", "north-star-nature-suites"];

export const PRICING_ENABLED_SLUGS = [
  "flohom",
  "paradise-pointe",
  "awayframes",
  "reflections-resorts",
  "stay-on-30a",
];

export function normalizeAccessCode(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

export function canonicalizeClientSlug(slug: unknown): string {
  const normalized = String(slug ?? "").trim();
  const canonical = Object.keys(CLIENT_ALIASES).find((candidate) =>
    CLIENT_ALIASES[candidate].includes(normalized)
  );
  return canonical || normalized;
}

export function isPricingToolClient(clientSlug: unknown): boolean {
  const canonical = canonicalizeClientSlug(clientSlug);
  if (PRICING_ENABLED_SLUGS.includes(canonical)) {
    return true;
  }
  const pricingToolConfig = DASHBOARD_CONFIG.pricingTool;
  if (pricingToolConfig.enabled === false) {
    return false;
  }
  const allowedSlugs = pricingToolConfig.clientSlugs;
  if (!allowedSlugs.length) {
    return true;
  }
  return allowedSlugs.map(canonicalizeClientSlug).includes(canonical);
}

export function slugify(value: unknown): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
