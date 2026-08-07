"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { posColumns, posRows } from "@/lib/sample-data/pos";

export function PosClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? posColumns}
      rows={posRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/pos/${row["id"]}`)}
    />
  );
}
