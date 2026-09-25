import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import { StockAdjustmentDocument } from "@/components/inventory/StockAdjustmentDocument";

registerPage({
  id: "inventory.stock-adjustments.document",
  moduleSlug: "inventory",
  title: "Stock Adjustments — Document",
  path: "/partner/[partnerId]/inventory/stock-adjustments/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Printable document for a single Stock Adjustment record — letterhead, warehouse/reason meta and the single material/quantity/unit-price line with line total. Same print pattern as billing/[recordId]/document.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-adjustments/[recordId]/document/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockAdjustmentDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-adjustments", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const serialNumbers = Array.isArray(record["serialNumbers"]) ? (record["serialNumbers"] as string[]) : undefined;

  return (
    <StockAdjustmentDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      recordId={String(record["id"] ?? params.recordId)}
      date={String(record["date"] ?? record["recordCreatedAt"] ?? new Date().toISOString())}
      warehouseName={String(record["warehouseName"] ?? "—")}
      materialId={String(record["materialId"] ?? "—")}
      adjustmentType={String(record["adjustmentType"] ?? "—")}
      quantity={Number(record["quantity"] ?? 0)}
      unitPrice={Number(record["unitPrice"] ?? 0)}
      reason={record["reason"] ? String(record["reason"]) : undefined}
      adjustedBy={record["adjustedBy"] ? String(record["adjustedBy"]) : undefined}
      serialNumbers={serialNumbers}
    />
  );
}
