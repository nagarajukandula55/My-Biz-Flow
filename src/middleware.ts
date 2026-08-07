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
