"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockAdjustmentColumns } from "@/lib/sample-data/warehouse";

export function StockAdjustmentsClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockAdjustmentColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/stock-adjustments/${row["id"]}`)}
      enableQuickView
    />
  );
}
