"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";
import { prisma } from "@/lib/prisma";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  await setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}

/**
 * Wipes every Prisma-backed store back to empty — Designer customizations,
 * document templates, module appearance overrides, numbering schemes/
 * counters, page-access toggles, and the error log. This is everything
 * that currently persists; business records (workorders, invoices,
 * inventory, etc.) still live in src/lib/sample-data/* in-memory arrays
 * and reset on every deploy/restart already, so there's nothing else to
 * clear yet — once those migrate to Prisma (see CLAUDE.md), their tables
 * must be added here too.
 */
export async function resetDemoData(): Promise<{ ok: true }> {
  await prisma.$transaction([
    prisma.pageCustomization.deleteMany({}),
    prisma.documentTemplate.deleteMany({}),
    prisma.moduleAppearance.deleteMany({}),
    prisma.numberingMainScheme.deleteMany({}),
    prisma.numberingVendorScheme.deleteMany({}),
    prisma.numberingCounter.deleteMany({}),
    prisma.pageAccess.deleteMany({}),
    prisma.errorLogEntry.deleteMany({}),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}
