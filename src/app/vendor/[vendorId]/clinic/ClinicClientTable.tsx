"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { clinicColumns, clinicRows } from "@/lib/sample-data/clinic";

export function ClinicClientTable({ vendorId, columns }: { vendorId: string; columns?: Column[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? clinicColumns}
      rows={clinicRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/clinic/${row["id"]}`)}
    />
  );
}
