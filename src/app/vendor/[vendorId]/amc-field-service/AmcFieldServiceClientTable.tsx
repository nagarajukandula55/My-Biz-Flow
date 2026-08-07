"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { amcFieldServiceColumns, amcFieldServiceRows } from "@/lib/sample-data/amc-field-service";

export function AmcFieldServiceClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={amcFieldServiceColumns}
      rows={amcFieldServiceRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/amc-field-service/${row["id"]}`)}
    />
  );
}
