"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { brandColumns } from "@/lib/sample-data/brand";

export function BrandClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? brandColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/brand/${row["id"]}`)}
      enableQuickView
    />
  );
}
