"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";

export function AmcFieldServiceClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? amcFieldServiceColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/amc-field-service/${row["id"]}`)}
      enableQuickView
    />
  );
}
