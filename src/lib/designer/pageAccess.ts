/**
 * The "make any page public" toggle store — backed by the `PageAccess`
 * Prisma table (see prisma/schema.prisma). Was a JSON-file store; migrated
 * to Postgres with the same function names/behavior so callers didn't
 * need to change shape, only add `await` (Prisma I/O is inherently async,
 * unlike the old synchronous fs reads).
 *
 * IMPORTANT SCOPE NOTE (see DESIGN_SYSTEM.md §9): this is only REAL
 * enforcement for pages currently gated by src/middleware.ts — /admin/*
 * and a module's admin/ subfolder. Ordinary partner-facing pages
 * (list/create/edit/detail under /partner/[partnerId]/<slug>/) have no
 * access gate at all yet, so marking one "public" here has no
 * observable effect — there's nothing to lift. The Settings UI shows
 * the toggle for every page for completeness, but says so explicitly
 * next to ungated pages rather than implying uniform protection.
 */

import { prisma } from "@/lib/prisma";

/**
 * isPagePublic() is called from /api/page-access, which src/middleware.ts
 * fetches on EVERY request to an /admin or module-admin route (Edge
 * middleware can't read Prisma directly, so it round-trips to this Node
 * route instead). Without caching, that's a DB query on essentially every
 * gated admin page load system-wide. The public-page set only changes when
 * a Super Admin flips the toggle in /admin/settings, so it's cached whole
 * for a short TTL and invalidated immediately on write.
 */
const PUBLIC_PAGES_TTL_MS = 10_000;
let publicPagesCache: { ids: Set<string>; expiresAt: number } | null = null;

async function loadPublicPageIds(): Promise<Set<string>> {
  const now = Date.now();
  if (publicPagesCache && publicPagesCache.expiresAt > now) return publicPagesCache.ids;

  const rows = await prisma.pageAccess.findMany({ where: { isPublic: true }, select: { pageId: true } });
  const ids = new Set(rows.map((r) => r.pageId));
  publicPagesCache = { ids, expiresAt: now + PUBLIC_PAGES_TTL_MS };
  return ids;
}

export async function isPagePublic(pageId: string): Promise<boolean> {
  const ids = await loadPublicPageIds();
  return ids.has(pageId);
}

export async function setPagePublic(pageId: string, isPublic: boolean): Promise<void> {
  if (isPublic) {
    await prisma.pageAccess.upsert({
      where: { pageId },
      create: { pageId, isPublic: true },
      update: { isPublic: true },
    });
  } else {
    await prisma.pageAccess.delete({ where: { pageId } }).catch(() => {
      // Already absent — deleting a non-existent row is a no-op, not an error.
    });
  }
  publicPagesCache = null;
}

export async function getAllPublicPageIds(): Promise<Set<string>> {
  return loadPublicPageIds();
}
