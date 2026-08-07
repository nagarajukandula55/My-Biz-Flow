"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { realEstateColumns, realEstateRows } from "@/lib/sample-data/real-estate";

export function RealEstateClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={realEstateColumns}
      rows={realEstateRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/real-estate/${row["id"]}`)}
    />
  );
}
