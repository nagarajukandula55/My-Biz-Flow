"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { amcFieldServiceColumns, amcFieldServiceRows } from "@/lib/sample-data/amc-field-service";

export function AmcFieldServiceClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? amcFieldServiceColumns}
      rows={amcFieldServiceRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/amc-field-service/${row["id"]}`)}
      enableQuickView
    />
  );
}
