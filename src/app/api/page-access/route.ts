import { NextResponse, type NextRequest } from "next/server";
import { getRegisteredPages } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";
import { findPageByPathname } from "@/lib/designer/pathMatch";
import { isPagePublic } from "@/lib/designer/pageAccess";

/**
 * Node.js runtime (the App Router default for route handlers — no
 * `export const runtime = "edge"` here). src/middleware.ts runs on the
 * Edge runtime and cannot import the full page registry (every page.tsx
 * has Node-only imports) or node:fs (the pageAccess store), so it calls
 * this route instead to ask "is the page at this pathname public?" —
 * all the Node-specific work happens here, middleware just does a fetch.
 */
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("path") ?? "";
  const page = findPageByPathname(getRegisteredPages(), pathname);
  const isPublic = page ? isPagePublic(page.id) : false;
  return NextResponse.json({ isPublic, pageId: page?.id ?? null });
}
