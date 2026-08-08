"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { returnOrderColumns } from "@/lib/sample-data/warehouse";

export function ReturnOrdersClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? returnOrderColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/return-orders/${row["id"]}`)}
      enableQuickView
    />
  );
}
