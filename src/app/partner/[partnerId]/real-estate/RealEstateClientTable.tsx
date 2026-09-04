"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { realEstateColumns } from "@/lib/sample-data/real-estate";

export function RealEstateClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? realEstateColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/real-estate/${row["id"]}`)}
      enableQuickView
    />
  );
}
