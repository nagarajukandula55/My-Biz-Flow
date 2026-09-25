import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import type { StockTransferLineItem } from "@/lib/sample-data/warehouse";
import { StockTransferDocument } from "@/components/inventory/StockTransferDocument";

registerPage({
  id: "inventory.stock-transfers.document",
  moduleSlug: "inventory",
  title: "Stock Transfers — Document",
  path: "/partner/[partnerId]/inventory/stock-transfers/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Printable document for a single Stock Transfer record. Handles both record shapes: an own-warehouse multi-line transfer (lineItems[] with unit price, plus a Confirmed stamp once completed) and a legacy partner-to-partner flat record (single-line fallback, no unit price). Same print pattern as billing/[recordId]/document.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-transfers/[recordId]/document/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTransferDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-transfers", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const lineItems = record["lineItems"] as StockTransferLineItem[] | undefined;

  return (
    <StockTransferDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      recordId={String(record["id"] ?? params.recordId)}
      transferDate={String(record["transferDate"] ?? record["recordCreatedAt"] ?? new Date().toISOString())}
      status={String(record["status"] ?? "Pending")}
      fromWarehouseName={record["fromWarehouseName"] ? String(record["fromWarehouseName"]) : undefined}
      toWarehouseName={record["toWarehouseName"] ? String(record["toWarehouseName"]) : undefined}
      toPartnerId={record["toPartnerId"] ? String(record["toPartnerId"]) : undefined}
      reason={record["reason"] ? String(record["reason"]) : undefined}
      lineItems={Array.isArray(lineItems) ? lineItems : undefined}
      flatMaterialId={record["materialId"] ? String(record["materialId"]) : undefined}
      flatQuantity={record["quantity"] !== undefined ? Number(record["quantity"]) : undefined}
    />
  );
}
