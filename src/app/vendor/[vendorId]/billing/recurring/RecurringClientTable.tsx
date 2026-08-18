"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { recurringInvoiceColumns } from "@/lib/sample-data/billing-recurring";

export function RecurringClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? recurringInvoiceColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/billing/recurring/${row["id"]}`)}
      enableQuickView
    />
  );
}
