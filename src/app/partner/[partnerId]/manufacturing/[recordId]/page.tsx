import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import { getProductionOrder } from "@/lib/manufacturing";
import { ProductionLifecycle } from "./ProductionLifecycle";

registerPage({
  id: "manufacturing.detail",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — Detail",
  path: "/partner/[partnerId]/manufacturing/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single ProductionOrder (real Prisma record), rendered via the shared RecordDetail component (field grid + activity timeline from ProductionStageHistory), with an Edit link. The ProductionLifecycle panel above it carries the real domain logic: a Planned -> In Production -> QC -> Completed status stepper (plus a Delayed side-state), read-only BOM-line display from the linked BillOfMaterial, and stock deduction + finished-good stock creation on Complete Production (same inventoryStock.ts deduction as before).",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ManufacturingDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("manufacturing");
  const order = await getProductionOrder(params.partnerId, params.recordId);
  if (!order) notFound();

  const fields: RecordField[] = [
    { label: "Production Order ID", value: order.id, type: "text" },
    { label: "Product", value: order.productName, type: "text" },
    { label: "Bill of Materials", value: order.bomProductName ?? "—", type: "text" },
    { label: "Work Center", value: order.workCenterName ?? "—", type: "text" },
    { label: "Quantity Planned", value: order.quantityPlanned, type: "text" },
    { label: "Quantity Produced", value: order.quantityProduced, type: "text" },
    { label: "Planned Start Date", value: order.plannedStartDate?.toISOString() ?? null, type: "date" },
    { label: "Planned End Date", value: order.plannedEndDate?.toISOString() ?? null, type: "date" },
    { label: "Actual Completion Date", value: order.actualCompletionDate?.toISOString() ?? null, type: "date" },
    { label: "Status", value: order.status, type: "text" },
  ];

  const timeline: TimelineEntry[] = order.stageHistory.map((h) => ({
    id: h.id,
    label: h.note ? `Status set to ${h.stage} — ${h.note}` : `Status set to ${h.stage}`,
    timestamp: h.enteredAt.toISOString(),
  }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Manufacturing / Production"}>
      <div>
        <ProductionLifecycle
          partnerId={params.partnerId}
          orderId={order.id}
          initialStatus={order.status}
          bomLines={order.bom?.lines ?? []}
          quantityPlanned={order.quantityPlanned}
          hasBom={Boolean(order.bom)}
        />

        <div className="mt-8">
          <RecordDetail
            fields={fields}
            recordLabel={order.id}
            searchParams={searchParams}
            timeline={timeline}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{order.id}</h1>
                  <p className="mt-1 text-xs text-text-muted">Production Order detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/manufacturing`} className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/partner/${params.partnerId}/manufacturing/${params.recordId}/edit`} className="btn-outline">
                    Edit
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
