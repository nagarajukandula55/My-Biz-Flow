"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { warehouseColumns } from "@/lib/sample-data/warehouse";

export function WarehousesClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? warehouseColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/warehouses/${row["id"]}`)}
      enableQuickView
    />
  );
}
