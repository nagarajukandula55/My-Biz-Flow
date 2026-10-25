import { NextRequest, NextResponse } from "next/server";
import { requireSessionPartnerId, PartnerAuthorizationError } from "@/lib/requirePartnerSession";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const partnerId = new URL(request.url).searchParams.get("partnerId") ?? "";
  try { await requireSessionPartnerId(partnerId); } catch (error) {
    return NextResponse.json({ error: error instanceof PartnerAuthorizationError ? error.message : "Not authorized." }, { status: 401 });
  }
  const rows = await prisma.booking.findMany({ where: { partnerId }, include: { service: true, provider: true, customer: true, company: true }, orderBy: { createdAt: "desc" } });
  const header = ["Booking Number", "Status", "Customer", "Customer Phone", "Service", "Provider", "Company", "Scheduled At", "Price", "Payment Status", "Created At"];
  const body = rows.map((row) => [row.bookingNumber, row.status, row.customer.name, row.customer.phone, row.service.name, row.provider?.name ?? "", row.company?.name ?? "", row.scheduledAt.toISOString(), (row.finalPrice ?? row.priceAmount) / 100, row.paymentStatus, row.createdAt.toISOString()]);
  const csv = [header, ...body].map((line) => line.map(csvCell).join(",")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="field-force-report-${partnerId}.csv"` } });
}
