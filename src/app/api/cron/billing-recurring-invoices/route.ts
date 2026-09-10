import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { listPartners } from "@/lib/partnerData";
import { listBusinessRecords, createBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { advanceNextRunDate, type RecurringFrequency } from "@/lib/sample-data/billing-recurring";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";

/**
 * Vercel Cron entry point (schedule it in vercel.json, e.g. daily) — for
 * every partner, finds Recurring Invoice templates (moduleSlug
 * "billing-recurring") that are Active and whose nextRunDate has passed,
 * creates a real Billing invoice BusinessRecord from the template's
 * snapshot, and advances the template's nextRunDate.
 */
export async function GET(request: Request) {
  const secret = env.cronSecret();
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const partners = await listPartners();
  let createdCount = 0;
  const centralApiSyncFailures: { partnerId: string; invoiceId: string }[] = [];

  for (const partner of partners) {
    const templates = await listBusinessRecords(partner.id, "billing-recurring");
    for (const template of templates) {
      if (template["status"] !== "Active") continue;
      const nextRunDate = String(template["nextRunDate"] ?? "");
      if (!nextRunDate || nextRunDate > today) continue;

      const record = await createBusinessRecord(partner.id, "billing", {
        customer: template["customer"],
        invoiceType: "GST",
        customerGstin: "",
        issueDate: today,
        dueDate: today,
        lineItemsSummary: template["lineItemsSummary"],
        subtotal: template["subtotal"],
        taxAmount: template["taxAmount"],
        totalAmount: template["totalAmount"],
        paymentStatus: "Draft",
        paymentMode: "Bank Transfer",
        items: template["items"],
      });
      createdCount += 1;

      const items = Array.isArray(record["items"]) ? (record["items"] as Record<string, unknown>[]) : [];
      const syncedToCentralApi = await notifyCentralApiBillingInvoice(partner, {
        externalOrderId: String(record.id),
        customer: String(record["customer"] ?? ""),
        items: items.map((it) => ({
          description: String(it["description"] ?? ""),
          quantity: Number(it["quantity"] ?? 0),
          unitPrice: Number(it["unitPrice"] ?? 0),
          taxRate: Number(it["taxRate"] ?? 0),
        })),
        totalAmount: Number(record["totalAmount"] ?? 0),
      });
      if (!syncedToCentralApi) {
        centralApiSyncFailures.push({ partnerId: partner.id, invoiceId: String(record.id) });
      }

      await updateBusinessRecord(partner.id, "billing-recurring", String(template["id"]), {
        ...template,
        nextRunDate: advanceNextRunDate(nextRunDate, template["frequency"] as RecurringFrequency),
      });
    }
  }

  if (centralApiSyncFailures.length > 0) {
    console.error(
      `[cron/billing-recurring-invoices] ${centralApiSyncFailures.length} of ${createdCount} invoice(s) ` +
        `failed to sync to AN-Accounting after retries — timestamp=${new Date().toISOString()} ` +
        `failures=${JSON.stringify(centralApiSyncFailures)}. Re-push these manually once resolved.`,
    );
  }

  return NextResponse.json({
    ok: true,
    invoicesCreated: createdCount,
    centralApiSyncFailures: centralApiSyncFailures.length,
  });
}
