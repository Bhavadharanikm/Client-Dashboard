// Ported from Main Page/Dashboard/scripts/fetch_sheet_data.py (Performance data —
// live Sheets API reads, FORMATTED_VALUE render option, so cells arrive as strings)
// and scripts/export_performance_workbook.py (Ads ROI meta-row shape/aggregation
// logic, adapted here for live API reads instead of openpyxl typed cells).

import type { sheets_v4 } from "googleapis";
import { canonicalizeClientSlug, slugify, EXCLUDED_CLIENT_SLUGS } from "@/lib/client-slug";

export type SheetRowMap = Record<string, string>;

const EXCLUDED_PERFORMANCE_SHEETS = new Set(["Overview", "[Template]", "Template", "Copy of Template", "Copy of Template 1"]);

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Same manual overrides as the Python pipeline — tab titles that don't slugify
// cleanly to the canonical client slug used elsewhere in this app.
const MANUAL_ROI_TAB_SLUGS: Record<string, string> = {
  "bison ridge retreat": "bison-ridge-retreat",
  "three suns cabins": "three-suns",
};

export function normalizeHeader(value: unknown): string {
  let text = String(value ?? "").trim().toLowerCase();
  text = text
    .replace(/🎉/g, "")
    .replace(/📈/g, "")
    .replace(/👁️/g, "")
    .replace(/\//g, " ")
    .replace(/%/g, " pct ")
    .replace(/#/g, " num ")
    .replace(/\$/g, " ");
  text = text.replace(/[^a-z0-9]+/g, "_");
  return text.replace(/^_+|_+$/g, "");
}

export function normalizeName(value: unknown): string {
  let text = String(value ?? "").replace(/\n/g, " ").split(/\s+/).filter(Boolean).join(" ").toLowerCase();
  text = text.replace(/[^a-z0-9]+/g, " ").trim();
  return text.split(/\s+/).filter(Boolean).join(" ");
}

export function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  let text = String(value).trim();
  if (!text || ["N/A", "#DIV/0!", "#VALUE!", "#REF!"].includes(text.toUpperCase())) return null;
  const negative = text.startsWith("(") && text.endsWith(")");
  text = text.replace(/^\(|\)$/g, "").replace(/,/g, "").replace(/\$/g, "").replace(/%/g, "");
  const number = Number(text);
  if (Number.isNaN(number)) return null;
  return negative ? -number : number;
}

function isExplicitNA(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return ["N/A", "NA", "#N/A"].includes(String(value).trim().toUpperCase());
}

/** "N/A" | null | number — no forced-zero fallbacks, matches fetch_sheet_data.py. */
export function numOrNa(value: unknown): number | "N/A" | null {
  if (value === null || value === undefined || value === "") return null;
  if (isExplicitNA(value)) return "N/A";
  return cleanNumber(value);
}

export function pctOrNa(value: unknown): number | "N/A" | null {
  const n = numOrNa(value);
  if (n === null || n === "N/A") return n;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function percentText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  const number = cleanNumber(value);
  if (number === null) return null;
  return Math.abs(number) <= 1 ? `${Math.round(number * 100)}%` : `${Math.round(number)}%`;
}

export function textOrNa(value: unknown): string | "N/A" | null {
  if (value === null || value === undefined || value === "") return null;
  if (isExplicitNA(String(value).trim())) return "N/A";
  return percentText(value);
}

/** Parses a "timeline"/"month" cell (a formatted string, since we read with
 * valueRenderOption=FORMATTED_VALUE) into {year, month}, or null. */
export function parseDateCell(value: unknown): { year: number; month: number } | null {
  if (!value) return null;
  const text = String(value).trim();

  const numericFormats: Array<[RegExp, (m: RegExpMatchArray) => { year: number; month: number } | null]> = [
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (m) => ({ month: Number(m[1]), year: Number(m[3]) })],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, (m) => ({ month: Number(m[1]), year: 2000 + Number(m[3]) })],
    [/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (m) => ({ year: Number(m[1]), month: Number(m[2]) })],
    [/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, (m) => ({ year: Number(m[1]), month: Number(m[2]) })],
  ];
  for (const [pattern, extract] of numericFormats) {
    const match = text.match(pattern);
    if (match) {
      const result = extract(match);
      if (result) return result;
    }
  }

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const monthMatch = text
    .toLowerCase()
    .match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  if (yearMatch && monthMatch) {
    const month = MONTH_MAP[monthMatch[1]];
    if (month) return { year: Number(yearMatch[1]), month };
  }
  return null;
}

function buildRowMap(headers: string[], row: unknown[]): SheetRowMap {
  const padded = [...row];
  while (padded.length < headers.length) padded.push("");
  const map: SheetRowMap = {};
  headers.forEach((header, index) => {
    map[header] = String(padded[index] ?? "");
  });
  return map;
}

function resolvePerformanceTabSlug(title: string): string {
  const normalized = normalizeName(title);
  const resolvedSlug = MANUAL_ROI_TAB_SLUGS[normalized] || slugify(title);
  return canonicalizeClientSlug(resolvedSlug);
}

/**
 * Resolves which Performance-sheet tab belongs to a given canonical client
 * slug, by scanning all tab titles and slugifying/normalizing each (with the
 * same manual overrides the Python pipeline used).
 */
export async function findPerformanceTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  clientSlug: string
): Promise<string | null> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean);

  for (const title of titles) {
    if (EXCLUDED_PERFORMANCE_SHEETS.has(title)) continue;
    if (resolvePerformanceTabSlug(title) === clientSlug) {
      return title;
    }
  }
  return null;
}

export type PerformanceSheetClient = { slug: string; name: string };

/** Runs async `fn` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

/** Finds the most recent (year, month) reported anywhere in one tab, or null. */
async function getTabLatestMonth(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string
): Promise<number | null> {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabTitle}'`,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const values = result.data.values || [];
    let headerRowIndex: number | null = null;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(6, values.length); i += 1) {
      const normalized = values[i].map((cell) => normalizeHeader(cell));
      if (normalized.includes("timeline") || normalized.includes("month")) {
        headerRowIndex = i;
        headers = normalized;
        break;
      }
    }
    if (headerRowIndex === null) return null;

    const timelineIndex = headers.indexOf("timeline") >= 0 ? headers.indexOf("timeline") : headers.indexOf("month");
    let latest: number | null = null;
    for (const row of values.slice(headerRowIndex + 1)) {
      const date = parseDateCell(row[timelineIndex]);
      if (date) {
        const key = date.year * 12 + date.month;
        latest = latest === null ? key : Math.max(latest, key);
      }
    }
    return latest;
  } catch {
    return null;
  }
}

/**
 * Lists only the ACTIVE client tabs in the Performance sheet — "active" means
 * having a row for the most recent month reported anywhere in the sheet
 * (computed dynamically, not hardcoded to a specific month, so this keeps
 * working as months roll forward). This is deliberately NOT based on
 * Supabase data: offboarding a client removes their dashboard_performance
 * rows too, so "no Supabase history" does not reliably mean "brand new" —
 * checking the sheet's own reporting recency is the only signal that
 * actually distinguishes "never synced yet" from "offboarded long ago".
 * A brand-new tab with this month's data already filled in shows up
 * immediately, before it's ever been synced into Supabase.
 */
export async function listPerformanceClients(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<PerformanceSheetClient[]> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean);

  const seen = new Set<string>();
  const candidates: Array<{ title: string; slug: string }> = [];
  for (const title of titles) {
    if (EXCLUDED_PERFORMANCE_SHEETS.has(title)) continue;
    const slug = resolvePerformanceTabSlug(title);
    if (!slug || seen.has(slug) || EXCLUDED_CLIENT_SLUGS.includes(slug)) continue;
    seen.add(slug);
    candidates.push({ title, slug });
  }

  const latestMonths = await mapWithConcurrency(candidates, 8, (candidate) =>
    getTabLatestMonth(sheets, spreadsheetId, candidate.title)
  );

  const globalLatest = latestMonths.reduce<number | null>(
    (max, value) => (value === null ? max : max === null ? value : Math.max(max, value)),
    null
  );
  if (globalLatest === null) return [];

  const clients: PerformanceSheetClient[] = [];
  candidates.forEach((candidate, index) => {
    if (latestMonths[index] === globalLatest) {
      clients.push({ slug: candidate.slug, name: candidate.title.trim() });
    }
  });
  return clients;
}

/** Scans one client's Performance tab for the row matching (year, month). */
export async function findPerformanceRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string,
  year: number,
  month: number
): Promise<{ rowMap: SheetRowMap; tabTitle: string } | null> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabTitle}'`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = result.data.values || [];
  if (!values.length) return null;

  let headerRowIndex: number | null = null;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(6, values.length); i += 1) {
    const normalized = values[i].map((cell) => normalizeHeader(cell));
    if (normalized.includes("timeline") || normalized.includes("month")) {
      headerRowIndex = i;
      headers = normalized;
      break;
    }
  }
  if (headerRowIndex === null) return null;

  for (const rawRow of values.slice(headerRowIndex + 1)) {
    if (!rawRow.some((cell) => cell !== null && cell !== undefined && cell !== "")) continue;
    const rowMap = buildRowMap(headers, rawRow);
    const timelineValue = rowMap["timeline"] ?? rowMap["month"];
    const date = parseDateCell(timelineValue);
    if (date && date.year === year && date.month === month) {
      return { rowMap, tabTitle };
    }
  }
  return null;
}

// --- Ads ROI (one tab per month) -------------------------------------------

const META_MONTH_PATTERNS: Array<[string, number]> = [
  ["january", 1], ["jan", 1],
  ["february", 2], ["feb", 2],
  ["march", 3], ["mar", 3],
  ["april", 4], ["apr", 4],
  ["may", 5],
  ["june", 6], ["jun", 6],
  ["july", 7], ["jul", 7],
  ["august", 8], ["aug", 8],
  ["september", 9], ["sept", 9], ["sep", 9],
  ["october", 10], ["oct", 10],
  ["november", 11], ["nov", 11],
  ["december", 12], ["dec", 12],
];

export type AdsRoiTabCandidate = { title: string; year: number; month: number };

function parseAdsRoiTabTitle(title: string): { year: number; month: number } | null {
  const text = title.toLowerCase();
  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  for (const [token, monthNumber] of META_MONTH_PATTERNS) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      return { year: Number(yearMatch[1]), month: monthNumber };
    }
  }
  return null;
}

/**
 * Finds every tab matching the target (year, month), then applies a
 * disambiguation policy when more than one exists (this sheet has several
 * months with duplicate tabs, e.g. "Updated - April 2026" alongside "April
 * 2026 (Manual analysis notes)"): skip tabs whose title contains "notes"
 * (commentary, not data), then prefer a tab whose title contains "updated"
 * (a superseding version) if present. Otherwise fall back to the first match
 * in spreadsheet order. The chosen title AND all candidates are returned so
 * the caller can surface "which tab did this come from" to the operator —
 * this is the real safety net given the heuristic above is a best guess.
 */
export async function findAdsRoiTabForMonth(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  year: number,
  month: number
): Promise<{ chosen: string; candidates: string[] } | null> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles = (meta.data.sheets || []).map((s) => s.properties?.title || "").filter(Boolean);

  const candidates = titles.filter((title) => {
    const parsed = parseAdsRoiTabTitle(title);
    return parsed && parsed.year === year && parsed.month === month;
  });
  if (!candidates.length) return null;

  const withoutNotes = candidates.filter((title) => !/notes/i.test(title));
  const pool = withoutNotes.length ? withoutNotes : candidates;
  const updated = pool.find((title) => /updated/i.test(title));

  return { chosen: updated || pool[0], candidates };
}

export type AdsRoiClientRow = { campaignType: string; rowMap: SheetRowMap };

/** Scans one month's Ads ROI tab for every row belonging to the target client. */
export async function findAdsRoiRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string,
  clientSlug: string
): Promise<AdsRoiClientRow[]> {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabTitle}'`,
    valueRenderOption: "FORMATTED_VALUE",
  });
  const values = result.data.values || [];
  if (!values.length) return [];

  let headerRowIndex: number | null = null;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(8, values.length); i += 1) {
    const normalized = values[i].map((cell) => normalizeHeader(cell));
    if (normalized.includes("campaign_type") && (normalized.includes("spend") || normalized.includes("campaign_spend"))) {
      headerRowIndex = i;
      headers = normalized;
      break;
    }
  }
  if (headerRowIndex === null) return [];

  const matches: AdsRoiClientRow[] = [];
  for (const rawRow of values.slice(headerRowIndex + 1)) {
    if (!rawRow.some((cell) => cell !== null && cell !== undefined && cell !== "")) continue;
    const rawName = rawRow[0];
    const resolvedSlug = canonicalizeClientSlug(slugify(String(rawName ?? "")));
    if (resolvedSlug !== clientSlug) continue;

    const rowMap = buildRowMap(headers, rawRow);
    const campaignType = normalizeName(rowMap["campaign_type"]);
    const label = campaignType === "retargeting" ? "Retargeting" : campaignType.includes("follower") || campaignType.includes("lead") ? "Discovery" : rowMap["campaign_type"] || "Campaign";
    matches.push({ campaignType: label, rowMap });
  }
  return matches;
}
