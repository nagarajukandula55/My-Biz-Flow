"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { rentalsColumns, rentalsRows } from "@/lib/sample-data/rentals";

export function RentalsClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={rentalsColumns}
      rows={rentalsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/rentals/${row["id"]}`)}
    />
  );
}
