"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { partOrderColumns, partOrderRows } from "@/lib/sample-data/warehouse";

export function PartOrdersClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? partOrderColumns}
      rows={partOrderRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/part-orders/${row["id"]}`)}
    />
  );
}
