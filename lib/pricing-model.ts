// Ported from Main Page/Dashboard/Pricing Tool Files/pricing-tool.js — pure data
// transforms only (no DOM). The React components in components/pricing/ own the
// rendering; this module owns normalization, aggregation, and formatting helpers.

export type PricingRecommendation = Record<string, unknown>;

export type PricingWindowData = {
  totalDays: number;
  bookedDays: number;
  availableDays: number;
  occupancyRate: number;
  potentialRevenue: number;
  recommendations: PricingRecommendation[];
};

export type PricingListing = {
  id: string;
  name: string;
  nickname: string;
  city: string;
  state: string;
  basePrice: number;
  windows: Record<string, PricingWindowData>;
  totalPotentialRevenue: number;
  searchText: string;
};

export type PricingModel = {
  totalListings: number;
  generatedAt: string;
  threshold: number;
  windowKeys: string[];
  listings: PricingListing[];
  states: string[];
};

export type PricingWindowSummary = {
  totalOccupancy: number;
  openValue: number;
  nearingFull: number;
  actionable: number;
};

export type PricingViewState = {
  activeWindow: string;
  filterState: string;
  search: string;
  sortKey: string;
  openRowId: string;
  detailWindowByRow: Record<string, string>;
};

/** Raw shape fed into normalizePricingData — matches pricing-tool-data.json / the
 * revenue-intelligence-derived shape built by buildRevenueIntelligencePricingData(). */
export type RawPricingWindowRow = {
  id?: string;
  name?: string;
  nickname?: string;
  city?: string;
  state?: string;
  basePrice?: number;
  totalDays?: number;
  bookedDays?: number;
  availableDays?: number;
  occupancyRate?: number;
  potentialRevenue?: number;
  recommendations?: PricingRecommendation[];
};

export type RawPricingData = {
  windows?: Record<string, { all?: RawPricingWindowRow[] }>;
  totalListings?: number;
  generatedAt?: string;
  threshold?: number;
};

export function normalizePricingData(data: RawPricingData | null | undefined): PricingModel | null {
  if (!data || !data.windows) {
    return null;
  }

  const listings: Record<string, PricingListing> = {};
  const windowKeys = Object.keys(data.windows)
    .filter((key) => data.windows![key] && Array.isArray(data.windows![key].all))
    .sort((left, right) => Number(left) - Number(right));

  if (!windowKeys.length) {
    return null;
  }

  windowKeys.forEach((windowKey) => {
    (data.windows![windowKey].all || []).forEach((row) => {
      const id = row.id || row.name;
      if (!id) {
        return;
      }
      if (!listings[id]) {
        listings[id] = {
          id,
          name: row.name || row.nickname || "Listing",
          nickname: row.nickname || row.name || "Listing",
          city: row.city || "",
          state: row.state || "",
          basePrice: Number(row.basePrice) || 0,
          windows: {},
          totalPotentialRevenue: 0,
          searchText: "",
        };
      }

      listings[id].windows[windowKey] = {
        totalDays: Number(row.totalDays) || 0,
        bookedDays: Number(row.bookedDays) || 0,
        availableDays: Number(row.availableDays) || 0,
        occupancyRate: Number(row.occupancyRate) || 0,
        potentialRevenue: Number(row.potentialRevenue) || 0,
        recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
      };
      listings[id].totalPotentialRevenue += Number(row.potentialRevenue) || 0;
    });
  });

  const allListings = Object.keys(listings)
    .map((id) => {
      const listing = listings[id];
      listing.searchText = [listing.name, listing.nickname, listing.city, listing.state].join(" ").toLowerCase();
      return listing;
    })
    .sort((left, right) => left.nickname.localeCompare(right.nickname));

  return {
    totalListings: Number(data.totalListings) || allListings.length,
    generatedAt: data.generatedAt || "",
    threshold: Number(data.threshold) || 0,
    windowKeys,
    listings: allListings,
    states: Array.from(new Set(allListings.map((listing) => listing.state).filter(Boolean))).sort(),
  };
}

export function getWindowSummary(listings: PricingListing[], windowKey: string): PricingWindowSummary {
  return listings.reduce<PricingWindowSummary>(
    (summary, listing) => {
      const windowData = listing.windows[windowKey];
      const recommendations = windowData?.recommendations || [];
      const occupancyRate = Number(windowData?.occupancyRate) || 0;
      const availableDays = Number(windowData?.availableDays) || 0;
      summary.totalOccupancy += occupancyRate;
      summary.openValue += Number(windowData?.potentialRevenue) || 0;
      if (availableDays <= 5) {
        summary.nearingFull += 1;
      }
      if (recommendations.length) {
        summary.actionable += 1;
      }
      return summary;
    },
    { totalOccupancy: 0, openValue: 0, nearingFull: 0, actionable: 0 }
  );
}

export function getAvgOccupancy(listings: PricingListing[], windowKey: string): number {
  if (!listings.length) {
    return 0;
  }
  return getWindowSummary(listings, windowKey).totalOccupancy / listings.length;
}

export function buildLeadTimeLine(model: PricingModel, windowKey: string): string {
  const listings = model.listings;
  const gapCount = listings.filter((listing) => Number(listing.windows[windowKey]?.availableDays) > 0).length;
  const soldOutCount = listings.filter((listing) => Number(listing.windows[windowKey]?.availableDays) <= 0).length;
  const actionableCount = listings.filter((listing) => {
    const windowData = listing.windows[windowKey];
    return Array.isArray(windowData?.recommendations) && windowData.recommendations.length > 0;
  }).length;
  const avgOccupancy = Math.round(getAvgOccupancy(listings, windowKey));
  const label = `${windowKey}-day`;

  if (windowKey === "30") {
    return `${label}: ${gapCount} of ${listings.length} cabins still have open nights, while ${soldOutCount} unit${
      soldOutCount === 1 ? " is" : "s are"
    } already sold out. This window still needs tactical fills more than broad discounting.`;
  }
  if (windowKey === "60") {
    return `${label}: Occupancy is averaging ${avgOccupancy}%, with ${actionableCount} cabins showing active pricing opportunities. The middle runway is where positioning and rate discipline can still reshape pace.`;
  }
  return `${label}: All ${listings.length} cabins still have bookable runway, and portfolio occupancy sits at ${avgOccupancy}%. This longer horizon is best used to protect premium weekends while packaging the softer stays more intentionally.`;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function blendHex(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  return (
    "#" +
    [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

/** Occupancy-to-color interpolation: red→blue→amber→green bands (0-39/40-59/60-89/90-100). */
export function hmColor(value: unknown): string {
  const occupancy = Number(value) || 0;

  if (occupancy >= 90) {
    const t = (occupancy - 90) / 10;
    return blendHex("#3db76a", "#16a34a", t);
  }
  if (occupancy >= 60) {
    const t = (occupancy - 60) / 29;
    return blendHex("#6089ee", "#2d59e0", t);
  }
  if (occupancy >= 40) {
    const t = (occupancy - 40) / 19;
    return blendHex("#f7b236", "#e8920a", t);
  }
  const t = occupancy / 39;
  return blendHex("#93c5fd", "#3b82f6", t);
}

// Always 1 in the source too — occClass()/hmColor() already encode the visual
// intensity, so opacity is not modulated by occupancy. Kept as a function
// (rather than a constant) for parity with pricing-tool.js's call sites.
export function hmOpacity(): number {
  return 1;
}

export function occClass(value: unknown): "full" | "high" | "mid" | "low" {
  const occupancy = Number(value) || 0;
  if (occupancy >= 90) {
    return "full";
  }
  if (occupancy >= 60) {
    return "high";
  }
  if (occupancy >= 40) {
    return "mid";
  }
  return "low";
}

export function directionClass(changePercent: unknown): "up" | "dn" | "flat" {
  const value = Number(changePercent) || 0;
  if (value > 0) {
    return "up";
  }
  if (value < 0) {
    return "dn";
  }
  return "flat";
}

export function topRecommendation(listing: PricingListing, windowKey: string): PricingRecommendation | null {
  const primaryWindow = listing.windows[windowKey];
  const primaryRecommendations = primaryWindow?.recommendations || [];
  if (primaryRecommendations.length) {
    return primaryRecommendations[0];
  }
  const fallbacks = Object.keys(listing.windows).reduce<PricingRecommendation[]>(
    (rows, key) => rows.concat(listing.windows[key].recommendations || []),
    []
  );
  return fallbacks[0] || null;
}

export function revenueNext30(listing: PricingListing): number {
  return Number(listing.windows["30"]?.potentialRevenue) || 0;
}

export function rowDomId(listingId: string): string {
  return "pricing-row-" + String(listingId).replace(/[^a-zA-Z0-9_-]/g, "");
}

export function filteredListings(model: PricingModel, viewState: PricingViewState): PricingListing[] {
  return model.listings
    .filter((listing) => {
      const matchesState = viewState.filterState === "ALL" || listing.state === viewState.filterState;
      const matchesSearch = !viewState.search || listing.searchText.indexOf(viewState.search.toLowerCase()) !== -1;
      return matchesState && matchesSearch;
    })
    .sort((left, right) => {
      if (viewState.sortKey === "name") {
        return left.nickname.localeCompare(right.nickname);
      }
      if (viewState.sortKey === "opportunity") {
        return right.totalPotentialRevenue - left.totalPotentialRevenue;
      }
      if (viewState.sortKey === "30") {
        return (right.windows["30"]?.occupancyRate || 0) - (left.windows["30"]?.occupancyRate || 0);
      }
      if (viewState.sortKey === "90") {
        return (right.windows["90"]?.occupancyRate || 0) - (left.windows["90"]?.occupancyRate || 0);
      }
      return (
        (right.windows[viewState.activeWindow]?.potentialRevenue || 0) -
        (left.windows[viewState.activeWindow]?.potentialRevenue || 0)
      );
    });
}

/** Booked/available night grid cells for the expanded row detail — one entry per night. */
export function nightGridCells(windowData: PricingWindowData): Array<{ booked: boolean; cls: string }> {
  const booked = Number(windowData.bookedDays) || 0;
  const total = Number(windowData.totalDays) || 0;
  const cls = occClass(windowData.occupancyRate);
  const cells: Array<{ booked: boolean; cls: string }> = [];
  for (let index = 0; index < total; index += 1) {
    cells.push({ booked: index < booked, cls });
  }
  return cells;
}
