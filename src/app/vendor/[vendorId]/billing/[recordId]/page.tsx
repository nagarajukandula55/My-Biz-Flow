import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getBillingDetailFields, getBillingTimeline, billingRelated, billingColumns } from "@/lib/sample-data/billing";
import { getInvoiceBalance } from "@/lib/sample-data/billing-payments";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { formatCurrencyINR } from "@/lib/format";

export const dynamic = "force-dynamic";

registerPage({
  id: "billing.detail",
  moduleSlug: "billing",
  title: "Billing — Detail",
  path: "/vendor/[vendorId]/billing/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single invoice, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. Real data — Prisma-backed (BusinessRecord table).",
  sourceFile: "src/app/vendor/[vendorId]/billing/[recordId]/page.tsx",
});

export default async function BillingDetailPage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const mod = await getModule("billing");
  const record = await getBusinessRecord(params.vendorId, "billing", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("billing.detail", getBillingDetailFields(record), billingColumns);
  const timeline = getBillingTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const payments = await listBusinessRecords(params.vendorId, "billing-payments");
  const { paid, balance, payments: linkedPayments } = getInvoiceBalance(
    payments,
    recordLabel,
    Number(record["totalAmount"] ?? 0)
  );

  return (
    <AppShell topbarTitle={mod?.label ?? "Billing"}>
      <div>

        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={billingRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Invoice detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/vendor/${params.vendorId}/billing`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/billing/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/vendor/${params.vendorId}/billing/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  vendorId={params.vendorId}
                  moduleSlug="billing"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />

        <div className="mt-6 rounded-lg border border-border bg-bg-raised p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Paid</div>
                <div className="mt-0.5 font-mono text-base font-bold text-success">{formatCurrencyINR(paid)}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Balance Due</div>
                <div className="mt-0.5 font-mono text-base font-bold text-text">{formatCurrencyINR(balance)}</div>
              </div>
            </div>
            <Link href={`/vendor/${params.vendorId}/billing/payments/new`} className="btn-outline px-3 py-1.5 text-xs">
              + Record Payment
            </Link>
          </div>
          {linkedPayments.length > 0 && (
            <div className="mt-4 divide-y divide-border border-t border-border">
              {linkedPayments.map((p) => (
                <div key={String(p["id"])} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/vendor/${params.vendorId}/billing/payments/${p["id"]}`} className="text-accent hover:underline">
                    {String(p["id"])}
                  </Link>
                  <span className="text-text-muted">{String(p["date"] ?? "")}</span>
                  <span className="text-text-muted">{String(p["mode"] ?? "")}</span>
                  <span className="font-mono font-semibold text-text">{formatCurrencyINR(Number(p["amount"]) || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
