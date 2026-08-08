"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { scModelColumns, scModelRows } from "@/lib/sample-data/service-centre-models";

export function ScModelClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? scModelColumns}
      rows={scModelRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/service-centre/models/${row["id"]}`)}
      enableQuickView
    />
  );
}
