"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { accountingGstColumns, accountingGstRows } from "@/lib/sample-data/accounting-gst";

export function AccountingGstClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? accountingGstColumns}
      rows={accountingGstRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/accounting-gst/${row["id"]}`)}
      enableQuickView
    />
  );
}
