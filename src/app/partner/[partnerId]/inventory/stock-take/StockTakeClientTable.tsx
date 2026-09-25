"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockTakeColumns } from "@/lib/sample-data/warehouse";

export function StockTakeClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockTakeColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/stock-take/${row["id"]}`)}
      enableQuickView
    />
  );
}
