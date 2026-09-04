"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { brandColumns } from "@/lib/sample-data/brand";

export function BrandClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? brandColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/brand/${row["id"]}`)}
      enableQuickView
    />
  );
}
