"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockColumns } from "@/lib/sample-data/warehouse";

export function StockClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/stock/${row["id"]}`)}
      enableQuickView
    />
  );
}
