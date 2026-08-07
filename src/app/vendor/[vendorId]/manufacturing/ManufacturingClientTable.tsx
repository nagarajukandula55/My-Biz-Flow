"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { manufacturingColumns, manufacturingRows } from "@/lib/sample-data/manufacturing";

export function ManufacturingClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={manufacturingColumns}
      rows={manufacturingRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/manufacturing/${row["id"]}`)}
    />
  );
}
