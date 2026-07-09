import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  // getUser() revalidates the JWT against Supabase's auth server rather than
  // trusting a possibly-stale cookie — this is the actual security boundary,
  // not just a client-side redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return getResponse();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
