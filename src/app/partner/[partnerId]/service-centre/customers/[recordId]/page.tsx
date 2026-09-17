import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getCustomerDetailFields,
  getCustomerTimeline,
  customersRelated,
  customersColumns,
} from "@/lib/sample-data/service-centre-customers";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { isCustomerDataUnlocked } from "@/lib/customerDataAccess";
import { CustomerDataOtpGate } from "../CustomerDataOtpGate";

registerPage({
  id: "service-centre.customers.detail",
  moduleSlug: "service-centre",
  title: "Customers — Detail",
  path: "/partner/[partnerId]/service-centre/customers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single customer.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/customers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScCustomerDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const unlocked = await isCustomerDataUnlocked(params.partnerId);
  if (!unlocked) {
    return (
      <AppShell topbarTitle="Customers">
        <CustomerDataOtpGate partnerId={params.partnerId} />
      </AppShell>
    );
  }

  const record = await getBusinessRecord(params.partnerId, "service-centre-customers", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields(
    "service-centre.customers.detail",
    getCustomerDetailFields(record),
    customersColumns
  );
  const timeline = getCustomerTimeline(record);
  const recordLabel = String(record["name"] ?? params.recordId);

  return (
    <AppShell topbarTitle="Customers">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={customersRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Customer detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre/customers`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/customers/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
