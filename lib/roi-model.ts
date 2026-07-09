// Ported verbatim from Main Page/Dashboard/dashboard.js

import { CLIENT_ALIASES, EXCLUDED_CLIENT_SLUGS, canonicalizeClientSlug } from "./client-slug";

export type Client = { slug: string; name: string; code?: string };

export type PerformanceRow = Record<string, unknown> & {
  client_slug: string;
  year: number;
  month: number;
};

export type PerformanceWorkbook = {
  clients: Client[];
  rowsByClientSlug: Record<string, PerformanceRow[]>;
  metaRowsByClientSlug: Record<string, PerformanceRow[]>;
};

// Same display-name overrides as the original — anything not listed falls back
// to a title-cased version of the slug.
export const CLIENT_DISPLAY_NAMES: Record<string, string> = {
  "american-river": "American River Resort",
  "apple-mountain": "Apple Mountain",
  "asheville-river-cabins": "Asheville River Cabins",
  away2pa: "Away2PA",
  awayframes: "Awayframes",
  "big-moon-ranch": "Big Moon Ranch",
  "bison-ridge-retreat": "Bison Ridge Retreat",
  "dwell-luxury-rentals": "Dwell Luxury Rentals",
  "endless-stays": "Endless Stays",
  "evergreen-cabins": "Evergreen Cabins",
  flohom: "Flohom",
  "green-springs-inn": "Green Springs Inn",
  "hgm-client": "HGM Client",
  "hiawassee-glamping": "Hiawassee Glamping",
  "hillside-amble": "Hillside Amble",
  "home-base": "Home Base",
  "inspired-retreats": "Inspired Retreats",
  myrinn: "Myrinn",
  "nature-nooks": "Nature Nooks",
  "paradise-pointe": "Paradise Pointe",
  "parker-reserve": "Parker Reserve",
  "pine-valley-cabins": "Pine Valley Cabins",
  "raven-rock-mountain": "Raven Rock Mountain",
  "red-white-blue-views": "Red White Blue Views",
  "reflections-resorts": "Reflections Resorts",
  "roundhouse-resort-spa": "Roundhouse Resort & Spa",
  "southern-illinois-cabins": "Southern Illinois Cabins",
  "starlight-haven-hot-springs": "Starlight Haven – Hot Springs",
  "starlight-haven-weiss-lake": "Starlight Haven – Weiss Lake",
  "stay-different": "Stay Different",
  "stay-on-30a": "Stay on 30A",
  "stay-saluda": "Stay Saluda",
  "stay-with-branch": "Stay with Branch",
  stayluxe: "StayLuxe",
  "the-cohost-company": "The Cohost Company",
  "three-suns-cabins": "Three Suns Cabins",
  "treetop-escapes": "Treetop Escapes",
  "wanderin-star-farms": "Wanderin Star Farms",
};

export function toMonthKey(year: number | string, month: number | string): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function compareWorkbookRows(left: PerformanceRow, right: PerformanceRow): number {
  return toMonthKey(left.year, left.month).localeCompare(toMonthKey(right.year, right.month));
}

export function titleCaseSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Merges alias-slug rows into their canonical slug and drops excluded/test
 * clients. Ported verbatim, including the original's quirk: metaRowsByClientSlug
 * passed in here is normally empty at call time (the real Meta rows are merged
 * in separately, AFTER this runs, by fetchPerformanceWorkbook below) — so the
 * alias-merge logic below never actually applies to Meta rows in practice,
 * only to `rowsByClientSlug`. Preserved as-is for behavioral parity.
 */
export function normalizePerformanceWorkbook(workbook: Partial<PerformanceWorkbook>): PerformanceWorkbook {
  let nextClients = (workbook.clients || []).slice();
  const nextRowsByClientSlug = { ...(workbook.rowsByClientSlug || {}) };
  const nextMetaRowsByClientSlug = { ...(workbook.metaRowsByClientSlug || {}) };

  Object.keys(CLIENT_ALIASES).forEach((canonicalSlug) => {
    const aliases = CLIENT_ALIASES[canonicalSlug];
    const matchingClients = nextClients.filter((client) => aliases.includes(client.slug));
    if (!matchingClients.length) return;

    const canonicalClient = {
      ...(matchingClients.find((client) => client.slug === canonicalSlug) || matchingClients[0]),
      slug: canonicalSlug,
    };

    nextClients = nextClients.filter((client) => !aliases.includes(client.slug));
    nextClients.push(canonicalClient);

    nextRowsByClientSlug[canonicalSlug] = aliases
      .reduce<PerformanceRow[]>((rows, alias) => rows.concat(nextRowsByClientSlug[alias] || []), [])
      .sort(compareWorkbookRows);

    nextMetaRowsByClientSlug[canonicalSlug] = aliases
      .reduce<PerformanceRow[]>((rows, alias) => rows.concat(nextMetaRowsByClientSlug[alias] || []), [])
      .sort(compareWorkbookRows);
  });

  nextClients = nextClients.filter((client) => !EXCLUDED_CLIENT_SLUGS.includes(client.slug));

  return {
    clients: nextClients.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    rowsByClientSlug: nextRowsByClientSlug,
    metaRowsByClientSlug: nextMetaRowsByClientSlug,
  };
}

export function getPerformanceRoiRows(workbook: PerformanceWorkbook, slug: string): PerformanceRow[] {
  return workbook.rowsByClientSlug[slug] || [];
}

export function getMetaRows(workbook: PerformanceWorkbook, slug: string): PerformanceRow[] {
  return workbook.metaRowsByClientSlug[slug] || [];
}

export function getAllMonthKeys(workbook: PerformanceWorkbook, slug: string): string[] {
  return getPerformanceRoiRows(workbook, slug)
    .map((row) => toMonthKey(row.year, row.month))
    .sort();
}

export function getClientMonthBounds(workbook: PerformanceWorkbook, slug: string): { min: string; max: string } {
  const keys = getAllMonthKeys(workbook, slug);
  return { min: keys[0] || "", max: keys[keys.length - 1] || "" };
}

export { canonicalizeClientSlug };
