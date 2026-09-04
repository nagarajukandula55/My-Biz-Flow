"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { accountingGstColumns } from "@/lib/sample-data/accounting-gst";

export function AccountingGstClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? accountingGstColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/accounting-gst/${row["id"]}`)}
      enableQuickView
    />
  );
}
