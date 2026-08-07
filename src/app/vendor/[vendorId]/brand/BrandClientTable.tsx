"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { brandColumns, brandRows } from "@/lib/sample-data/brand";

export function BrandClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? brandColumns}
      rows={brandRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/brand/${row["id"]}`)}
    />
  );
}
