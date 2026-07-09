import type { NextConfig } from "next";

const nextConfig = {
  /* config options here */
  // @supabase/supabase-js references `process.version` (guarded, but still
  // flagged by static Edge Runtime analysis) — middleware.ts only needs it to
  // revalidate the session cookie, so running it on the Node.js runtime
  // avoids the Edge API restriction entirely instead of fighting it.
  // Not yet in this Next version's NextConfig type, hence the cast below.
  experimental: {
    nodeMiddleware: true,
  },
} as NextConfig;

export default nextConfig;
