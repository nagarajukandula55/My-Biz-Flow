/**
 * The "make any page public" toggle store — backed by the `PageAccess`
 * Prisma table (see prisma/schema.prisma). Was a JSON-file store; migrated
 * to Postgres with the same function names/behavior so callers didn't
 * need to change shape, only add `await` (Prisma I/O is inherently async,
 * unlike the old synchronous fs reads).
 *
 * IMPORTANT SCOPE NOTE (see DESIGN_SYSTEM.md §9): this is only REAL
 * enforcement for pages currently gated by src/middleware.ts — /admin/*
 * and a module's admin/ subfolder. Ordinary vendor-facing pages
 * (list/create/edit/detail under /vendor/[vendorId]/<slug>/) have no
 * access gate at all yet, so marking one "public" here has no
 * observable effect — there's nothing to lift. The Settings UI shows
 * the toggle for every page for completeness, but says so explicitly
 * next to ungated pages rather than implying uniform protection.
 */

import { prisma } from "@/lib/prisma";

export async function isPagePublic(pageId: string): Promise<boolean> {
  const row = await prisma.pageAccess.findUnique({ where: { pageId } });
  return row?.isPublic === true;
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
}

export async function getAllPublicPageIds(): Promise<Set<string>> {
  const rows = await prisma.pageAccess.findMany({ where: { isPublic: true }, select: { pageId: true } });
  return new Set(rows.map((r) => r.pageId));
}
