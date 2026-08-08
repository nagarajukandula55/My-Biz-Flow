"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { rentalsColumns } from "@/lib/sample-data/rentals";

export function RentalsClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? rentalsColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/rentals/${row["id"]}`)}
      enableQuickView
    />
  );
}
