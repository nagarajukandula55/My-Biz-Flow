"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { realEstateColumns, realEstateRows } from "@/lib/sample-data/real-estate";

export function RealEstateClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? realEstateColumns}
      rows={realEstateRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/real-estate/${row["id"]}`)}
      enableQuickView
    />
  );
}
