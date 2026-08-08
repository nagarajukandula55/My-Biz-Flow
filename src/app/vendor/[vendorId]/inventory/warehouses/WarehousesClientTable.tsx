"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { warehouseColumns, warehouseRows } from "@/lib/sample-data/warehouse";

export function WarehousesClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? warehouseColumns}
      rows={warehouseRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/warehouses/${row["id"]}`)}
    />
  );
}
