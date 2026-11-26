import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getRestaurantPosDetailFields, restaurantPosRelated, restaurantPosColumns, extractOrderFromRecord } from "@/lib/sample-data/restaurant-pos";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getOrderRow } from "@/lib/restaurantPos/data";

registerPage({
  id: "restaurant-pos.detail",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Detail",
  path: "/partner/[partnerId]/restaurant-pos/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single persistent table order and its kitchen and billing status.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantPosDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("restaurant-pos");
  const record = await getOrderRow(params.partnerId, params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("restaurant-pos.detail", getRestaurantPosDetailFields(record), restaurantPosColumns);
  const recordLabel = String(record["id"] ?? params.recordId);
  const order = record["lines"] ? extractOrderFromRecord(record) : null;

  return (
    <AppShell topbarTitle={mod?.label ?? "Restaurant POS"}>
      <div>
        {order && (
          <div className="mb-8 rounded-md border border-border bg-bg-raised p-4">
            <h2 className="font-display text-base font-bold text-text">Order Lines — {order.tableNumber}</h2>
            <div className="mt-3 space-y-2">
              {order.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm">
                  <span className="text-text">
                    {line.name} × {line.qty}
                    {line.kotSent ? " · sent to kitchen" : ""}
                  </span>
                  <span className="tabular-nums text-text-muted">₹{line.qty * line.unitPrice}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Tax</span>
                <span className="tabular-nums">₹{order.taxAmount}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-text">
                <span>Total</span>
                <span className="tabular-nums">₹{order.totalAmount}</span>
              </div>
              {order.invoiceIds && order.invoiceIds.length > 0 && (
                <div className="text-xs text-text-muted">Invoice(s): {order.invoiceIds.join(", ")}</div>
              )}
              {order.cancelReason && <div className="text-xs text-danger">Cancelled — {order.cancelReason}</div>}
            </div>
          </div>
        )}

        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          related={restaurantPosRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Order detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/restaurant-pos/tables`} className="btn-outline">
                  &larr; Table floor
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
