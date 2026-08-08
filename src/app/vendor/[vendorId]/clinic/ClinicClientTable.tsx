"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { clinicColumns } from "@/lib/sample-data/clinic";

export function ClinicClientTable({ vendorId, columns, rows }: { vendorId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? clinicColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/vendor/${vendorId}/clinic/${row["id"]}`)}
      enableQuickView
    />
  );
}
