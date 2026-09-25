import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { getPartner } from "@/lib/partnerData";
import { getBusinessRecord } from "@/lib/businessRecords";
import type { StockTakeLineItem } from "@/lib/sample-data/warehouse";
import { StockTakeDocument } from "@/components/inventory/StockTakeDocument";

registerPage({
  id: "inventory.stock-take.document",
  moduleSlug: "inventory",
  title: "Stock Take — Document",
  path: "/partner/[partnerId]/inventory/stock-take/[recordId]/document",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Printable document for a single Stock Take record — letterhead, warehouse/count meta, every line item (Expected/Counted/Variance/Unit Price/Line Total), and a Reconciled stamp once the OTP-gated Reconcile action has applied it to real Stock. Same print pattern as billing/[recordId]/document (PrintButton + PrintFrame).",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-take/[recordId]/document/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function StockTakeDocumentPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-take", params.recordId);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const lineItems = (record["lineItems"] as StockTakeLineItem[] | undefined) ?? [];

  return (
    <StockTakeDocument
      partnerName={partner?.businessName ?? "Your Business"}
      partnerGstin={partner?.gstin ?? ""}
      partnerPhone={partner?.businessContact ?? ""}
      partnerAddress={partner?.addressLine ?? ""}
      partnerCity={partner?.city ?? ""}
      partnerState={partner?.state ?? ""}
      partnerPincode={partner?.pincode ?? ""}
      recordId={String(record["id"] ?? params.recordId)}
      warehouseName={String(record["warehouseName"] ?? "—")}
      countedDate={String(record["countedDate"] ?? record["recordCreatedAt"] ?? new Date().toISOString())}
      countedBy={record["countedBy"] ? String(record["countedBy"]) : undefined}
      note={record["note"] ? String(record["note"]) : undefined}
      status={String(record["status"] ?? "Pending")}
      lineItems={lineItems}
    />
  );
}
