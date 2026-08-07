"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { logisticsFleetColumns, logisticsFleetRows } from "@/lib/sample-data/logistics-fleet";

export function LogisticsFleetClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={logisticsFleetColumns}
      rows={logisticsFleetRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/logistics-fleet/${row["id"]}`)}
    />
  );
}
