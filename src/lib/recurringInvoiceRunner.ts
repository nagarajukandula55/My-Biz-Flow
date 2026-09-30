import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { getNextNumber } from "@/lib/designer/numbering";
import { advanceNextRunDate, RECURRING_FREQUENCIES, type RecurringFrequency } from "@/lib/sample-data/billing-recurring";

/** Locks the template row; invoice, number and schedule commit or roll back together. */
export async function createDueRecurringInvoice(partnerId: string, templateId: string, expectedDate: string, today: string): Promise<boolean> {
  await assertPartnerCanWrite(partnerId);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM business_records WHERE "partnerId" = ${partnerId} AND "moduleSlug" = 'billing-recurring' AND "recordKey" = ${templateId} FOR UPDATE`;
    const row = await tx.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing-recurring", recordKey: templateId } } });
    if (!row) return false;
    const template = row.data as Record<string, Prisma.JsonValue>;
    const nextRunDate = String(template.nextRunDate ?? "");
    if (template.status !== "Active" || nextRunDate !== expectedDate || !nextRunDate || nextRunDate > today) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextRunDate) || !Number.isFinite(Date.parse(nextRunDate)) || new Date(nextRunDate).toISOString().slice(0, 10) !== nextRunDate) throw new Error("Invalid recurring invoice date");
    const frequency = String(template.frequency) as RecurringFrequency;
    if (!RECURRING_FREQUENCIES.includes(frequency)) throw new Error("Invalid recurring invoice frequency");
    const followingDate = advanceNextRunDate(nextRunDate, frequency);
    if (followingDate <= nextRunDate) throw new Error("Recurring invoice date did not advance");
    const recordKey = "REC-" + createHash("sha256").update(JSON.stringify([partnerId, templateId, nextRunDate])).digest("hex");
    const customerGstin = String(template.customerGstin ?? "").trim();
    const invoiceNumber = await getNextNumber(customerGstin ? "invoice.b2b" : "invoice.b2c", partnerId, { prefix: customerGstin ? "INV" : "BILL" }, tx);
    const data = {
      id: recordKey, invoiceNumber, customer: template.customer ?? "", customerGstin,
      invoiceType: "GST", issueDate: today, dueDate: today,
      lineItemsSummary: template.lineItemsSummary ?? "", subtotal: template.subtotal ?? 0,
      taxAmount: template.taxAmount ?? 0, totalAmount: template.totalAmount ?? 0,
      paymentStatus: "Draft", paymentMode: "Bank Transfer", items: template.items ?? [],
      invoiceSource: "Direct", recurringTemplateId: templateId, recurringPeriod: nextRunDate,
    };
    await tx.businessRecord.create({ data: { partnerId, moduleSlug: "billing", recordKey, data } });
    await tx.businessRecord.update({ where: { id: row.id }, data: { data: { ...template, nextRunDate: followingDate } } });
    return true;
  });
}
