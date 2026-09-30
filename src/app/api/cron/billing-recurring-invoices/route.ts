import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { isAuthorizedCronRequest } from "@/lib/cronAuthorization";
import { env } from "@/lib/env";
import { listPartners } from "@/lib/partnerData";
import { listBusinessRecords } from "@/lib/businessRecords";
import { createDueRecurringInvoice } from "@/lib/recurringInvoiceRunner";

/**
 * Vercel Cron entry point (schedule it in vercel.json, e.g. daily) — for
 * every partner, finds Recurring Invoice templates (moduleSlug
 * "billing-recurring") that are Active and whose nextRunDate has passed,
 * creates a real Billing invoice BusinessRecord from the template's
 * snapshot, and advances the template's nextRunDate.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), env.cronSecret())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const partners = await listPartners();
  let createdCount = 0;
  const failures: { partnerId: string; templateId: string }[] = [];
  for (const partner of partners) {
    const templates = await listBusinessRecords(partner.id, "billing-recurring");
    for (const template of templates) {
      if (template.status !== "Active") continue;
      const nextRunDate = String(template.nextRunDate ?? "");
      if (!nextRunDate || nextRunDate > today) continue;
      try {
        if (await createDueRecurringInvoice(partner.id, String(template.id), nextRunDate, today)) createdCount++;
      } catch (error) {
        failures.push({ partnerId: partner.id, templateId: String(template.id) });
        console.error("[recurring invoice] Template failed", partner.id, template.id, error);
      }
    }
  }
  // Customer-invoice mirroring is intentionally disabled. Only platform
  // subscription revenue belongs in central accounting; disabled is not failure.
  return NextResponse.json({ ok: failures.length === 0, invoicesCreated: createdCount,
    failedTemplates: failures, centralApiSyncStatus: "disabled", centralApiSyncFailures: 0 },
    { status: failures.length ? 500 : 200 });
}
