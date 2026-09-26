"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { locationColumns } from "@/lib/sample-data/brand";

export function LocationsClientTable({
  partnerId,
  brandId,
  columns,
  rows,
}: {
  partnerId: string;
  brandId: string;
  columns?: Column[];
  rows: Row[];
}) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? locationColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/brand/${brandId}/locations/${row["id"]}`)}
      enableQuickView
    />
  );
}
