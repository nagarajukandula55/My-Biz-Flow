"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { manufacturingColumns } from "@/lib/sample-data/manufacturing";

export function ManufacturingClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? manufacturingColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/manufacturing/${row["id"]}`)}
      enableQuickView
    />
  );
}
