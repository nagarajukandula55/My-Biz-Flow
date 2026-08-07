"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { inventoryColumns, inventoryRows } from "@/lib/sample-data/inventory";

export function InventoryClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? inventoryColumns}
      rows={inventoryRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/${row["id"]}`)}
    />
  );
}
