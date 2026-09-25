import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import { PartOrderDocument } from "@/components/inventory/PartOrderDocument";

registerPage({
  id: "inventory.part-orders.document",
  moduleSlug: "inventory",
  title: "Part Orders — Document",
  path: "/partner/[partnerId]/inventory/part-orders/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Printable document for a single Part Order record — letterhead, source warehouse/destination meta and the single material/quantity/unit-price line with line total. Same print pattern as billing/[recordId]/document.",
  sourceFile: "src/app/partner/[partnerId]/inventory/part-orders/[recordId]/document/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartOrderDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-part-orders", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const serialNumbers = Array.isArray(record["serialNumbers"]) ? (record["serialNumbers"] as string[]) : undefined;

  return (
    <PartOrderDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      recordId={String(record["id"] ?? params.recordId)}
      dispatchedDate={String(record["dispatchedDate"] ?? record["recordCreatedAt"] ?? new Date().toISOString())}
      linkedReturnOrderId={record["linkedReturnOrderId"] ? String(record["linkedReturnOrderId"]) : undefined}
      materialId={String(record["materialId"] ?? "—")}
      quantity={Number(record["quantity"] ?? 0)}
      unitPrice={Number(record["unitPrice"] ?? 0)}
      sourceWarehouseName={record["sourceWarehouseName"] ? String(record["sourceWarehouseName"]) : undefined}
      destinationLocation={record["destinationLocation"] ? String(record["destinationLocation"]) : undefined}
      status={String(record["status"] ?? "Pending")}
      serialNumbers={serialNumbers}
    />
  );
}
