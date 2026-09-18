"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { stockTransferColumns } from "@/lib/sample-data/warehouse";

export function StockTransfersClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? stockTransferColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/stock-transfers/${row["id"]}`)}
      enableQuickView
    />
  );
}
