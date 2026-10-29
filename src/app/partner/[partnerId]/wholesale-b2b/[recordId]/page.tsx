import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getWholesaleB2bDetailFields, wholesaleB2bRelated } from "@/lib/sample-data/wholesale-b2b";
import { WholesaleOrderActions } from "./WholesaleOrderActions";
import { customerOutstandingBalance, getWholesaleOrder, orderToRow, paiseToRupees } from "@/lib/wholesaleData";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "wholesale-b2b.detail",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Detail",
  path: "/partner/[partnerId]/wholesale-b2b/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single WholesaleOrder, rendered via the shared RecordDetail component (field grid), plus a Line Items & Pricing panel showing the base vs. tier-discounted price per line, the customer's live outstanding balance against their credit limit, and status-advance/cancel actions enforcing the fixed order lifecycle.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function WholesaleB2bDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("wholesale-b2b");
  const order = await getWholesaleOrder(params.partnerId, params.recordId);
  if (!order) notFound();

  const row = orderToRow(order);
  const fields = getWholesaleB2bDetailFields(row);
  const recordLabel = order.orderNumber;

  const outstandingExcludingThis = await customerOutstandingBalance(params.partnerId, order.customerId, order.id);
  const outstandingIncludingThis =
    order.status !== "Delivered" && order.status !== "Cancelled"
      ? outstandingExcludingThis + order.totalAmount
      : outstandingExcludingThis;

  const customer = await (await import("@/lib/prisma")).prisma.wholesaleCustomer.findUnique({ where: { id: order.customerId } });
  const dispatch = (await listBusinessRecords(params.partnerId, "wholesale-dispatch")).find((row) => String(row.orderId ?? "") === order.id) ?? null;
  const fulfillment = (await listBusinessRecords(params.partnerId, "wholesale-fulfillment")).find((row) => String(row.orderId ?? "") === order.id) ?? null;

  return (
    <AppShell topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}>
      <div>
        <WholesaleOrderActions
          partnerId={params.partnerId}
          orderId={order.id}
          status={order.status}
          priceTierName={order.priceTierName}
          discountPercent={order.discountPercent}
          totalAmount={paiseToRupees(order.totalAmount)}
          creditLimit={paiseToRupees(customer?.creditLimit ?? 0)}
          outstandingBalance={paiseToRupees(outstandingIncludingThis)}
          lines={order.lines.map((l) => ({ ...l, unitPrice: paiseToRupees(l.unitPrice) }))}
          dispatch={dispatch ? { carrier: String(dispatch.carrier ?? ""), trackingNumber: String(dispatch.trackingNumber ?? ""), dispatchedAt: String(dispatch.dispatchedAt ?? ""), notes: String(dispatch.notes ?? "") } : null}
        />

        <div className="mt-8">
          <section className="mb-5 rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Warehouse fulfilment</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="font-medium text-text">{String(fulfillment?.stage ?? "Awaiting pick")}</span>
              {fulfillment?.recordedAt ? <span className="text-sm text-text-muted">Recorded {String(fulfillment.recordedAt)}</span> : null}
              {!fulfillment && <span className="text-sm text-text-muted">This confirmed order has not been picked yet.</span>}
            </div>
          </section>
          <RecordDetail
            fields={fields}
            recordLabel={recordLabel}
            searchParams={searchParams}
            related={wholesaleB2bRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Order detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`/api/partner/${params.partnerId}/wholesale-b2b/${params.recordId}/edi`} className="btn-outline">Export handoff JSON</a>
                  <Link href={`/partner/${params.partnerId}/wholesale-b2b`} className="btn-outline">
                    &larr; Back
                  </Link>
                </div>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
