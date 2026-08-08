"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { returnOrderColumns, returnOrderRows } from "@/lib/sample-data/warehouse";

export function ReturnOrdersClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? returnOrderColumns}
      rows={returnOrderRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/return-orders/${row["id"]}`)}
      enableQuickView
    />
  );
}
