"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { gstItcColumns } from "@/lib/sample-data/accounting-gst-itc";

export function GstItcClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? gstItcColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/accounting-gst/itc/${row["id"]}`)}
      enableQuickView
    />
  );
}
