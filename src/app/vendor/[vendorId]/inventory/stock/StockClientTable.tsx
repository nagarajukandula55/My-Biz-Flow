"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockColumns, stockRows } from "@/lib/sample-data/warehouse";

export function StockClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockColumns}
      rows={stockRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/stock/${row["id"]}`)}
      enableQuickView
    />
  );
}
