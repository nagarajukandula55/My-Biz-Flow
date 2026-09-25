import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import { ReturnOrderDocument } from "@/components/inventory/ReturnOrderDocument";

registerPage({
  id: "inventory.return-orders.document",
  moduleSlug: "inventory",
  title: "Return Orders — Document",
  path: "/partner/[partnerId]/inventory/return-orders/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Printable document for a single Return Order record — letterhead, direction/source/destination (or vendor + challan for Outbound) meta and the single material/quantity/unit-price line with line total. Same print pattern as billing/[recordId]/document.",
  sourceFile: "src/app/partner/[partnerId]/inventory/return-orders/[recordId]/document/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReturnOrderDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-return-orders", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);

  return (
    <ReturnOrderDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      recordId={String(record["id"] ?? params.recordId)}
      createdDate={String(record["createdDate"] ?? record["recordCreatedAt"] ?? new Date().toISOString())}
      direction={String(record["direction"] ?? "Inbound")}
      returnType={record["returnType"] ? String(record["returnType"]) : undefined}
      materialId={String(record["materialId"] ?? "—")}
      quantity={Number(record["quantity"] ?? 0)}
      unitPrice={Number(record["unitPrice"] ?? 0)}
      sourceLocation={record["sourceLocation"] ? String(record["sourceLocation"]) : undefined}
      destinationWarehouseName={record["destinationWarehouseName"] ? String(record["destinationWarehouseName"]) : undefined}
      vendorName={record["vendorName"] ? String(record["vendorName"]) : undefined}
      challanNumber={record["challanNumber"] ? String(record["challanNumber"]) : undefined}
      status={String(record["status"] ?? "Pending")}
    />
  );
}
