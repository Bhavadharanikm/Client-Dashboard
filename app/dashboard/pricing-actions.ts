"use server";

// Ported from Main Page/Dashboard/dashboard.js's fetchRevenueIntelligenceData() /
// buildRevenueIntelligencePricingData().
//
// Runs entirely server-side: the per-client `pricing_api_key` is looked up via
// the service-role client (bypasses RLS, filtered explicitly by client_slug —
// NOT the RLS-implicit "current user's own row", which would silently fetch
// the wrong profile whenever an admin is browsing on behalf of a client) and
// used as a bearer token against the external Revenue Intelligence API. The
// key itself is never returned to the caller — only the transformed pricing
// data shape (or null).
//
// The Pricing Tool is a rolling 30/60/90-day view, not tied to any specific
// calendar month, so there's no month gating here at all.

import { canonicalizeClientSlug, PRICING_ENABLED_SLUGS } from "@/lib/client-slug";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { resolveSession } from "@/lib/server/session";
import type { RawPricingData, RawPricingWindowRow } from "@/lib/pricing-model";

const REVENUE_INTELLIGENCE_API_URL = "https://hiddengem-ai.netlify.app/api/v1/public/revenue-intelligence";

type RevenueIntelligenceWindow = {
  totalDays?: number;
  bookedNights?: number;
  availableNights?: number;
  occupancyRate?: number;
  totalRevenue?: number;
  adr?: number;
};

type RevenueIntelligenceProperty = {
  id?: string;
  name?: string;
  adr?: number;
  windows?: Record<string, RevenueIntelligenceWindow>;
};

type RevenueIntelligenceResponse = {
  propertyBreakdown?: RevenueIntelligenceProperty[];
  generatedAt?: string;
  threshold?: number;
};

function splitRevenueIntelligenceLocation(name: string | undefined): { city: string; state: string } {
  const raw = String(name || "")
    .split("|")
    .slice(1)
    .join("|")
    .trim();
  if (!raw) {
    return { city: "", state: "" };
  }
  const parts = raw
    .split(",")
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts.slice(0, -1).join(", "), state: parts[parts.length - 1] };
  }
  return { city: raw, state: "" };
}

function buildRevenueIntelligencePricingData(source: RevenueIntelligenceResponse | null): RawPricingData | null {
  const breakdown = Array.isArray(source?.propertyBreakdown) ? source!.propertyBreakdown! : [];
  const windowKeys = ["30", "60", "90"];

  if (!breakdown.length) {
    return null;
  }

  const windows = windowKeys.reduce<Record<string, { all: RawPricingWindowRow[] }>>((acc, windowKey) => {
    acc[windowKey] = {
      all: breakdown.map((property) => {
        const windowData = property.windows?.[windowKey] || {};
        const location = splitRevenueIntelligenceLocation(property.name);
        return {
          id: property.id || property.name,
          name: property.name || "Listing",
          nickname: property.name || "Listing",
          city: location.city,
          state: location.state,
          basePrice: Number(property.adr) || Number(windowData.adr) || 0,
          totalDays: Number(windowData.totalDays) || 0,
          bookedDays: Number(windowData.bookedNights) || 0,
          availableDays: Number(windowData.availableNights) || 0,
          occupancyRate: Number(windowData.occupancyRate) || 0,
          potentialRevenue: Number(windowData.totalRevenue) || 0,
          recommendations: [],
        };
      }),
    };
    return acc;
  }, {});

  return {
    windows,
    totalListings: breakdown.length,
    generatedAt: source?.generatedAt || "",
    threshold: Number(source?.threshold) || 75,
  };
}

/**
 * Fetches live Revenue Intelligence pricing data for a client, server-side only.
 * Returns null on any failure (not a pricing-tool client, no API key on the
 * profile, network error, or an empty breakdown) — callers should fall back
 * to the bootstrap-fetched static pricingToolData in that case.
 */
export async function getRevenueIntelligence(clientSlug: string): Promise<RawPricingData | null> {
  const canonicalSlug = canonicalizeClientSlug(clientSlug);
  // Mirrors fetchRevenueIntelligenceData()'s own PRICING_ENABLED_SLUGS check in
  // dashboard.js — intentionally narrower than isPricingToolClient(), which
  // also allows config-driven client slugs for the static-JSON branch.
  if (!PRICING_ENABLED_SLUGS.includes(canonicalSlug)) {
    return null;
  }

  // Server Actions are independently network-reachable regardless of which
  // client the calling page's UI has selected — without this check, any
  // logged-in client could call this action with a DIFFERENT client's slug
  // and receive that other client's live revenue/occupancy data. Admins
  // browse on behalf of any client (no clientSlug of their own to compare
  // against), so only non-admin sessions are restricted to their own slug.
  const session = await resolveSession();
  if (!session.isAuthenticated) {
    return null;
  }
  if (!session.isAdmin && session.clientSlug !== canonicalSlug) {
    return null;
  }

  try {
    // Service-role lookup, explicitly filtered by the client being viewed —
    // NOT the RLS-implicit "current user's own row", which would silently
    // return the wrong (or no) profile whenever an admin views this on
    // behalf of a client rather than the client viewing their own data.
    const supabaseAdmin = createAdminSupabaseClient();
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("pricing_api_key")
      .eq("client_slug", canonicalSlug)
      .maybeSingle();

    if (error || !profile || !profile.pricing_api_key) {
      return null;
    }

    const response = await fetch(REVENUE_INTELLIGENCE_API_URL, {
      headers: {
        Authorization: `Bearer ${profile.pricing_api_key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RevenueIntelligenceResponse;
    return buildRevenueIntelligencePricingData(payload);
  } catch {
    return null;
  }
}
