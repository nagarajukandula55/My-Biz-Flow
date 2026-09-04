"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { bomColumns } from "@/lib/sample-data/bom";

export function BomClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? bomColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/bom/${row["id"]}`)}
      enableQuickView
    />
  );
}
