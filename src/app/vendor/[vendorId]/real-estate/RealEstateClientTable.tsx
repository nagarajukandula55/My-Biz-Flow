"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { realEstateColumns } from "@/lib/sample-data/real-estate";

export function RealEstateClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? realEstateColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/real-estate/${row["id"]}`)}
      enableQuickView
    />
  );
}
