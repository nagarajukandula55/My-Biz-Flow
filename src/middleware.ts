import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

/**
 * Enforces the Super Admin gate at the routing layer — see
 * src/lib/adminAuth.ts for what this does and does not guarantee (shared
 * secret, not real per-user auth). Matches:
 *   - anything under /admin (the platform Designer, etc.)
 *   - any module's admin/ subfolder: /vendor/[vendorId]/<slug>/admin...
 * The login page itself (/admin/login) must stay reachable without the
 * cookie, or nobody could ever get in.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isModuleAdminRoute = /^\/vendor\/[^/]+\/[^/]+\/admin(\/|$)/.test(pathname);

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
  matcher: ["/admin/:path*", "/vendor/:path*"],
};
