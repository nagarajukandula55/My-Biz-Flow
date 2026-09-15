"use client";

import { useRouter } from "next/navigation";
import { Printer, ClipboardCheck, Receipt } from "lucide-react";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { PrintPopupLink } from "@/components/PrintPopupLink";
import { serviceCentreListColumns, isUnderWarranty } from "@/lib/sample-data/service-centre";

const ACTION_ICON_CLASS =
  "rounded border border-border p-1.5 text-text-muted hover:bg-bg-sunken hover:text-text";

/**
 * Print/document actions per row — Print Workorder and Intake Receipt
 * always (both exist from intake); Service Record only once the job is
 * Closed; Invoice only once the job is BOTH chargeable
 * (out-of-warranty-or-90-days — reusing isUnderWarranty(), the same
 * single source of truth the detail page's warranty badge and chargeable-
 * amount calc use) AND Closed with an invoice actually created
 * (createInvoiceFromWorkorderAction stamps `invoiceId` on the record), so
 * this never links to an invoice document that doesn't exist yet.
 *
 * Built here (a Client Component) rather than in page.tsx (a Server
 * Component) because Column.render is a function and functions can't cross
 * the Server->Client prop boundary — TAT and every other column above it
 * are plain serializable data, so they're computed server-side instead.
 */
function renderWorkorderActions(partnerId: string, row: Row) {
  const stage = row["stage"] as string | undefined;
  const closed = stage === "Closed";
  const chargeable = !isUnderWarranty(row);
  const invoiceId = row["invoiceId"] as string | undefined;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={stop}>
      <PrintPopupLink
        href={`/partner/${partnerId}/service-centre/${row["id"]}/document`}
        className={ACTION_ICON_CLASS}
        title="Print Workorder"
      >
        <Printer className="h-4 w-4" strokeWidth={2} />
      </PrintPopupLink>
      {closed && (
        <PrintPopupLink
          href={`/partner/${partnerId}/service-centre/${row["id"]}/service-record`}
          className={ACTION_ICON_CLASS}
          title="Service Record"
        >
          <ClipboardCheck className="h-4 w-4" strokeWidth={2} />
        </PrintPopupLink>
      )}
      {closed && chargeable && invoiceId && (
        <PrintPopupLink
          href={`/partner/${partnerId}/service-centre/${row["id"]}/invoice`}
          className={ACTION_ICON_CLASS}
          title="Invoice"
        >
          <Receipt className="h-4 w-4" strokeWidth={2} />
        </PrintPopupLink>
      )}
    </div>
  );
}

export function ServiceCentreClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  const baseColumns = columns ?? serviceCentreListColumns;
  const columnsWithActions: Column[] = [
    ...baseColumns,
    {
      key: "__actions",
      label: "Actions",
      type: "actions",
      render: (row: Row) => renderWorkorderActions(partnerId, row),
    },
  ];
  return (
    <DataTable
      columns={columnsWithActions}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/service-centre/${row["id"]}`)}
      enableQuickView
    />
  );
}
