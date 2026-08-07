"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row } from "@/components/DataTable";
import { clinicColumns, clinicRows } from "@/lib/sample-data/clinic";

export function ClinicClientTable({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  return (
    <DataTable
      columns={clinicColumns}
      rows={clinicRows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/clinic/${row["id"]}`)}
    />
  );
}
