"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { posColumns } from "@/lib/sample-data/pos";

export function PosClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? posColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/pos/${row["id"]}`)}
      enableQuickView
    />
  );
}
