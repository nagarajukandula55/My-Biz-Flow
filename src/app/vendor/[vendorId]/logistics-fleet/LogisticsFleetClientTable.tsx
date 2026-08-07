"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { logisticsFleetColumns, logisticsFleetRows } from "@/lib/sample-data/logistics-fleet";

export function LogisticsFleetClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? logisticsFleetColumns}
      rows={logisticsFleetRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/logistics-fleet/${row["id"]}`)}
    />
  );
}
