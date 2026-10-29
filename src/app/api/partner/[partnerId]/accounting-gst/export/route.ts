import { NextResponse } from "next/server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { currentPeriodKey, periodKeyOf, computeOutwardSupply, periodLabel } from "@/lib/gst";
import { computeEligibleItcForPeriod } from "@/lib/sample-data/accounting-gst-itc";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { partnerId: string } }) {
  const partnerId = await requireSessionPartnerId(params.partnerId);
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || currentPeriodKey();
  if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ error: "Invalid GST period." }, { status: 400 });
  const [invoices, itcEntries, partner] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "accounting-gst-itc"),
    getPartner(partnerId),
  ]);
  const periodInvoices = invoices.filter((invoice) => periodKeyOf(String(invoice["issueDate"] ?? "")) === period);
  const outward = computeOutwardSupply(periodInvoices);
  const body = {
    artifact: "gst-working-paper",
    filingStatus: "Not filed — export requires review and submission through an authorized channel",
    partnerId,
    businessName: partner?.businessName ?? "",
    gstin: partner?.gstin ?? "",
    period,
    periodLabel: periodLabel(period),
    generatedAt: new Date().toISOString(),
    sourceCounts: { billingInvoices: periodInvoices.length, itcEntries: itcEntries.length },
    outwardSupply: outward,
    eligibleItc: computeEligibleItcForPeriod(itcEntries, period),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="gst-working-paper-${period}.json"` },
  });
}
