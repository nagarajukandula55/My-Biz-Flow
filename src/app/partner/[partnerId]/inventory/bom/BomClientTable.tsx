"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { BOM_DEFAULT_LIST_COLUMN_KEYS, bomColumns } from "@/lib/sample-data/bom";

export function BomClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
        columns={columns ?? bomColumns}
        rows={rows}
        onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/bom/${row["id"]}`)}
        enableQuickView
        defaultVisibleColumnKeys={BOM_DEFAULT_LIST_COLUMN_KEYS}
        columnSelectorStorageKey={`mbf:bom-columns:${partnerId}`}
      />
  );
}
