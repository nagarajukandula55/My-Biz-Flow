"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scModelColumns } from "@/lib/sample-data/service-centre-models";

export function ScModelClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scModelColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/models/${row["id"]}`)}
      enableQuickView
    />
  );
}
