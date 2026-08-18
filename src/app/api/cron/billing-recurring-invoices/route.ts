import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { env } from "@/lib/env";
import { listVendors } from "@/lib/vendorData";
import { listBusinessRecords, createBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { advanceNextRunDate, type RecurringFrequency } from "@/lib/sample-data/billing-recurring";

/**
 * Vercel Cron entry point (schedule it in vercel.json, e.g. daily) — for
 * every vendor, finds Recurring Invoice templates (moduleSlug
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
  const vendors = await listVendors();
  let createdCount = 0;

  for (const vendor of vendors) {
    const templates = await listBusinessRecords(vendor.id, "billing-recurring");
    for (const template of templates) {
      if (template["status"] !== "Active") continue;
      const nextRunDate = String(template["nextRunDate"] ?? "");
      if (!nextRunDate || nextRunDate > today) continue;

      await createBusinessRecord(vendor.id, "billing", {
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

      await updateBusinessRecord(vendor.id, "billing-recurring", String(template["id"]), {
        ...template,
        nextRunDate: advanceNextRunDate(nextRunDate, template["frequency"] as RecurringFrequency),
      });
    }
  }

  return NextResponse.json({ ok: true, invoicesCreated: createdCount });
}
