"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { rentalsColumns, rentalsRows } from "@/lib/sample-data/rentals";

export function RentalsClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? rentalsColumns}
      rows={rentalsRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/rentals/${row["id"]}`)}
    />
  );
}
