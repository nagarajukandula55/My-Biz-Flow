"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { logisticsFleetColumns } from "@/lib/sample-data/logistics-fleet";

export function LogisticsFleetClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? logisticsFleetColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/logistics-fleet/${row["id"]}`)}
      enableQuickView
    />
  );
}
