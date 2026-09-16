import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Two independent gates, checked in order:
 *
 * 1. Standalone Field Force lock-down (FIELD_FORCE_STANDALONE=true) — for a
 *    SEPARATE deployment (its own Vercel project/domain, same repo+DB) that
 *    should expose ONLY one partner's Field Force Customer/Provider
 *    self-serve app, nothing else in My Biz Flow (no marketing pages, no
 *    partner-staff console, no Super Admin). Everything outside the allowed
 *    prefixes redirects to /field-force-app. The normal (non-standalone)
 *    deployment never hits this — env.fieldForceStandalone() is false by
 *    default, so this whole block is a no-op there.
 *
 * 2. Every Super Admin surface (the platform Designer, Plans, Subscribers,
 *    every module's admin/ subfolder, etc.) has moved to the separate
 *    My Biz Flow Admin app/repo, which owns its own auth end to end — this
 *    app no longer has any /admin/* route or module admin/ subfolder of
 *    its own, so there is nothing left to gate here. Any stray link to
 *    /admin/* just redirects to the admin app instead of 404ing.
 */
function next(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (env.fieldForceStandalone()) {
    const partnerId = env.fieldForcePartnerId();
    const allowed =
      pathname === "/field-force-app" ||
      pathname.startsWith("/api/field-force/") ||
      (partnerId &&
        (pathname.startsWith(`/partner/${partnerId}/field-force/customer`) ||
          pathname.startsWith(`/partner/${partnerId}/field-force/provider`)));

    if (!allowed) {
      return NextResponse.redirect(new URL("/field-force-app", request.url));
    }
    return next(request);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL(pathname, env.adminAppUrl()));
  }

  return next(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|field-force-manifest.json|field-force-icon.svg|telecalling-manifest.json|telecalling-icon.svg).*)",
  ],
};
