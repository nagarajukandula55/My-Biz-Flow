"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { bomColumns } from "@/lib/sample-data/bom";

export function BomClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? bomColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/inventory/bom/${row["id"]}`)}
      enableQuickView
    />
  );
}
