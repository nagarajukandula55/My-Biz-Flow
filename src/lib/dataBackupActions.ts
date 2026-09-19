"use server";

import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";

/**
 * Self-service "export my own data" download for a partner's peace of mind
 * — NOT a sync/backup pipeline to any other system. Dumps every
 * BusinessRecord row this partner owns (every module — POS, Billing,
 * Service Centre, Inventory, etc.) as one JSON file, the "Server Action
 * returns the file content as text, client turns it into a Blob and
 * downloads it" pattern (the GST Export feature, src/app/api/gst-export/
 * route.ts, moved off this pattern onto a Route Handler instead — see
 * that route's header comment for why). Deliberately scoped to THIS
 * partner's own rows only (requireSessionPartnerId enforces that) — this is a local
 * export a partner can keep for themselves, not a cross-tenant database
 * sync to AN-Accounting or anywhere else. See docs/DEPLOYMENT.md and the
 * task notes this was built from for why a real live-DB-to-DB sync feature
 * was deliberately NOT built here.
 */
export async function downloadDataBackupAction(
  partnerId: string
): Promise<{ json: string; filename: string; recordCount: number }> {
  await requireSessionPartnerId(partnerId);

  const [partner, records] = await Promise.all([
    getPartner(partnerId),
    prisma.businessRecord.findMany({
      where: { partnerId },
      orderBy: [{ moduleSlug: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const byModule: Record<string, Record<string, unknown>[]> = {};
  for (const r of records) {
    const list = byModule[r.moduleSlug] ?? (byModule[r.moduleSlug] = []);
    list.push({ id: r.recordKey, ...(r.data as Record<string, unknown>) });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    partnerId,
    businessName: partner?.businessName ?? null,
    recordCount: records.length,
    modules: byModule,
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `my-biz-flow-backup-${partnerId}-${new Date().toISOString().slice(0, 10)}.json`;
  return { json, filename, recordCount: records.length };
}
