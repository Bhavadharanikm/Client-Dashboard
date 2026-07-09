import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware";
import { isAdminEmail, isSuperAdminEmail } from "@/lib/server/admin-identity";

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  // getUser() revalidates the JWT against Supabase's auth server rather than
  // trusting a possibly-stale cookie — this is the actual security boundary,
  // not just a client-side redirect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isSuperAdminRoute = pathname.startsWith("/admin/super");
  const isAdminRoute = pathname.startsWith("/admin/dashboard");

  if (isSuperAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (!isSuperAdminEmail(user.email)) {
      // Covers both "not an admin at all" and "a regular admin, but not
      // super" — either way, bounced to their own area, never shown anything
      // super-admin-shaped even transiently.
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return getResponse();
  }

  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (!isAdminEmail(user.email)) {
      // A client with a valid session gets bounced to their own area, never
      // shown anything admin-shaped even transiently.
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return getResponse();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return getResponse();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/dashboard/:path*", "/admin/super/:path*"],
};
