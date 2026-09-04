"use client";

import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { clinicColumns } from "@/lib/sample-data/clinic";

export function ClinicClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns ?? clinicColumns}
      rows={rows}
      onRowClick={(row: Row) => router.push(`/partner/${partnerId}/clinic/${row["id"]}`)}
      enableQuickView
    />
  );
}
