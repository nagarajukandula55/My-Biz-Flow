"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { posColumns } from "@/lib/sample-data/pos";

export function PosClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? posColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/pos/${row["id"]}`)}
      enableQuickView
    />
  );
}
