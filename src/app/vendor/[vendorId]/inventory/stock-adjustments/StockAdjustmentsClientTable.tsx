"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockAdjustmentColumns, stockAdjustmentRows } from "@/lib/sample-data/warehouse";

export function StockAdjustmentsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockAdjustmentColumns}
      rows={stockAdjustmentRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/stock-adjustments/${row["id"]}`)}
      enableQuickView
    />
  );
}
