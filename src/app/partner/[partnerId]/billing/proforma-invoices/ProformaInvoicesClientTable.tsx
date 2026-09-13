"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { proformaInvoiceColumns } from "@/lib/sample-data/billing-sales-documents";

export function ProformaInvoicesClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? proformaInvoiceColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/billing/proforma-invoices/${row["id"]}`)}
      enableQuickView
    />
  );
}
