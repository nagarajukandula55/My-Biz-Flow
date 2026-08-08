"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { bomColumns, bomRows } from "@/lib/sample-data/bom";

export function BomClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? bomColumns}
      rows={bomRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/bom/${row["id"]}`)}
    />
  );
}
