import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
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
 * 2. The Super Admin gate — see src/lib/adminAuth.ts for what this does and
 *    does not guarantee (shared secret, not real per-user auth). Matches:
 *      - anything under /admin (the platform Designer, etc.)
 *      - any module's admin/ subfolder: /partner/[partnerId]/<slug>/admin...
 *    The login page itself (/admin/login) must stay reachable without the
 *    cookie, or nobody could ever get in.
 */
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
    return NextResponse.next();
  }

  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isModuleAdminRoute = /^\/partner\/[^/]+\/[^/]+\/admin(\/|$)/.test(pathname);

  if (isAdminLogin || (!isAdminRoute && !isModuleAdminRoute)) {
    return NextResponse.next();
  }

  // A Super Admin can mark an otherwise-gated page public from
  // /admin/settings — checked via a Node.js API route (this middleware
  // runs on the Edge runtime, which cannot read the pageAccess store or
  // import the full page registry directly; see /api/page-access).
  try {
    const accessCheck = await fetch(
      new URL(`/api/page-access?path=${encodeURIComponent(pathname)}`, request.url)
    );
    if (accessCheck.ok) {
      const { isPublic } = (await accessCheck.json()) as { isPublic: boolean };
      if (isPublic) return NextResponse.next();
    }
  } catch {
    // If the access-check call itself fails, fail closed (fall through to
    // the cookie check) rather than accidentally exposing a gated page.
  }

  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminCookie(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|field-force-manifest.json|field-force-icon.svg).*)"],
};
