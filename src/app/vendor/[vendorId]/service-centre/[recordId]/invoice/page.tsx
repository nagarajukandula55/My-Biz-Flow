import { DocumentView } from "@/components/DocumentView";
import type { Column } from "@/components/DataTable";
import {
  serviceCentreRows,
  getServiceCentreRecord,
  getWorkorderInvoiceLineItems,
} from "@/lib/sample-data/service-centre";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "service-centre.invoice",
  moduleSlug: "service-centre",
  title: "Sales Invoice — Document",
  path: "/vendor/[vendorId]/service-centre/[recordId]/invoice",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [{ key: "document-template", label: "Sales Invoice HTML template (placeholders)" }],
  explanation:
    "Renders a closed Service Centre workorder's Parts & Service Lines as a billable Sales Invoice — A4/A5 print only (no thermal), unlike POS receipts. Line items are derived from the workorder's parts/service lines.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/[recordId]/invoice/page.tsx",
});

const invoiceColumns: Column[] = [
  { key: "id", label: "Job ID", type: "text" },
  { key: "customer", label: "Customer", type: "relation-link" },
  { key: "device", label: "Device / Vehicle", type: "text" },
  { key: "subtotal", label: "Subtotal", type: "currency" },
  { key: "taxAmount", label: "Tax", type: "currency" },
  { key: "totalAmount", label: "Total", type: "currency" },
];

export default function ServiceCentreInvoicePage({
  params,
}: {
  params: { vendorId: string; recordId: string };
}) {
  const record = getServiceCentreRecord(params.recordId);
  const sequenceIndex = serviceCentreRows.findIndex((r) => String(r["id"]) === params.recordId);
  const lineItems = getWorkorderInvoiceLineItems(params.recordId);
  const subtotal = lineItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxAmount = lineItems.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.taxRate / 100), 0);
  const invoiceRecord = { ...record, subtotal, taxAmount, totalAmount: subtotal + taxAmount };

  return (
    <DocumentView
      pageId="service-centre.invoice"
      documentType="service-centre.invoice"
      documentLabel="Sales Invoice"
      vendorName="Chennai Auto Service"
      vendorId={params.vendorId}
      record={invoiceRecord}
      columns={invoiceColumns}
      sequenceIndex={sequenceIndex >= 0 ? sequenceIndex : 0}
      lineItems={lineItems}
      printSizes={["a4", "a5"]}
    />
  );
}
