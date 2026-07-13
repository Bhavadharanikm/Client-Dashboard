import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const NO_STORE_CACHE_HEADER = { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" };

const nextConfig = {
  /* config options here */
  // Strips the `X-Powered-By: Next.js` response header (framework
  // fingerprinting) — Vercel's own headers (`server`, `x-vercel-id`) aren't
  // ours to remove.
  poweredByHeader: false,
  // @supabase/supabase-js references `process.version` (guarded, but still
  // flagged by static Edge Runtime analysis) — middleware.ts only needs it to
  // revalidate the session cookie, so running it on the Node.js runtime
  // avoids the Edge API restriction entirely instead of fighting it.
  // Not yet in this Next version's NextConfig type, hence the cast below.
  experimental: {
    nodeMiddleware: true,
  },
  headers: async () => [
    { source: "/(.*)", headers: SECURITY_HEADERS },
    // Auth + authenticated routes must never be shared-cached — each
    // response is specific to whoever's session cookie produced it.
    { source: "/login", headers: [NO_STORE_CACHE_HEADER] },
    { source: "/admin/login", headers: [NO_STORE_CACHE_HEADER] },
    { source: "/dashboard/:path*", headers: [NO_STORE_CACHE_HEADER] },
    { source: "/admin/dashboard/:path*", headers: [NO_STORE_CACHE_HEADER] },
    { source: "/admin/super/:path*", headers: [NO_STORE_CACHE_HEADER] },
  ],
} as NextConfig;

export default nextConfig;
