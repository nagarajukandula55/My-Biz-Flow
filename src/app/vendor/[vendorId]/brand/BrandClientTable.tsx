"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { brandColumns, brandRows } from "@/lib/sample-data/brand";

export function BrandClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={brandColumns}
      rows={brandRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/brand/${row["id"]}`)}
    />
  );
}
