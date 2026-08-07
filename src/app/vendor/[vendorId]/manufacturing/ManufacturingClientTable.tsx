"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { manufacturingColumns, manufacturingRows } from "@/lib/sample-data/manufacturing";

export function ManufacturingClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? manufacturingColumns}
      rows={manufacturingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/manufacturing/${row["id"]}`)}
    />
  );
}
