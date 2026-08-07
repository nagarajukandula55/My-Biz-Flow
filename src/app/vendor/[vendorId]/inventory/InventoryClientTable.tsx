"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { inventoryColumns, inventoryRows } from "@/lib/sample-data/inventory";

export function InventoryClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={inventoryColumns}
      rows={inventoryRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/${row["id"]}`)}
    />
  );
}
